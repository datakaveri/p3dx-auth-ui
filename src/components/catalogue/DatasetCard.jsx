import { Database, Calendar, FileText, Check } from "lucide-react";

export default function DatasetCard({ dataset, isSelected, onSelect, onViewDetails }) {
  return (
    <div
      className={`cat-card${isSelected ? " cat-card--selected" : ""}`}
      onClick={onViewDetails}
    >
      <div className="cat-card__body">
        <div className="cat-card__icon cat-card__icon--dataset">
          <Database size={20} />
        </div>
        <div className="cat-card__content">
          <div className="cat-card__header">
            <h3 className="cat-card__name">{dataset.name}</h3>
            {isSelected && (
              <span className="cat-badge cat-badge--selected">
                <Check size={11} style={{ marginRight: 3 }} />
                Selected
              </span>
            )}
          </div>
          <p className="cat-card__desc">{dataset.description}</p>
          <div className="cat-card__meta">
            <span className="cat-card__meta-item">
              <FileText size={12} />
              {dataset.format}
            </span>
            <span className="cat-card__meta-item">{dataset.size}</span>
            <span className="cat-card__meta-item">{dataset.records.toLocaleString()} records</span>
            <span className="cat-card__meta-item">
              <Calendar size={12} />
              {dataset.lastUpdated}
            </span>
          </div>
          <div className="cat-card__footer">
            <span className="cat-badge cat-badge--provider">{dataset.provider}</span>
            <span className="cat-badge cat-badge--category">{dataset.category}</span>
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
