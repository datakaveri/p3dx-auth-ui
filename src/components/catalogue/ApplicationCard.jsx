import { Cpu, Calendar, Gauge, Check } from "lucide-react";

export default function ApplicationCard({ application, isSelected, onSelect, onViewDetails }) {
  return (
    <div
      className={`cat-card${isSelected ? " cat-card--selected" : ""}`}
      onClick={onViewDetails}
    >
      <div className="cat-card__body">
        <div className="cat-card__icon cat-card__icon--app">
          <Cpu size={20} />
        </div>
        <div className="cat-card__content">
          <div className="cat-card__header">
            <h3 className="cat-card__name">{application.name}</h3>
            <span className="cat-badge cat-badge--version">v{application.version}</span>
            {isSelected && (
              <span className="cat-badge cat-badge--selected">
                <Check size={11} style={{ marginRight: 3 }} />
                Selected
              </span>
            )}
          </div>
          <p className="cat-card__desc">{application.description}</p>
          <div className="cat-card__capabilities">
            {application.capabilities.slice(0, 3).map(cap => (
              <span key={cap} className="cat-badge cat-badge--cap">{cap}</span>
            ))}
          </div>
          <div className="cat-card__meta">
            <span className="cat-card__meta-item">
              <Gauge size={12} />
              {application.metadata.performance.accuracy}
            </span>
            <span className="cat-card__meta-item">{application.metadata.performance.latency}</span>
            <span className="cat-card__meta-item">
              <Calendar size={12} />
              {application.lastUpdated}
            </span>
          </div>
        </div>
      </div>
      <div className="cat-card__actions" onClick={e => e.stopPropagation()}>
        <button
          className={`btn cat-btn-sm${isSelected ? " cat-btn-sm--outline" : " cat-btn-sm--primary"}`}
          onClick={onSelect}
        >
          {isSelected ? "Deselect" : "Select"}
        </button>
        <button className="btn cat-btn-sm cat-btn-sm--ghost" onClick={onViewDetails}>
          View Details
        </button>
      </div>
    </div>
  );
}
