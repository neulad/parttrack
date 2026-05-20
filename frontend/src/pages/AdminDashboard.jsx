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
      <button type="button" className="custom-dropdown-trigger" onClick={() => setOpen((o) => !o)}>
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

/* ── Part History view ── */

function PartHistoryView({ part, onBack }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPartHistory(part.id).then(setHistory).finally(() => setLoading(false));
  }, [part.id]);

  return (
    <>
      <button className="back-arrow" onClick={onBack}>← Back to Parts</button>
      <div className="dash-header" style={{ marginTop: 8 }}>
        <div>
          <h1>{part.name}</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            <span className="sku-badge">{part.sku}</span>&nbsp; {part.station_name}
          </p>
        </div>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : history.length === 0 ? (
          <div className="empty">No activity yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Time</th><th>Event</th><th>User</th><th>Details</th></tr>
              </thead>
              <tbody>
                {history.map((e, i) => (
                  <tr key={i}>
                    <td className="meta" style={{ whiteSpace: 'nowrap' }}>{new Date(e.at).toLocaleString()}</td>
                    <td>
                      {e.type === 'quantity_change' ? (
                        <span className="badge" style={{ background: e.delta > 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', color: e.delta > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          Qty {e.delta > 0 ? `+${e.delta}` : e.delta}
                        </span>
                      ) : (
                        <span className={`badge badge-${e.status === 'delivered' ? 'admin' : 'delegate'}`}>
                          {e.status === 'delivered' ? 'Delivered' : 'Ordered'}
                        </span>
                      )}
                    </td>
                    <td className="meta">{e.user_email || e.created_by_email || '—'}</td>
                    <td className="meta">
                      {e.type === 'quantity_change' ? (
                        <>{e.old_quantity} → {e.new_quantity}{e.note ? ` · ${e.note}` : ''}</>
                      ) : (
                        <>{e.quantity} units{e.tracking_link ? <> · <a href={e.tracking_link} target="_blank" rel="noopener noreferrer" className="tracking-link">Track →</a></> : ''}</>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Shipments view ── */

function ShipmentsView({ part, onBack, onDelivered }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState(null);

  useEffect(() => {
    api.getShipments(part.id).then(setShipments).finally(() => setLoading(false));
  }, [part.id]);

  async function handleDeliver(shipment) {
    setDelivering(shipment.id);
    try {
      const result = await api.deliverShipment(part.id, shipment.id);
      setShipments((prev) => prev.map((s) => s.id === shipment.id ? { ...s, status: 'delivered', delivered_at: new Date().toISOString() } : s));
      onDelivered(part.id, result.new_quantity);
    } catch (e) { alert(e.message); }
    finally { setDelivering(null); }
  }

  return (
    <>
      <button className="back-arrow" onClick={onBack}>← Back to Parts</button>
      <div className="dash-header" style={{ marginTop: 8 }}>
        <div>
          <h1>Shipments in Transit</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            {part.name} · <span className="sku-badge">{part.sku}</span> · {part.station_name}
          </p>
        </div>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : shipments.length === 0 ? (
          <div className="empty">No shipments found.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Qty</th><th>Ordered by</th><th>Tracking</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id}>
                    <td className="meta" style={{ whiteSpace: 'nowrap' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>{s.quantity}</td>
                    <td className="meta">{s.created_by_email || '—'}</td>
                    <td>
                      {s.tracking_link
                        ? <a href={s.tracking_link} target="_blank" rel="noopener noreferrer" className="tracking-link">Track →</a>
                        : <span className="meta">—</span>}
                    </td>
                    <td>
                      <span className={`badge badge-${s.status === 'delivered' ? 'admin' : 'delegate'}`}>
                        {s.status === 'delivered' ? `Delivered ${new Date(s.delivered_at).toLocaleDateString()}` : 'In transit'}
                      </span>
                    </td>
                    <td>
                      {s.status === 'pending' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleDeliver(s)}
                          disabled={delivering === s.id}
                        >
                          {delivering === s.id ? <span className="spinner" /> : 'Mark Delivered'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Tab: Parts ── */

function PartsTab({ parts, stations, onPartsChange, filterStation, setFilterStation }) {
  const [showAdd, setShowAdd] = useState(false);
  const [flash, setFlash] = useState('');
  const [detailView, setDetailView] = useState(null); // { type: 'history'|'shipments', part }

  const filtered = filterStation ? parts.filter((p) => p.station_id === parseInt(filterStation)) : parts;
  const lowCount = filtered.filter((p) => p.quantity < p.min_threshold).length;

  function handleUpdated(partId, newQty) {
    onPartsChange(parts.map((p) => p.id === partId ? { ...p, quantity: newQty } : p));
  }

  function handleDelivered(partId, newQty) {
    onPartsChange(parts.map((p) => p.id === partId
      ? { ...p, quantity: newQty, in_transit: Math.max(0, parseInt(p.in_transit || 0) - 1) }
      : p
    ));
    setDetailView(null);
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
    onPartsChange([...parts, { ...part, station_name: stations.find((s) => s.id === part.station_id)?.name }]);
    setFlash('Part added.');
    setTimeout(() => setFlash(''), 3000);
  }

  if (detailView?.type === 'history') {
    return <PartHistoryView part={detailView.part} onBack={() => setDetailView(null)} />;
  }
  if (detailView?.type === 'shipments') {
    return <ShipmentsView part={detailView.part} onBack={() => setDetailView(null)} onDelivered={handleDelivered} />;
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
        <PartsTable
          parts={filtered}
          onUpdated={handleUpdated}
          onDelete={handleDelete}
          isAdmin={true}
          onViewHistory={(p) => setDetailView({ type: 'history', part: p })}
          onViewShipments={(p) => setDetailView({ type: 'shipments', part: p })}
        />
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

/* ── Tab: Alerts ── */

function AlertsTab({ showToast }) {
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
  const [tab, setTab] = useState('Parts');
  const [filterStation, setFilterStation] = useState('');
  const [parts, setParts] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
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
            {tab === 'Alerts' && <AlertsTab showToast={showToast} />}
          </>
        )}
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}${toast.leaving ? ' toast-leave' : ''}`}>
          <span>{toast.msg}</span>
          <button className="toast-close" onClick={dismissToast}>✕</button>
        </div>
      )}
    </div>
  );
}
