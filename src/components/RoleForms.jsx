import React, { useState } from 'react';
import { BACKEND_URL } from '../config';

const DATA_PROVIDER_FORM_URL = `${BACKEND_URL}/p3dx/data-provider-forms`;

// Read by FederatedLearningDashboard's startVmProvisioning once this
// provider signs in with Azure - the form and the sign-in trigger live in
// separate components on the same page, so sessionStorage is the bridge.
export const DP_VM_NAME_KEY = 'p3dx_flo_dp_vm_name';

// Data Provider form submits to governance layer
async function submitDataOwnerFormToBackend(payload, token) {
  const res = await fetch(DATA_PROVIDER_FORM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ payload })
  });
  return res.json();
}

export function DataOwnerForm({ user, token }) {
  const [formData, setFormData] = useState(() => ({
    form_id: 'dataform-001',
    data_owner_id: user?.username || '',
    dataset_name: '',
    dataset_location_url: '',
    RAM: 16,
    ram_usage: '',
    memory_mb: 8192,
    data_size_bytes: '',
    data_resource_id: '',
    ip_address: '',
    port: '',
    // Not part of the governance-layer submission below - stashed in
    // sessionStorage on every change so FederatedLearningDashboard's
    // Azure-sign-in flow can name the auto-provisioned VM after it (see
    // DP_VM_NAME_KEY / startVmProvisioning there). Read any existing value
    // back on init (lazy initializer, so this only runs once) rather than
    // always defaulting to the username - signing in as a data provider
    // does a full-page redirect, which remounts this component, and
    // blindly re-defaulting here would wipe out whatever name was typed
    // right before the redirect fired.
    vm_name: sessionStorage.getItem(DP_VM_NAME_KEY) || user?.username || ''
  }));
  const [msg, setMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const setVmName = (value) => {
    setFormData(prev => ({ ...prev, vm_name: value }));
    sessionStorage.setItem(DP_VM_NAME_KEY, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);
    const obj = {
      ...formData,
      data_owner_id: user?.username || '',
      filled: true,
      requested_at: new Date().toISOString(),
      filled_at: new Date().toISOString()
    };
    const freshToken = sessionStorage.getItem("access_token") || token;
    try {
      const data = await submitDataOwnerFormToBackend(obj, freshToken);
      setMsg({ type: data.status === 'SUCCESS' ? 'success' : 'error', text: data.status === 'SUCCESS' ? 'Form submitted successfully' : (data.error || 'Error saving form') });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <h3 className="section-title" style={{ marginTop: 0 }}>Data Provider Form</h3>

      {msg ? <div className={msg.type === 'success' ? 'info-banner' : 'error-message'}>{msg.text}</div> : null}

      <form onSubmit={handleSubmit}>
        <div className="grid">
          <div className="form-group">
            <label>Form ID</label>
            <input
              className="input"
              value={formData.form_id}
              onChange={e => setFormData({ ...formData, form_id: e.target.value })}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label>Data Owner ID</label>
            <input
              className="input"
              value={formData.data_owner_id}
              onChange={e => setFormData({ ...formData, data_owner_id: e.target.value })}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="grid">
          <div className="form-group">
            <label>Dataset Name</label>
            <input
              className="input"
              value={formData.dataset_name}
              onChange={e => setFormData({ ...formData, dataset_name: e.target.value })}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label>Data Resource ID</label>
            <input
              className="input"
              value={formData.data_resource_id}
              onChange={e => setFormData({ ...formData, data_resource_id: e.target.value })}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="grid">
          <div className="form-group">
            <label>RAM (MB)</label>
            <input
              className="input"
              type="number"
              value={formData.RAM}
              onChange={e => setFormData({ ...formData, RAM: e.target.value })}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label>RAM Usage (MB)</label>
            <input
              className="input"
              type="number"
              value={formData.ram_usage}
              onChange={e => setFormData({ ...formData, ram_usage: e.target.value })}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="grid">
          <div className="form-group">
            <label>Dataset Location URL</label>
            <input
              className="input"
              placeholder="e.g. https://storage.example.com/datasets/my-dataset"
              value={formData.dataset_location_url}
              onChange={e => setFormData({ ...formData, dataset_location_url: e.target.value })}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label>Disk Space (MB)</label>
            <input
              className="input"
              type="number"
              value={formData.memory_mb}
              onChange={e => setFormData({ ...formData, memory_mb: e.target.value })}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="grid">
          <div className="form-group">
            <label>Data Size (bytes)</label>
            <input
              className="input"
              type="number"
              value={formData.data_size_bytes}
              onChange={e => setFormData({ ...formData, data_size_bytes: e.target.value })}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>IP Address</label>
            <input
              className="input"
              placeholder="e.g. 192.168.1.10"
              value={formData.ip_address}
              onChange={e => setFormData({ ...formData, ip_address: e.target.value })}
              disabled={submitting}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Port</label>
            <input
              className="input"
              type="number"
              placeholder="e.g. 8080"
              min="1"
              max="65535"
              value={formData.port}
              onChange={e => setFormData({ ...formData, port: e.target.value })}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>VM Name</label>
            <input
              className="input"
              placeholder="e.g. alice-data-provider"
              value={formData.vm_name}
              onChange={e => setVmName(e.target.value)}
              disabled={submitting}
            />
            <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "4px" }}>
              Names the VM auto-created for you when you sign in with Azure to join an FL session.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
          <button className="btn btn-primary" style={{ width: "auto" }} type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Data Provider Form"}
          </button>
        </div>
      </form>
    </div>
  );
}
