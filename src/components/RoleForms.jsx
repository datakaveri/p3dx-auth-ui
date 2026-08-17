import React, { useState } from 'react';

const DATA_PROVIDER_FORM_URL = "/api/v1/data-provider-forms";

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
  const [formData, setFormData] = useState({
    form_id: 'dataform-001',
    data_owner_id: user?.username || '',
    RAM: 16,
    ram_usage: '',
    memory_mb: 8192,
    data_size_bytes: '',
    data_resource_id: '',
    ip_address: '',
    port: ''
  });
  const [msg, setMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const obj = {
      ...formData,
      data_owner_id: user?.username || '',
      filled: true,
      requested_at: new Date().toISOString(),
      filled_at: new Date().toISOString()
    };
    const freshToken = localStorage.getItem("access_token") || token;
    try {
      const data = await submitDataOwnerFormToBackend(obj, freshToken);
      setMsg({ type: data.status === 'SUCCESS' ? 'success' : 'error', text: data.status === 'SUCCESS' ? 'Form submitted successfully' : (data.error || 'Error saving form') });
    } catch(err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <h3 className="section-title">Data Provider Form</h3>
      {msg && <div className={msg.type === 'success' ? 'info-banner' : 'error-message'} style={msg.type === 'success' ? { backgroundColor: 'var(--success-color, #27ae60)', color: 'white' } : {}}>{msg.text}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Form ID</label>
          <input value={formData.form_id} onChange={(e) => setFormData({...formData, form_id: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Data Owner ID</label>
          <input value={formData.data_owner_id} onChange={(e) => setFormData({...formData, data_owner_id: e.target.value})} />
        </div>
        <div className="form-group">
          <label>RAM (MB)</label>
          <input type="number" value={formData.RAM} onChange={(e) => setFormData({...formData, RAM: e.target.value})} />
        </div>
        <div className="form-group">
          <label>RAM Usage (MB)</label>
          <input type="number" value={formData.ram_usage} onChange={(e) => setFormData({...formData, ram_usage: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Disk Space (MB)</label>
          <input type="number" value={formData.memory_mb} onChange={(e) => setFormData({...formData, memory_mb: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Data Size (bytes)</label>
          <input type="number" value={formData.data_size_bytes} onChange={(e) => setFormData({...formData, data_size_bytes: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Data Resource ID</label>
          <input value={formData.data_resource_id} onChange={(e) => setFormData({...formData, data_resource_id: e.target.value})} />
        </div>
        <div className="form-group">
          <label>IP Address</label>
          <input placeholder="e.g. 192.168.1.10" value={formData.ip_address} onChange={(e) => setFormData({...formData, ip_address: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Port</label>
          <input type="number" placeholder="e.g. 8080" min="1" max="65535" value={formData.port} onChange={(e) => setFormData({...formData, port: e.target.value})} />
        </div>
        <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>Submit Data Provider Form</button>
      </form>
    </div>
  );
}
