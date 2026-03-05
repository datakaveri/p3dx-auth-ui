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
                state: { returnTo: location.pathname },
              })
            }
          >
            Run Workload
          </button>
        </div>
        <div style={{ height: "12px" }} />
        <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
          This is a static placeholder page. No special roles are required.
        </div>
      </div>

      <div className="card">
        <div style={{ color: "var(--text-dark)", fontSize: "14px", fontWeight: 700, marginBottom: "10px" }}>
          Coming soon
        </div>
        <div style={{ color: "var(--text-light)", fontSize: "14px", lineHeight: 1.6 }}>
          The anonymization workflow will be integrated here. For now, this page confirms that users can
          access the service without requesting additional roles.
        </div>
      </div>
    </div>
  );
}
