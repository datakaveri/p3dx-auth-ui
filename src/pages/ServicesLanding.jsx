import { useNavigate, useOutletContext } from "react-router-dom";
import { EyeOff, Network, Lock, BarChart2, ArrowRight, CheckCircle } from "lucide-react";

const SERVICE_DEFS = [
  {
    title: "Anonymization",
    description:
      "Mask or remove personally identifiable attributes from your datasets using state-of-the-art de-identification techniques.",
    icon: <EyeOff size={22} />,
    iconClass: "service-icon--blue",
    cardClass: "service-card--blue",
    roleRequired: false,
    onClick: () => {
      const token = localStorage.getItem("access_token");
      const expiresIn = localStorage.getItem("expires_in") || "";
      const refreshToken = localStorage.getItem("refresh_token") || "";

      const params = new URLSearchParams();
      if (token) params.set("access_token", token);
      if (expiresIn) params.set("expires_in", String(expiresIn));
      if (refreshToken) params.set("refresh_token", refreshToken);

      const hash = params.toString();
      window.location.assign(
        hash ? `https://spider.p3dx.iudx.org.in/#${hash}` : "https://spider.p3dx.iudx.org.in/"
      );
    },
  },
  {
    title: "Federated Learning",
    description:
      "Train machine learning models across distributed datasets without centralising or exposing raw data.",
    icon: <Network size={22} />,
    iconClass: "service-icon--purple",
    cardClass: "service-card--purple",
    roleRequired: true,
    navigate: "/app/services/fl",
  },
  {
    title: "SMPC",
    description:
      "Execute joint computations across multiple parties while keeping each party's inputs cryptographically private.",
    icon: <Lock size={22} />,
    iconClass: "service-icon--teal",
    cardClass: "service-card--teal",
    roleRequired: true,
    navigate: "/app/services/smpc",
  },
  {
    title: "Differential Privacy",
    description:
      "Query datasets with mathematical privacy guarantees that ensure individual records cannot be re-identified.",
    icon: <BarChart2 size={22} />,
    iconClass: "service-icon--amber",
    cardClass: "service-card--amber",
    roleRequired: true,
    navigate: "/app/services/dp",
  },
];

function ServiceCard({ title, description, icon, iconClass, cardClass, roleRequired, onClick }) {
  return (
    <button className={`service-card ${cardClass}`} onClick={onClick} type="button">
      <div className={`service-icon ${iconClass}`}>{icon}</div>

      <div className="service-card-body">
        <div className="service-title">{title}</div>
        <div className="service-description">{description}</div>
      </div>

      <div className="service-card-footer">
        <span className={`service-role-badge ${roleRequired ? "service-role-badge--req" : "service-role-badge--free"}`}>
          {!roleRequired && <CheckCircle size={10} />}
          {roleRequired ? "Role required" : "No role required"}
        </span>
        <span className="service-arrow">
          <ArrowRight size={15} />
        </span>
      </div>
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
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>Services</h3>
          <div className="services-subtitle">
            Privacy-enhancing computation services. Select a service to get started.
          </div>
        </div>
      </div>

      <div className="service-grid">
        {SERVICE_DEFS.map(def => (
          <ServiceCard
            key={def.title}
            title={def.title}
            description={def.description}
            icon={def.icon}
            iconClass={def.iconClass}
            cardClass={def.cardClass}
            roleRequired={def.roleRequired}
            onClick={def.onClick ?? (() => navigate(def.navigate))}
          />
        ))}
      </div>
    </div>
  );
}
