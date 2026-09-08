import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./styles/global.css";

// MSAL v5 popup sign-in (see api/azureAuth.js) navigates the popup back to
// this same origin with the auth response in the URL, then waits for this
// page to relay it back via BroadcastChannel and self-close. Without this,
// the popup just boots the full app (showing the Login page) and the
// opener's loginPopup() call hangs forever waiting for a message that never
// comes.
//
// Gated on the URL actually containing MSAL's state= param, NOT on
// window.opener: Microsoft's login page sends Cross-Origin-Opener-Policy:
// same-origin, which permanently severs window.opener the moment the popup
// navigates through it (see the same COOP note in api/azureAuth.js), so a
// window.opener check misses exactly the case that needs handling. But
// calling broadcastResponseToMainFrame() unconditionally isn't safe either:
// its very first line is `document.title = "Microsoft Authentication"`,
// which runs *before* it checks whether the URL has a real auth response -
// so on every normal page load (e.g. /login) it would stamp the tab title
// before throwing harmlessly. Checking for state= ourselves first avoids
// that, while still working regardless of window.opener.
function hasMsalAuthResponse() {
  return /(?:^|[?#&])state=/.test(window.location.hash) || /(?:^|[?#&])state=/.test(window.location.search);
}

async function handleMsalPopupBridge() {
  if (!hasMsalAuthResponse()) return false;
  try {
    const { broadcastResponseToMainFrame } = await import("@azure/msal-browser/redirect-bridge");
    await broadcastResponseToMainFrame();
    return true;
  } catch {
    return false;
  }
}

handleMsalPopupBridge().then((handled) => {
  if (handled) return;
  ReactDOM.createRoot(document.getElementById("root")).render(
    <RouterProvider router={router} />
  );
});
