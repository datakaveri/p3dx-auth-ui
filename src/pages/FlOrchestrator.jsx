import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import VmProvisioningPanel from "../components/VmProvisioningPanel";

// Dedicated landing spot for the "one more Azure sign-in + VM creation" step,
// reached right after an output-owner starts an FL session or a data-provider
// finishes their own Azure sign-in — kept off the main FL pages so those stay
// focused on the FL workflow itself rather than Terraform/VM plumbing.
export default function FlOrchestrator() {
  const { user, token } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const role = location.state?.role || params.get("role") || "data-provider";
  const vmName = location.state?.vmName || params.get("vmName") || "";
  const roleLabel = role === "user" ? "output-owner" : "data-provider";

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>FL Orchestrator</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Creating and registering your {roleLabel} VM for this federated learning run.
          </div>
        </div>
      </div>

      <VmProvisioningPanel user={user} token={token} role={role} initialVmName={vmName} autoStart={Boolean(vmName)} />

      <button className="btn btn-secondary" type="button" style={{ width: "auto" }} onClick={() => navigate(-1)}>
        Back
      </button>
    </div>
  );
}
