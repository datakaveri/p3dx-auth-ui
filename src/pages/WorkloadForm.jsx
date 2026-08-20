import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { previewContract } from "../api/workloads";
import { listAvailableDatasets } from "../api/roleRequests";
import { applications, categories } from "../data/catalogueData";
import ApplicationCard from "../components/catalogue/ApplicationCard";
import ApplicationDetailPanel from "../components/catalogue/ApplicationDetailPanel";
import {
  Database, Cpu, Search, Server, Play, X,
  CheckCircle2, AlertCircle,
  LayoutGrid, Heart, Activity, Globe, Zap, Shield,
} from "lucide-react";

const CATEGORY_ICONS = {
  "All Categories": <LayoutGrid size={14} />,
  Healthcare: <Heart size={14} />,
  Finance: <Activity size={14} />,
  Transportation: <Globe size={14} />,
  Geospatial: <Globe size={14} />,
  Energy: <Zap size={14} />,
  Privacy: <Shield size={14} />,
};

export default function WorkloadForm() {
  const { isAdmin, token } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = location.state?.returnTo || "/app/services/fl";
  // FL vs SMPC is chosen on the dashboard the user came from, not here.
  const technique = location.state?.technique;

  // Redirect admins
  useEffect(() => {
    if (isAdmin) navigate("/app/admin", { replace: true });
  }, [isAdmin]);

  // Catalogue state
  const [activeTab, setActiveTab] = useState("datasets");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDatasetName, setSelectedDatasetName] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [viewingApplication, setViewingApplication] = useState(null);

  // Real, registered dataset names (from APD via aaa's /available-datasets) —
  // no catalogue metadata (category/description/size/etc.) exists for these yet.
  const [datasetNames, setDatasetNames] = useState([]);
  const [datasetsLoading, setDatasetsLoading] = useState(true);
  const [datasetsError, setDatasetsError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDatasets() {
      setDatasetsLoading(true);
      setDatasetsError(null);
      try {
        const data = await listAvailableDatasets(token);
        if (!cancelled) {
          setDatasetNames(Array.isArray(data?.datasets) ? data.datasets : []);
        }
      } catch (err) {
        if (!cancelled) setDatasetsError(err.message || "Failed to load datasets");
      } finally {
        if (!cancelled) setDatasetsLoading(false);
      }
    }
    if (token) loadDatasets();
    return () => { cancelled = true; };
  }, [token]);

  // Workload state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [generatedContract, setGeneratedContract] = useState(null);
  const [showRawContract, setShowRawContract] = useState(false);

  // Filtered lists
  const filteredDatasetNames = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return datasetNames.filter(name => !q || name.toLowerCase().includes(q));
  }, [datasetNames, searchQuery]);

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesCategory = selectedCategory === "All Categories" || app.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || app.name.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) || app.provider.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleDatasetSelect = (name) => {
    setSelectedDatasetName(prev => prev === name ? null : name);
  };

  const handleApplicationSelect = (application) => {
    setSelectedApplication(prev => prev?.id === application.id ? null : application);
  };

  const handleGenerateContract = async () => {
    if (!selectedDatasetName || !selectedApplication || !technique) return;
    setError(null);
    setGeneratedContract(null);
    setIsGenerating(true);
    try {
      if (!token) throw new Error("MISSING_AUTH_TOKEN");
      const res = await previewContract(token, {
        datasetId: selectedDatasetName,
        technique,
      });
      setGeneratedContract(res?.contract || null);
    } catch (err) {
      setError(err.message || "Contract generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const canRun = selectedDatasetName && selectedApplication && technique;
  const missingItems = [];
  if (!selectedDatasetName) missingItems.push("dataset");
  if (!selectedApplication) missingItems.push("application");
  if (!technique) missingItems.push("service (FL/SMPC — go back and start from that dashboard)");

  return (
    <div className="cat-layout">
      {/* Left sidebar — categories */}
      <aside className="cat-sidebar">
        <div className="cat-sidebar__header">
          {activeTab === "datasets"
            ? <><Database size={16} /><span>Datasets</span></>
            : <><Cpu size={16} /><span>Applications</span></>
          }
        </div>
        {activeTab === "applications" ? (
          <nav className="cat-sidebar__nav">
            {categories.map(cat => (
              <button
                key={cat}
                className={`cat-sidebar__item${selectedCategory === cat ? " cat-sidebar__item--active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {CATEGORY_ICONS[cat]}
                {cat}
              </button>
            ))}
          </nav>
        ) : (
          <div className="cat-sidebar__nav" style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-light)" }}>
            Registered datasets aren't categorized yet — search by name instead.
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="cat-main">
        {/* Toolbar */}
        <div className="cat-toolbar">
          <div className="cat-tabs">
            <button
              className={`cat-tab${activeTab === "datasets" ? " cat-tab--active" : ""}`}
              onClick={() => setActiveTab("datasets")}
            >
              <Database size={14} />
              Datasets
            </button>
            <button
              className={`cat-tab${activeTab === "applications" ? " cat-tab--active" : ""}`}
              onClick={() => setActiveTab("applications")}
            >
              <Cpu size={14} />
              Applications
            </button>
          </div>
          <div className="cat-search">
            <Search size={14} className="cat-search__icon" />
            <input
              className="cat-search__input"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="btn btn-secondary cat-back-btn"
            onClick={() => navigate(returnTo)}
          >
            ← Back
          </button>
        </div>

        {/* Content area */}
        <div className="cat-content">
          {/* Cards list */}
          <div className="cat-list">
            {activeTab === "datasets" ? (
              datasetsLoading ? (
                <div className="cat-empty">
                  <Database size={40} />
                  <p>Loading datasets…</p>
                </div>
              ) : datasetsError ? (
                <div className="cat-empty">
                  <AlertCircle size={40} />
                  <p>Could not load datasets</p>
                  <span>{datasetsError}</span>
                </div>
              ) : filteredDatasetNames.length > 0 ? (
                <div className="cat-simple-list">
                  {filteredDatasetNames.map(name => (
                    <button
                      key={name}
                      type="button"
                      className={`cat-simple-item${selectedDatasetName === name ? " cat-simple-item--selected" : ""}`}
                      onClick={() => handleDatasetSelect(name)}
                    >
                      <Database size={16} />
                      <span className="cat-simple-item__name">{name}</span>
                      {selectedDatasetName === name && <CheckCircle2 size={15} />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="cat-empty">
                  <Database size={40} />
                  <p>No datasets registered yet</p>
                  <span>Datasets show up here once a data provider registers one</span>
                </div>
              )
            ) : (
              filteredApplications.length > 0 ? (
                filteredApplications.map(application => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    isSelected={selectedApplication?.id === application.id}
                    onSelect={() => handleApplicationSelect(application)}
                    onViewDetails={() => setViewingApplication(application)}
                  />
                ))
              ) : (
                <div className="cat-empty">
                  <Cpu size={40} />
                  <p>No applications found</p>
                  <span>Try adjusting your search or category filter</span>
                </div>
              )
            )}
          </div>

          {/* Detail panel */}
          {viewingApplication && (
            <ApplicationDetailPanel
              application={viewingApplication}
              isSelected={selectedApplication?.id === viewingApplication.id}
              onSelect={() => handleApplicationSelect(viewingApplication)}
              onClose={() => setViewingApplication(null)}
            />
          )}
        </div>
      </div>

      {/* Right panel — selection summary */}
      <aside className="cat-summary">
        <div className="cat-summary__header">
          <Server size={16} />
          <span>Workload Configuration</span>
        </div>

        {error && (
          <div className="error-message" style={{ marginBottom: 12, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Technique slot */}
        <div className={`cat-slot${technique ? " cat-slot--filled" : ""}`}>
          <div className="cat-slot__icon">
            <Server size={16} />
          </div>
          <div className="cat-slot__info">
            <div className="cat-slot__label">Service</div>
            {technique
              ? <div className="cat-slot__value">{technique}</div>
              : <div className="cat-slot__placeholder">Not set — start from the FL or SMPC dashboard</div>
            }
          </div>
        </div>

        {/* Dataset slot */}
        <div className={`cat-slot${selectedDatasetName ? " cat-slot--filled" : ""}`}>
          <div className="cat-slot__icon">
            <Database size={16} />
          </div>
          <div className="cat-slot__info">
            <div className="cat-slot__label">Dataset</div>
            {selectedDatasetName
              ? <div className="cat-slot__value">{selectedDatasetName}</div>
              : <div className="cat-slot__placeholder">No dataset selected</div>
            }
          </div>
          {selectedDatasetName && (
            <button className="cat-icon-btn cat-slot__clear" onClick={() => setSelectedDatasetName(null)} title="Clear">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Application slot */}
        <div className={`cat-slot${selectedApplication ? " cat-slot--filled" : ""}`}>
          <div className="cat-slot__icon">
            <Cpu size={16} />
          </div>
          <div className="cat-slot__info">
            <div className="cat-slot__label">Application</div>
            {selectedApplication
              ? <div className="cat-slot__value">{selectedApplication.name}</div>
              : <div className="cat-slot__placeholder">No application selected</div>
            }
          </div>
          {selectedApplication && (
            <button className="cat-icon-btn cat-slot__clear" onClick={() => setSelectedApplication(null)} title="Clear">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status */}
        <div className={`cat-status${canRun ? " cat-status--ready" : ""}`}>
          {canRun
            ? <><CheckCircle2 size={15} /><span>Ready to generate contract</span></>
            : <><AlertCircle size={15} /><span>Select {missingItems.join(", ")} to continue</span></>
          }
        </div>

        {/* Generate button — this only builds and displays a contract. It does
            not submit/deploy anything; that step is not wired up yet. */}
        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 0 }}
          disabled={!canRun || isGenerating}
          onClick={handleGenerateContract}
        >
          {isGenerating ? (
            "Generating Contract..."
          ) : (
            <><Play size={14} style={{ marginRight: 6 }} />Generate Contract</>
          )}
        </button>

        {generatedContract && (
          <div className="card" style={{ marginTop: 14 }}>
            <div className="cat-summary__header" style={{ padding: 0, marginBottom: 10 }}>
              <CheckCircle2 size={16} />
              <span>Generated Contract (preview only — not submitted)</span>
            </div>
            <div className="grid">
              <div>
                <div className="label">Technique</div>
                <div className="value">{generatedContract.technique}</div>
              </div>
              <div>
                <div className="label">Contract ID</div>
                <div className="value">{generatedContract.contract_id}</div>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div className="label">Dataset</div>
              <div className="value">{generatedContract.data_provider_terms?.dataset_name}</div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div className="label">Parties</div>
              <div className="value" style={{ fontSize: 13 }}>
                Consumer: {generatedContract.parties?.consumer?.id}<br />
                Data Provider: {generatedContract.parties?.data_provider?.name}<br />
                Application Provider: {generatedContract.parties?.application_provider?.name}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: "100%", marginTop: 12 }}
              onClick={() => setShowRawContract(v => !v)}
            >
              {showRawContract ? "Hide raw contract" : "View raw contract"}
            </button>
            {showRawContract && (
              <pre style={{ marginTop: 10, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {JSON.stringify(generatedContract, null, 2)}
              </pre>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
