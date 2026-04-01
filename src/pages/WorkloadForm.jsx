import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { runWorkload } from "../api/workloads";
import { datasets, applications, categories } from "../data/catalogueData";
import DatasetCard from "../components/catalogue/DatasetCard";
import ApplicationCard from "../components/catalogue/ApplicationCard";
import DatasetDetailPanel from "../components/catalogue/DatasetDetailPanel";
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

  // Redirect admins
  useEffect(() => {
    if (isAdmin) navigate("/app/admin", { replace: true });
  }, [isAdmin]);

  // Catalogue state
  const [activeTab, setActiveTab] = useState("datasets");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [viewingDataset, setViewingDataset] = useState(null);
  const [viewingApplication, setViewingApplication] = useState(null);

  // Workload state
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  // Filtered lists
  const filteredDatasets = useMemo(() => {
    return datasets.filter(ds => {
      const matchesCategory = selectedCategory === "All Categories" || ds.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || ds.name.toLowerCase().includes(q) ||
        ds.description.toLowerCase().includes(q) || ds.provider.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesCategory = selectedCategory === "All Categories" || app.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || app.name.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) || app.provider.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleDatasetSelect = (dataset) => {
    setSelectedDataset(prev => prev?.id === dataset.id ? null : dataset);
  };

  const handleApplicationSelect = (application) => {
    setSelectedApplication(prev => prev?.id === application.id ? null : application);
  };

  const handleRunWorkload = async () => {
    if (!selectedDataset || !selectedApplication) return;
    setError(null);
    setIsRunning(true);
    try {
      if (!token) throw new Error("MISSING_AUTH_TOKEN");
      const res = await runWorkload(token, {
        datasetId: selectedDataset.id,
        applicationId: selectedApplication.id,
      });
      const contractId = res?.contract?.contract_id;
      if (contractId) {
        navigate(`/app/services/run/${contractId}`);
      }
    } catch (err) {
      setError(err.message || "Run workload failed");
    } finally {
      setIsRunning(false);
    }
  };

  const canRun = selectedDataset && selectedApplication;
  const missingItems = [];
  if (!selectedDataset) missingItems.push("dataset");
  if (!selectedApplication) missingItems.push("application");

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
              filteredDatasets.length > 0 ? (
                filteredDatasets.map(dataset => (
                  <DatasetCard
                    key={dataset.id}
                    dataset={dataset}
                    isSelected={selectedDataset?.id === dataset.id}
                    onSelect={() => handleDatasetSelect(dataset)}
                    onViewDetails={() => {
                      setViewingDataset(dataset);
                      setViewingApplication(null);
                    }}
                  />
                ))
              ) : (
                <div className="cat-empty">
                  <Database size={40} />
                  <p>No datasets found</p>
                  <span>Try adjusting your search or category filter</span>
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
                    onViewDetails={() => {
                      setViewingApplication(application);
                      setViewingDataset(null);
                    }}
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
          {viewingDataset && (
            <DatasetDetailPanel
              dataset={viewingDataset}
              isSelected={selectedDataset?.id === viewingDataset.id}
              onSelect={() => handleDatasetSelect(viewingDataset)}
              onClose={() => setViewingDataset(null)}
            />
          )}
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

        {/* Dataset slot */}
        <div className={`cat-slot${selectedDataset ? " cat-slot--filled" : ""}`}>
          <div className="cat-slot__icon">
            <Database size={16} />
          </div>
          <div className="cat-slot__info">
            <div className="cat-slot__label">Dataset</div>
            {selectedDataset
              ? <div className="cat-slot__value">{selectedDataset.name}</div>
              : <div className="cat-slot__placeholder">No dataset selected</div>
            }
          </div>
          {selectedDataset && (
            <button className="cat-icon-btn cat-slot__clear" onClick={() => setSelectedDataset(null)} title="Clear">
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
            ? <><CheckCircle2 size={15} /><span>Ready to run workload</span></>
            : <><AlertCircle size={15} /><span>Select {missingItems.join(" and ")} to continue</span></>
          }
        </div>

        {/* Run button */}
        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 0 }}
          disabled={!canRun || isRunning}
          onClick={handleRunWorkload}
        >
          {isRunning ? (
            "Initializing Workload..."
          ) : (
            <><Play size={14} style={{ marginRight: 6 }} />Run Workload</>
          )}
        </button>
      </aside>
    </div>
  );
}
