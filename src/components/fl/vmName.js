// Mirrors the orchestrator's VM naming: "p3dx-fl-" + the first 10 chars of the
// submission id once the "gov-" prefix and all dashes are stripped.
export function flVmName(submissionId) {
  const core = String(submissionId || "").replace(/^gov-/, "").replace(/-/g, "").slice(0, 10);
  return core ? `p3dx-fl-${core}` : "";
}
