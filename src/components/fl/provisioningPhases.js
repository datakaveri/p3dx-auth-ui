// Groups the flat provisioning event log into a few phases with substeps, so
// the panel can show a short checklist instead of one line per emitted event.
// A trailing "?" in a catalogue entry marks an optional substep.

const SHARED_HEAD = [
  { key: "azure", label: "Azure sign-in", steps: ["Starting", "Contract?", "Azure device login", "Azure account?"] },
  {
    key: "vm",
    label: "VM setup",
    steps: ["SSH key", "Preparing Terraform config", "Terraform init", "Creating VM", "VM setup", "Broker config?"],
  },
];

function catalogue(role) {
  const isUser = role === "user";
  const tail = isUser
    ? [{ key: "gateway", label: "Securing gateway", steps: ["Securing gateway"] }]
    : [{ key: "connect", label: "Connecting to the session", steps: ["Waiting for server VM", "Connecting to the session"] }];
  const fl = {
    key: "fl",
    label: "FL session",
    steps: ["Waiting for clients", "Starting FL session", "FL session", "Training round?"],
  };
  const phases = [...SHARED_HEAD, ...tail, fl];
  if (isUser) phases.push({ key: "output", label: "Output", steps: ["Collecting output"] });
  else fl.steps.push("Collecting output?");
  return phases;
}

// Steps that always report their own end (ok/done/error): unlike the rest,
// they are still running while later substeps (the per-round "Training
// round" progress) come in.
const SELF_ENDING_STEPS = new Set(["FL session"]);

// Round N of M from a "Training round" event (numeric fields, else the message).
function roundProgress(e) {
  let round = Number(e.round);
  let max = Number(e.max_rounds);
  if (!(round >= 0) || !(max > 0) || e.round == null || e.max_rounds == null) {
    const m = String(e.message || "").match(/round\s+(\d+)\s+of\s+(\d+)/i);
    if (!m) return null;
    round = Number(m[1]);
    max = Number(m[2]);
  }
  return max > 0 ? { round, max } : null;
}

export function groupProvisioningEvents(events = [], role) {
  const phases = catalogue(role).map((p) => ({
    key: p.key,
    label: p.label,
    messages: [],
    active: false,
    subs: p.steps.map((s) => ({
      step: s.replace(/\?$/, ""),
      optional: s.endsWith("?"),
      seen: false,
      raw: null, // status of the last event
      message: "",
      command: "",
    })),
  }));

  const locate = (step) => {
    for (const p of phases) {
      const sub = p.subs.find((s) => s.step === step);
      if (sub) return { p, sub };
    }
    return null;
  };

  // Highest-numbered phase with any event so far; where failures/unknown steps land.
  let latest = 0;
  // The substep of the latest event, so a run-level failure ("Provisioning
  // failed") is pinned on the step that was in progress when it happened
  // instead of becoming a separate row.
  let lastSub = null;

  for (const e of events) {
    let hit = locate(e.step);
    if (!hit && e.status === "error" && lastSub && lastSub.raw !== "ok" && lastSub.raw !== "done" && lastSub.raw !== "error") {
      lastSub.raw = "error";
      lastSub.error = e.message || "";
      const p = phases.find((ph) => ph.subs.includes(lastSub));
      p.failed = true;
      continue;
    }
    if (!hit) {
      // Failure or unknown step: attach to the phase active when it occurred.
      const p = phases[latest];
      const sub = { step: e.step, optional: true, seen: false, raw: null, message: "", command: "" };
      p.subs.push(sub);
      hit = { p, sub };
    }
    const { p, sub } = hit;
    sub.seen = true;
    sub.raw = e.status;
    if (e.status === "error") {
      sub.error = e.message || "";
      p.failed = true;
    } else {
      sub.error = null;
      if (e.message) sub.message = e.message;
      if (e.message) p.messages.push(e.message);
    }
    if (e.command) sub.command = e.command;
    if (e.step === "Training round") {
      const prog = roundProgress(e);
      if (prog) p.progress = prog;
    }
    p.active = true;
    latest = Math.max(latest, phases.indexOf(p));
    lastSub = sub;
  }

  const lastActive = phases.reduce((acc, p, i) => (p.active ? i : acc), -1);

  // The run stopped on an error that nothing succeeded after: no step of it
  // is still in progress, so nothing may keep spinning.
  const lastEvent = events[events.length - 1];
  const stopped = lastEvent?.status === "error";

  return phases.map((p, pi) => {
    const laterPhaseStarted = lastActive > pi;
    // Once a self-ending step (the FL session) has ended, nothing in its phase is still running.
    const phaseEnded = p.subs.some((o) => SELF_ENDING_STEPS.has(o.step) && (o.raw === "ok" || o.raw === "done"));
    // A step that only ever emits "running" is finished once something after it began.
    const substeps = p.subs.map((s, si) => {
      let status = "pending";
      if (s.seen) {
        if (s.raw === "error") status = "error";
        else if (s.raw === "ok" || s.raw === "done") status = "complete";
        else {
          const laterSub = !SELF_ENDING_STEPS.has(s.step) && p.subs.some((o, oi) => oi > si && o.seen && o.raw !== "error");
          status = laterSub || laterPhaseStarted || phaseEnded ? "complete" : stopped ? "stopped" : "running";
        }
      }
      return {
        step: s.step,
        status,
        message: s.message,
        command: s.command,
        optional: s.optional,
        error: status === "error" ? s.error || "" : null,
      };
    });

    const visible = substeps.filter((s) => !s.optional || p.subs.find((o) => o.step === s.step).seen);
    const failedStep = visible.find((s) => s.status === "error");
    const requiredDone = visible.filter((s) => !s.optional).every((s) => s.status === "complete");
    let status = "pending";
    if (failedStep) status = "error";
    else if (visible.some((s) => s.status === "running")) status = "running";
    else if (p.active && (requiredDone || laterPhaseStarted)) status = "complete";
    else if (visible.some((s) => s.status !== "pending")) status = stopped ? "stopped" : "running";

    return {
      key: p.key,
      label: p.label,
      status,
      progress: p.progress || null,
      summary: failedStep
        ? friendlyFailure(failedStep.error, failedStep.step)
        : p.progress
        ? `Round ${p.progress.round} of ${p.progress.max}`
        : p.messages.length
        ? p.messages[p.messages.length - 1]
        : "",
      substeps: visible,
    };
  });
}

// A short, plain-language reading of a raw failure (Terraform / SSH / Azure
// output) for a non-technical audience; the raw text stays available behind
// "Show details".
const FAILURE_HINTS = [
  [/orchestrator restarted/i, "The run was interrupted because the platform restarted. Please try again."],
  [/timed out|timeout|no route to host|connection refused|network is unreachable|could not resolve|port 22/i,
    "We couldn't reach the VM. It may be switched off or not reachable from the platform."],
  [/permission denied|publickey|host key verification/i, "The VM did not accept the platform's sign-in key."],
  [/quota|skunotavailable|capacity|allocationfailed/i, "Azure has no capacity left for this VM size right now."],
  [/authorizationfailed|az login|device code|credential|subscription/i, "Signing in to Azure, or its permissions, did not work."],
  [/server vm .*not ready/i, "The session's server VM never came up, so this VM could not join it."],
  [/providers? connected|gave up/i, "Not every data provider joined the session in time."],
];

export function friendlyFailure(raw = "", step = "") {
  const text = String(raw || "");
  for (const [re, msg] of FAILURE_HINTS) {
    if (re.test(text)) return msg;
  }
  const where = step && step !== "Provisioning failed" ? ` during "${step}"` : "";
  return `Something went wrong${where}. Please try again, or share the details with support.`;
}
