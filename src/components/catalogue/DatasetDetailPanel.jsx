import { Database, X, Calendar, FileText, Shield, Tag, Clock, Check } from "lucide-react";

export default function DatasetDetailPanel({ dataset, isSelected, onSelect, onClose }) {
  return (
    <div className="cat-detail-panel">
      <div className="cat-detail-panel__header">
        <div className="cat-detail-panel__title">
          <div className="cat-card__icon cat-card__icon--dataset">
            <Database size={20} />
          </div>
          <div>
            <h2 className="cat-detail-panel__name">{dataset.name}</h2>
            <p className="cat-detail-panel__provider">{dataset.provider}</p>
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
          <p className="cat-detail-section__text">{dataset.description}</p>
        </section>

        {/* Quick Stats */}
        <section className="cat-detail-section">
          <h3 className="cat-detail-section__title">Dataset Stats</h3>
          <div className="cat-stats-grid">
            <div className="cat-stat">
              <div className="cat-stat__label"><FileText size={13} /> Format</div>
              <div className="cat-stat__value">{dataset.format}</div>
            </div>
            <div className="cat-stat">
              <div className="cat-stat__label"><Database size={13} /> Size</div>
              <div className="cat-stat__value">{dataset.size}</div>
            </div>
            <div className="cat-stat">
              <div className="cat-stat__label"><FileText size={13} /> Records</div>
              <div className="cat-stat__value">{dataset.records.toLocaleString()}</div>
            </div>
            <div className="cat-stat">
              <div className="cat-stat__label"><Calendar size={13} /> Updated</div>
              <div className="cat-stat__value">{dataset.lastUpdated}</div>
            </div>
          </div>
        </section>

        {/* Access Policy */}
        <section className="cat-detail-section">
          <h3 className="cat-detail-section__title"><Shield size={13} style={{ marginRight: 4 }} />Access Policy</h3>
          <div className="cat-detail-row">
            <span className="cat-detail-row__label"><Clock size={12} /> Duration</span>
            <span className="cat-detail-row__value">{dataset.accessPolicy.duration}</span>
          </div>
          <div className="cat-detail-row">
            <span className="cat-detail-row__label">Allowed Tasks</span>
            <div className="cat-badge-group">
              {dataset.accessPolicy.allowedTasks.map(t => (
                <span key={t} className="cat-badge cat-badge--cap">{t}</span>
              ))}
            </div>
          </div>
          <div className="cat-detail-row">
            <span className="cat-detail-row__label">Restrictions</span>
            <div className="cat-badge-group">
              {dataset.accessPolicy.restrictions.map(r => (
                <span key={r} className="cat-badge cat-badge--warning">{r}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Schema */}
        <section className="cat-detail-section">
          <h3 className="cat-detail-section__title">Schema</h3>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {dataset.metadata.columns.map(col => (
                  <tr key={col.name}>
                    <td><code className="cat-code">{col.name}</code></td>
                    <td><span className="cat-badge cat-badge--type">{col.type}</span></td>
                    <td>{col.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sample Data */}
        <section className="cat-detail-section">
          <h3 className="cat-detail-section__title">Sample Data</h3>
          <div className="cat-table-wrap">
            <table className="cat-table">
              <thead>
                <tr>
                  {Object.keys(dataset.sampleData[0] || {}).map(k => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataset.sampleData.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => (
                      <td key={j}>{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Tags */}
        <section className="cat-detail-section">
          <h3 className="cat-detail-section__title"><Tag size={13} style={{ marginRight: 4 }} />Tags</h3>
          <div className="cat-badge-group">
            {dataset.metadata.tags.map(tag => (
              <span key={tag} className="cat-badge cat-badge--tag">{tag}</span>
            ))}
          </div>
        </section>

        {/* License */}
        <section className="cat-detail-section">
          <div className="cat-detail-row">
            <span className="cat-detail-row__label">License</span>
            <span className="cat-detail-row__value">{dataset.metadata.license}</span>
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
            "Deselect Dataset"
          ) : (
            <><Check size={14} style={{ marginRight: 6 }} />Select Dataset</>
          )}
        </button>
      </div>
    </div>
  );
}
