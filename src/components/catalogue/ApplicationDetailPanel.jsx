import { Cpu, X, Calendar, Gauge, Clock, Zap, FileInput, FileOutput, Tag, Check } from "lucide-react";

export default function ApplicationDetailPanel({ application, isSelected, onSelect, onClose }) {
  return (
    <div className="cat-detail-panel">
      <div className="cat-detail-panel__header">
        <div className="cat-detail-panel__title">
          <div className="cat-card__icon cat-card__icon--app">
            <Cpu size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 className="cat-detail-panel__name">{application.name}</h2>
              <span className="cat-badge cat-badge--version">v{application.version}</span>
            </div>
            <p className="cat-detail-panel__provider">{application.provider}</p>
          </div>
        </div>
        <button className="cat-icon-btn" onClick={onClose} title="Close">
          <X size={16} />
        </button>
      </div>

      <div className="cat-detail-panel__body">
        {/* Description */}
        <section className="cat-detail-section">
          <h3 className="cat-detail-section__title">Description</h3>
          <p className="cat-detail-section__text">{application.description}</p>
        </section>

        {/* Performance Metrics */}
        <section className="cat-detail-section">
          <h3 className="cat-detail-section__title">Performance</h3>
          <div className="cat-stats-grid cat-stats-grid--3">
            <div className="cat-stat cat-stat--center">
              <div className="cat-stat__icon"><Gauge size={16} /></div>
              <div className="cat-stat__value cat-stat__value--lg">{application.metadata.performance.accuracy || "N/A"}</div>
              <div className="cat-stat__label">Accuracy</div>
            </div>
            <div className="cat-stat cat-stat--center">
              <div className="cat-stat__icon"><Clock size={16} /></div>
              <div className="cat-stat__value cat-stat__value--lg">{application.metadata.performance.latency || "N/A"}</div>
              <div className="cat-stat__label">Latency</div>
            </div>
            <div className="cat-stat cat-stat--center">
              <div className="cat-stat__icon"><Zap size={16} /></div>
              <div className="cat-stat__value cat-stat__value--lg">{application.metadata.performance.throughput || "N/A"}</div>
              <div className="cat-stat__label">Throughput</div>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section className="cat-detail-section">
          <h3 className="cat-detail-section__title">Capabilities</h3>
          <div className="cat-badge-group">
            {application.capabilities.map(cap => (
              <span key={cap} className="cat-badge cat-badge--cap">{cap}</span>
            ))}
          </div>
        </section>

        {/* Input / Output Types */}
        <section className="cat-detail-section">
          <h3 className="cat-detail-section__title">Data Formats</h3>
          <div className="cat-detail-row">
            <span className="cat-detail-row__label"><FileInput size={12} /> Input</span>
            <div className="cat-badge-group">
              {application.inputTypes.map(t => (
                <span key={t} className="cat-badge cat-badge--type">{t}</span>
              ))}
            </div>
          </div>
          <div className="cat-detail-row">
            <span className="cat-detail-row__label"><FileOutput size={12} /> Output</span>
            <div className="cat-badge-group">
              {application.outputTypes.map(t => (
                <span key={t} className="cat-badge cat-badge--type">{t}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Technical Details */}
        <section className="cat-detail-section">
          <h3 className="cat-detail-section__title">Technical Details</h3>
          <div className="cat-detail-row">
            <span className="cat-detail-row__label">Framework</span>
            <span className="cat-detail-row__value">{application.metadata.framework}</span>
          </div>
          <div className="cat-detail-row">
            <span className="cat-detail-row__label"><Calendar size={12} /> Last Updated</span>
            <span className="cat-detail-row__value">{application.lastUpdated}</span>
          </div>
        </section>

        {/* Tags */}
        <section className="cat-detail-section">
          <h3 className="cat-detail-section__title"><Tag size={13} style={{ marginRight: 4 }} />Tags</h3>
          <div className="cat-badge-group">
            {application.metadata.tags.map(tag => (
              <span key={tag} className="cat-badge cat-badge--tag">{tag}</span>
            ))}
          </div>
        </section>
      </div>

      <div className="cat-detail-panel__footer">
        <button
          className={`btn${isSelected ? " btn-secondary" : " btn-primary"}`}
          style={{ width: "100%" }}
          onClick={onSelect}
        >
          {isSelected ? (
            "Deselect Application"
          ) : (
            <><Check size={14} style={{ marginRight: 6 }} />Select Application</>
          )}
        </button>
      </div>
    </div>
  );
}
