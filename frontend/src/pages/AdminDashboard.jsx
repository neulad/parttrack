import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar.jsx';
import PartsTable from '../components/PartsTable.jsx';
import Dropdown from '../components/Dropdown.jsx';
import PartDetailView from '../components/PartDetailView.jsx';
import LocationAutocomplete from '../components/LocationAutocomplete.jsx';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

const PIN = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
  </svg>
);

/* ── Modals ── */

function AddPartModal({ stations, onClose, onAdded }) {
  const [form, setForm] = useState({ station_id: stations[0]?.id || '', name: '', sku: '', supplier: '', min_threshold: '5', tracking_link: '', ordered_quantity: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const payload = {
        ...form,
        min_threshold: parseInt(form.min_threshold) || 0,
        station_id: parseInt(form.station_id),
        ordered_quantity: form.ordered_quantity ? parseInt(form.ordered_quantity) : 0,
      };
      const part = await api.createPart(payload);
      onAdded(part);
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Add Part</h2>
        {err && <div className="banner banner-error">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Station</label>
            <select value={form.station_id} onChange={set('station_id')} required>
              {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Part Name</label><input value={form.name} onChange={set('name')} placeholder="e.g. Cognex In-Sight 7000" required /></div>
          <div className="form-group"><label>SKU</label><input value={form.sku} onChange={set('sku')} placeholder="e.g. IS7000-01" required /></div>
          <div className="form-group"><label>Supplier</label><input value={form.supplier} onChange={set('supplier')} placeholder="e.g. Cognex Corporation" /></div>
          <div className="form-group">
            <label>Min Threshold</label>
            <div className="threshold-stepper">
              <button type="button" className="threshold-btn" onClick={() => setForm((f) => ({ ...f, min_threshold: String(Math.max(0, parseInt(f.min_threshold || 0) - 1)) }))}>−</button>
              <input type="number" min="0" value={form.min_threshold} onChange={set('min_threshold')} className="threshold-input" />
              <button type="button" className="threshold-btn" onClick={() => setForm((f) => ({ ...f, min_threshold: String(parseInt(f.min_threshold || 0) + 1) }))}>+</button>
            </div>
          </div>
          <div className="form-group">
            <label>Tracking link <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(optional — if already ordered)</span></label>
            <input type="url" value={form.tracking_link} onChange={set('tracking_link')} placeholder="https://track.dhl.com/..." />
          </div>
          {form.tracking_link && (
            <div className="form-group">
              <label>Ordered quantity</label>
              <input type="number" min="1" value={form.ordered_quantity} onChange={set('ordered_quantity')} placeholder="How many units on the way?" required />
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : 'Add Part'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddStationModal({ onClose, onAdded }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (location && !locationConfirmed) {
      setErr('Please select a location from the suggestions list.');
      return;
    }
    setLoading(true); setErr('');
    try {
      const s = await api.createStation({ name, location });
      onAdded(s);
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Add Station</h2>
        {err && <div className="banner banner-error">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-group"><label>Station Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Assembly Line A" required /></div>
          <div className="form-group">
            <label>Location</label>
            <LocationAutocomplete
              value={location}
              onChange={(label, confirmed) => { setLocation(label); setLocationConfirmed(confirmed); }}
              placeholder="Start typing an address…"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : 'Add Station'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddUserModal({ stations, onClose, onAdded }) {
  const [form, setForm] = useState({ email: '', password: '', role: 'delegate', station_id: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const u = await api.createUser({ ...form, station_id: form.station_id ? parseInt(form.station_id) : null });
      onAdded(u);
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Add User</h2>
        {err && <div className="banner banner-error">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={set('email')} placeholder="e.g. j.smith@company.com" required /></div>
          <div className="form-group"><label>Password</label><input type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" required /></div>
          <div className="form-group">
            <label>Role</label>
            <select value={form.role} onChange={set('role')}>
              <option value="delegate">Delegate</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {form.role === 'delegate' && (
            <div className="form-group">
              <label>Station</label>
              <select value={form.station_id} onChange={set('station_id')}>
                <option value="">— none —</option>
                {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : 'Create User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditRecipientModal({ recipient, onClose, onSaved }) {
  const [value, setValue] = useState(recipient.email);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const r = await api.updateAlertRecipient(recipient.id, value);
      onSaved(r);
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Edit Recipient</h2>
        {err && <div className="banner banner-error">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email address</label>
            <input type="email" value={value} onChange={(e) => setValue(e.target.value)} autoFocus required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Pagination ── */

function Pagination({ page, total, limit, onPage }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => onPage(page - 1)} disabled={page <= 1}>← Prev</button>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
        Page {page} of {pages} ({total} parts)
      </span>
      <button className="btn btn-ghost btn-sm" onClick={() => onPage(page + 1)} disabled={page >= pages}>Next →</button>
    </div>
  );
}

/* ── Tab: Parts ── */

const PAGE_LIMIT = 50;

function PartsTab({ stations, filterStation, setFilterStation }) {
  const { showToast } = useToast();
  const [parts, setParts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [detailPart, setDetailPart] = useState(null);

  const loadParts = useCallback(async (p = page, stationId = filterStation) => {
    setLoading(true);
    try {
      const data = await api.getParts({ station_id: stationId || undefined, page: p, limit: PAGE_LIMIT });
      setParts(data.rows);
      setTotal(data.total);
    } catch (e) {
      showToast(`Failed to load parts: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filterStation]);

  useEffect(() => { loadParts(page, filterStation); }, [page, filterStation]);

  function handleFilterChange(val) {
    setFilterStation(val);
    setPage(1);
  }

  function handlePage(p) {
    setPage(p);
  }

  function handleUpdated(partId, newQty) {
    setParts((prev) => prev.map((p) => p.id === partId ? { ...p, quantity: newQty } : p));
  }

  function handleDelivered(partId, newQty, deliveredQty) {
    setParts((prev) => prev.map((p) => p.id === partId
      ? { ...p, quantity: newQty, in_transit: Math.max(0, parseInt(p.in_transit || 0) - deliveredQty) }
      : p
    ));
  }

  async function handleDelete(id) {
    if (!confirm('Delete this part?')) return;
    try {
      await api.deletePart(id);
      setParts((prev) => prev.filter((p) => p.id !== id));
      setTotal((t) => t - 1);
      showToast('Part deleted.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  function handleAdded(part) {
    setParts((prev) => [...prev, { ...part, station_name: stations.find((s) => s.id === part.station_id)?.name }]);
    setTotal((t) => t + 1);
    showToast('Part added.');
  }

  const lowCount = parts.filter((p) => (p.quantity + (parseInt(p.in_transit) || 0)) < p.min_threshold).length;

  if (detailPart) {
    return (
      <PartDetailView
        part={detailPart}
        backLabel="Back to Parts"
        onBack={() => setDetailPart(null)}
        onDelivered={handleDelivered}
      />
    );
  }

  return (
    <>
      <div className="dash-header">
        <div>
          <h1>Parts</h1>
          {lowCount > 0 && <p style={{ fontSize: 13, color: 'var(--color-warning)', marginTop: 4 }}>⚠ {lowCount} below threshold</p>}
        </div>
        <div className="dash-actions">
          <Dropdown
            value={filterStation}
            onChange={handleFilterChange}
            options={[{ value: '', label: 'All stations' }, ...stations.map((s) => ({ value: s.id, label: s.name }))]}
          />
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Part</button>
        </div>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : (
          <PartsTable
            parts={parts}
            onUpdated={handleUpdated}
            onDelete={handleDelete}
            isAdmin={true}
            onViewHistory={(p) => setDetailPart(p)}
            onViewShipments={(p) => setDetailPart(p)}
          />
        )}
      </div>
      <Pagination page={page} total={total} limit={PAGE_LIMIT} onPage={handlePage} />
      {showAdd && <AddPartModal stations={stations} onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
    </>
  );
}

/* ── Tab: Stations ── */

function StationsTab({ stations, onStationsChange, onViewStock }) {
  const { showToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);

  async function handleDelete(id) {
    if (!confirm('Delete this station and ALL its parts?')) return;
    try {
      await api.deleteStation(id);
      onStationsChange(stations.filter((s) => s.id !== id));
      showToast('Station deleted.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  return (
    <>
      <div className="dash-header">
        <h1>Stations</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Station</button>
      </div>
      <div className="card">
        {stations.length === 0 ? (
          <div className="empty">No stations yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Location</th><th>Created</th><th></th><th></th></tr></thead>
              <tbody>
                {stations.map((s) => (
                  <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => onViewStock(s.id)}>
                    <td><strong>{s.name}</strong></td>
                    <td>
                      {s.location
                        ? <a
                            className="location-token"
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >{PIN}&nbsp;{s.location}</a>
                        : <span className="meta">—</span>}
                    </td>
                    <td className="meta">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onViewStock(s.id); }}>
                        View Stock →
                      </button>
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showAdd && <AddStationModal onClose={() => setShowAdd(false)} onAdded={(s) => { onStationsChange([...stations, s]); showToast('Station added.'); }} />}
    </>
  );
}

/* ── Tab: Users ── */

function UsersTab({ stations }) {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.getUsers().then(setUsers).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this user?')) return;
    try {
      await api.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast('User deleted.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  return (
    <>
      <div className="dash-header">
        <h1>Users</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add User</button>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Email</th><th>Role</th><th>Station</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                    <td className="meta">{u.station_name || '—'}</td>
                    <td className="meta">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showAdd && <AddUserModal stations={stations} onClose={() => setShowAdd(false)} onAdded={(u) => { setUsers((prev) => [...prev, u]); showToast('User created.'); }} />}
    </>
  );
}

/* ── Tab: Alerts ── */

function AlertsTab() {
  const { showToast } = useToast();
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.getAlertRecipients().then(setRecipients).finally(() => setLoading(false));
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setErr('');
    setAdding(true);
    try {
      const r = await api.addAlertRecipient(newEmail);
      setRecipients((prev) => [...prev, r]);
      setNewEmail('');
      showToast('Recipient added.');
    } catch (e) { setErr(e.message); }
    finally { setAdding(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this recipient?')) return;
    await api.deleteAlertRecipient(id);
    setRecipients((prev) => prev.filter((x) => x.id !== id));
    showToast('Recipient removed.');
  }

  return (
    <>
      <div className="dash-header">
        <div>
          <h1>Alert Recipients</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            These addresses receive low-stock email alerts.
          </p>
        </div>
      </div>

      {err && <div className="banner banner-error">{err}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, padding: '14px 16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Add recipient</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="e.g. manager@company.com"
              required
            />
          </div>
          <button className="btn btn-primary" disabled={adding}>
            {adding ? <span className="spinner" /> : '+ Add'}
          </button>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : recipients.length === 0 ? (
          <div className="empty">No recipients configured. Alerts will not be sent.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Email address</th><th>Added</th><th></th></tr></thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.id}>
                    <td><span className="recipient-chip">{r.email}</span></td>
                    <td className="meta">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(r)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EditRecipientModal
          recipient={editing}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            setRecipients((prev) => prev.map((x) => x.id === r.id ? r : x));
            setEditing(null);
            showToast('Recipient updated.');
          }}
        />
      )}
    </>
  );
}

/* ── Admin Dashboard root ── */

const TABS = ['Parts', 'Stations', 'Users', 'Alerts'];

export default function AdminDashboard() {
  const { showToast } = useToast();
  const [tab, setTab] = useState('Parts');
  const [filterStation, setFilterStation] = useState('');
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    api.getStations()
      .then(setStations)
      .catch((e) => showToast(`Failed to load stations: ${e.message}`, 'error'))
      .finally(() => setLoadingStations(false));
  }, []);

  function handleViewStock(stationId) {
    setFilterStation(String(stationId));
    setTab('Parts');
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await api.checkStock();
      showToast('Stock check triggered successfully.');
    } catch (e) {
      showToast(`Sync failed: ${e.message}`, 'error');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="page">
      <Navbar onLogoClick={() => setTab('Parts')} />
      <div className="container" style={{ paddingTop: 24 }}>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={handleSync} disabled={syncing}>
            {syncing ? <><span className="spinner" style={{ width: 13, height: 13 }} />&nbsp;Syncing…</> : '↻ Sync with the database'}
          </button>
        </div>

        <div className="tabs">
          {TABS.map((t) => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {loadingStations ? (
          <div className="empty"><span className="spinner" /></div>
        ) : (
          <>
            {tab === 'Parts' && <PartsTab stations={stations} filterStation={filterStation} setFilterStation={setFilterStation} />}
            {tab === 'Stations' && <StationsTab stations={stations} onStationsChange={setStations} onViewStock={handleViewStock} />}
            {tab === 'Users' && <UsersTab stations={stations} />}
            {tab === 'Alerts' && <AlertsTab />}
          </>
        )}
      </div>
    </div>
  );
}
