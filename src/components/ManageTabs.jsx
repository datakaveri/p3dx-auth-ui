import { useMemo } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";

// Tab bar shared by the "Manage" pages — My Datasets, My Infrastructure and
// Contracts. Shows only the tabs the caller's roles can open (Contracts is
// data-provider only, like the backend's GET /contracts/sign-requests), and
// nothing at all when that leaves a single tab. returnTo is carried across
// tabs so each page's Back button still goes where Manage was opened from.
export default function ManageTabs({ returnTo }) {
  const { user } = useOutletContext();
  const roles = useMemo(() => user?.roles || [], [user]);
  const hasDataProvider = roles.includes("data-provider");
  const hasInfraProvider = roles.includes("infra-provider");

  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    hasDataProvider ? { label: "Datasets", path: "/app/services/policies/my" } : null,
    hasInfraProvider ? { label: "Infrastructure", path: "/app/services/infra-policy/my" } : null,
    hasDataProvider ? { label: "Contracts", path: "/app/services/contracts" } : null,
  ].filter(Boolean);

  if (tabs.length < 2) return null;

  return (
    <div className="cat-tabs" style={{ marginBottom: "16px" }}>
      {tabs.map(tab => {
        const active = location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            type="button"
            className={active ? "cat-tab cat-tab--active" : "cat-tab"}
            onClick={() => {
              if (!active) navigate(tab.path, { state: { returnTo } });
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
