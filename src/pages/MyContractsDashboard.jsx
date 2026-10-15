import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import ContractSignRequests from "../components/ContractSignRequests";
import ManageTabs from "../components/ManageTabs";

// "Contracts" page — the data-provider's contracts to sign (FL final roster,
// TEE, SMPC). Reached as the Contracts tab of the sidebar's Manage section
// (ManageTabs), alongside My Datasets / My Infrastructure.
// All loading/verifying/signing lives in ContractSignRequests; this is just
// the page shell + data-provider role gate (the backend's
// GET /contracts/sign-requests is data-provider-only too).
export default function MyContractsDashboard() {
  const { user, token } = useOutletContext();
  const roles = useMemo(() => user?.roles || [], [user]);
  const hasDataProvider = roles.includes("data-provider");

  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/app/services";

  useEffect(() => {
    if (!hasDataProvider) {
      navigate(returnTo, { replace: true });
    }
  }, [hasDataProvider, returnTo]);

  if (!hasDataProvider) return null;

  return (
    <div>
      <ManageTabs returnTo={returnTo} />
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>Contracts</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Contracts that use your datasets.
          </div>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-secondary"
            style={{ width: "auto" }}
            type="button"
            onClick={() => navigate(returnTo)}
          >
            Back
          </button>
        </div>
      </div>

      <ContractSignRequests token={token} />
    </div>
  );
}
