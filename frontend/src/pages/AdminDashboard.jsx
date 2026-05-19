import React, { useEffect, useState, useCallback, useRef } from 'react';
import Navbar from '../components/Navbar.jsx';
import PartsTable from '../components/PartsTable.jsx';
import LocationAutocomplete from '../components/LocationAutocomplete.jsx';
import { api } from '../api/client.js';

const PIN = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
  </svg>
);

/* ── Custom Dropdown ── */

function Dropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div className="custom-dropdown" ref={ref}>
      <button
        type="button"
        className="custom-dropdown-trigger"
        onClick={() => setOpen((o) => !o)}
      >
        <span>{selected ? selected.label : options[0]?.label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="custom-dropdown-menu">
          {options.map((o) => (
            <div
              key={o.value}
              className={`custom-dropdown-item${String(o.value) === String(value) ? ' active' : ''}`}
              onMouseDown={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Modals ── */

function AddPartModal({ stations, onClose, onAdded }) {
  const [form, setForm] = useState({ station_id: stations[0]?.id || '', name: '', sku: '', supplier: '', min_threshold: '5' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const part = await api.createPart({ ...form, min_threshold: parseInt(form.min_threshold) || 0, station_id: parseInt(form.station_id) });
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

/* ── Tab: Parts ── */

function PartsTab({ parts, stations, onPartsChange, filterStation, setFilterStation }) {
  const [showAdd, setShowAdd] = useState(false);
  const [flash, setFlash] = useState('');

  const filtered = filterStation ? parts.filter((p) => p.station_id === parseInt(filterStation)) : parts;
  const lowCount = filtered.filter((p) => p.quantity < p.min_threshold).length;

  function handleUpdated(partId, newQty) {
    onPartsChange(parts.map((p) => p.id === partId ? { ...p, quantity: newQty } : p));
  }

  async function handleDelete(id) {
    if (!confirm('Delete this part?')) return;
    try {
      await api.deletePart(id);
      onPartsChange(parts.filter((p) => p.id !== id));
      setFlash('Part deleted.');
      setTimeout(() => setFlash(''), 3000);
    } catch (e) { alert(e.message); }
  }

  function handleAdded(part) {
    // reload from server would be cleaner, but optimistic update works too
    onPartsChange([...parts, { ...part, station_name: stations.find((s) => s.id === part.station_id)?.name }]);
    setFlash('Part added.');
    setTimeout(() => setFlash(''), 3000);
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
            onChange={setFilterStation}
            options={[{ value: '', label: 'All stations' }, ...stations.map((s) => ({ value: s.id, label: s.name }))]}
          />
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Part</button>
        </div>
      </div>
      {flash && <div className="banner banner-success">{flash}</div>}
      <div className="card">
        <PartsTable parts={filtered} onUpdated={handleUpdated} onDelete={handleDelete} isAdmin={true} />
      </div>
      {showAdd && <AddPartModal stations={stations} onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
    </>
  );
}

/* ── Tab: Stations ── */

function StationsTab({ stations, onStationsChange, onViewStock }) {
  const [showAdd, setShowAdd] = useState(false);
  const [flash, setFlash] = useState('');

  async function handleDelete(id) {
    if (!confirm('Delete this station and ALL its parts?')) return;
    try {
      await api.deleteStation(id);
      onStationsChange(stations.filter((s) => s.id !== id));
      setFlash('Station deleted.');
      setTimeout(() => setFlash(''), 3000);
    } catch (e) { alert(e.message); }
  }

  return (
    <>
      <div className="dash-header">
        <h1>Stations</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Station</button>
      </div>
      {flash && <div className="banner banner-success">{flash}</div>}
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
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); onViewStock(s.id); }}
                      >
                        View Stock →
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                      >
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
      {showAdd && <AddStationModal onClose={() => setShowAdd(false)} onAdded={(s) => { onStationsChange([...stations, s]); setFlash('Station added.'); setTimeout(() => setFlash(''), 3000); }} />}
    </>
  );
}

/* ── Tab: Users ── */

function UsersTab({ stations }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    api.getUsers().then(setUsers).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this user?')) return;
    try {
      await api.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setFlash('User deleted.');
      setTimeout(() => setFlash(''), 3000);
    } catch (e) { alert(e.message); }
  }

  return (
    <>
      <div className="dash-header">
        <h1>Users</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add User</button>
      </div>
      {flash && <div className="banner banner-success">{flash}</div>}
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
      {showAdd && <AddUserModal stations={stations} onClose={() => setShowAdd(false)} onAdded={(u) => { setUsers((prev) => [...prev, u]); setFlash('User created.'); setTimeout(() => setFlash(''), 3000); }} />}
    </>
  );
}

/* ── Tab: Audit Log ── */

function AuditTab() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const load = useCallback(async (off = 0) => {
    setLoading(true);
    try {
      const data = await api.getAuditLog(LIMIT, off);
      setLog(data);
      setOffset(off);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(0); }, [load]);

  return (
    <>
      <div className="dash-header">
        <h1>Audit Log</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => load(offset)}>↻ Refresh</button>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : log.length === 0 ? (
          <div className="empty">No audit entries yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Part</th>
                  <th>Station</th>
                  <th>Old</th>
                  <th>New</th>
                  <th>Δ</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {log.map((e) => (
                  <tr key={e.id}>
                    <td className="meta" style={{ whiteSpace: 'nowrap' }}>{new Date(e.created_at).toLocaleString()}</td>
                    <td className="meta">{e.user_email || '—'}</td>
                    <td>
                      <span className="part-name" style={{ fontSize: 13 }}>{e.part_name || '—'}</span>
                      {e.sku && <> <span className="sku-badge">{e.sku}</span></>}
                    </td>
                    <td className="meta">{e.station_name || '—'}</td>
                    <td style={{ textAlign: 'center' }}>{e.old_quantity}</td>
                    <td style={{ textAlign: 'center' }}>{e.new_quantity}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: e.delta > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {e.delta > 0 ? `+${e.delta}` : e.delta}
                    </td>
                    <td className="meta">{e.note || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
          <button className="btn btn-ghost btn-sm" disabled={offset === 0} onClick={() => load(Math.max(0, offset - LIMIT))}>← Prev</button>
          <button className="btn btn-ghost btn-sm" disabled={log.length < LIMIT} onClick={() => load(offset + LIMIT)}>Next →</button>
        </div>
      </div>
    </>
  );
}

/* ── Admin Dashboard root ── */

const TABS = ['Parts', 'Stations', 'Users', 'Audit Log'];

export default function AdminDashboard() {
  const [tab, setTab] = useState('Parts');
  const [filterStation, setFilterStation] = useState('');
  const [parts, setParts] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null); // { msg, type, leaving }
  const toastLeaveTimer = useRef(null);
  const toastRemoveTimer = useRef(null);

  function clearToastTimers() {
    clearTimeout(toastLeaveTimer.current);
    clearTimeout(toastRemoveTimer.current);
  }

  function showToast(msg, type = 'success') {
    clearToastTimers();
    setToast({ msg, type, leaving: false });
    toastLeaveTimer.current  = setTimeout(() => setToast((t) => t ? { ...t, leaving: true } : null), 4500);
    toastRemoveTimer.current = setTimeout(() => setToast(null), 5000);
  }

  function dismissToast() {
    clearToastTimers();
    setToast((t) => t ? { ...t, leaving: true } : null);
    toastRemoveTimer.current = setTimeout(() => setToast(null), 500);
  }

  function handleViewStock(stationId) {
    setFilterStation(String(stationId));
    setTab('Parts');
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([api.getParts(), api.getStations()]);
      setParts(p);
      setStations(s);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSync() {
    setSyncing(true);
    try {
      await Promise.all([load(), api.checkStock()]);
      showToast('Inventory synced and stock levels checked.');
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

        {/* Toolbar */}
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

        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : (
          <>
            {tab === 'Parts' && <PartsTab parts={parts} stations={stations} onPartsChange={setParts} filterStation={filterStation} setFilterStation={setFilterStation} />}
            {tab === 'Stations' && <StationsTab stations={stations} onStationsChange={setStations} onViewStock={handleViewStock} />}
            {tab === 'Users' && <UsersTab stations={stations} />}
            {tab === 'Audit Log' && <AuditTab />}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}${toast.leaving ? ' toast-leave' : ''}`}>
          <span>{toast.msg}</span>
          <button className="toast-close" onClick={dismissToast}>✕</button>
        </div>
      )}
    </div>
  );
}
