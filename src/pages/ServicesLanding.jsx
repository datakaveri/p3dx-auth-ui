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
      <div className="services-landing-inner">
        <div className="page-header">
          <div className="page-header-title">
            <h3 className="section-title" style={{ marginBottom: 0 }}>Services</h3>
            <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
              Choose a service to continue.
            </div>
          </div>
        </div>

        <div className="service-grid">
          <ServiceCard
            title="Anonymization"
            description="No special role required."
            onClick={() => {
              const token = localStorage.getItem("access_token");
              const expiresIn = localStorage.getItem("expires_in") || "";
              const refreshToken = localStorage.getItem("refresh_token") || "";

              const params = new URLSearchParams();
              if (token) params.set("access_token", token);
              if (expiresIn) params.set("expires_in", String(expiresIn));
              if (refreshToken) params.set("refresh_token", refreshToken);

              const hash = params.toString();
              const redirectUrl = hash
                ? `https://spider.p3dx.iudx.org.in/#${hash}`
                : "https://spider.p3dx.iudx.org.in/";

              window.location.assign(redirectUrl);
            }}
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
    </div>
  );
}
