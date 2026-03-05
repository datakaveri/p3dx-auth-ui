import { useNavigate, useOutletContext } from "react-router-dom";

function ServiceCard({ title, description, onClick }) {
  return (
    <button className="service-card" onClick={onClick} type="button">
      <div className="service-title">{title}</div>
      <div className="service-description">{description}</div>
    </button>
  );
}

export default function ServicesLanding() {
  const { isAdmin } = useOutletContext();
  const navigate = useNavigate();

  if (isAdmin) {
    navigate("/app/admin", { replace: true });
    return null;
  }

  return (
    <div>
      <div style={{ marginBottom: "18px" }}>
        <h3 className="section-title">Services</h3>
        <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
          Choose a service to continue.
        </div>
      </div>

      <div className="service-grid">
        <ServiceCard
          title="Anonymization"
          description="No special role required."
          onClick={() => navigate("/app/services/anon")}
        />
        <ServiceCard
          title="Federated Learning"
          description="Request roles before using this service."
          onClick={() => navigate("/app/services/fl")}
        />
        <ServiceCard
          title="SMPC"
          description="Request roles before using this service."
          onClick={() => navigate("/app/services/smpc")}
        />
        <ServiceCard
          title="Differential Privacy"
          description="Request roles before using this service."
          onClick={() => navigate("/app/services/dp")}
        />
      </div>
    </div>
  );
}
