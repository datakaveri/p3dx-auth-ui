import { useLocation, useNavigate, useOutletContext } from "react-router-dom";

export default function AnonService() {
  const { isAdmin } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  if (isAdmin) {
    return (
      <div>
        <h3 className="section-title">Anonymization</h3>
        <div className="info-banner">Admins do not use services. This page is for users.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}>Anonymization</h3>
          <button
            className="btn btn-secondary"
            style={{ width: "auto" }}
            type="button"
            onClick={() =>
              navigate("/app/services/run", {
                state: { returnTo: location.pathname, technique: "TEE" },
              })
            }
          >
            Run Workload
          </button>
        </div>
        <div style={{ height: "12px" }} />
        <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
          Anonymization runs on TEE — pick a dataset to generate a contract, then run it.
        </div>
      </div>
    </div>
  );
}
