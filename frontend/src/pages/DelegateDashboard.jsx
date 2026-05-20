import React, { useEffect, useState, useCallback, useRef } from 'react';
import Navbar from '../components/Navbar.jsx';
import PartsTable from '../components/PartsTable.jsx';
import { api } from '../api/client.js';

/* ── Part Detail view (unified history + shipments) ── */

const DETAIL_FILTERS = [
  { value: 'all', label: 'All events' },
  { value: 'shipment', label: 'Deliveries' },
  { value: 'quantity_change', label: 'Qty adjustments' },
];

function Dropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

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
        <span>{selected?.label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="custom-dropdown-menu">
          {options.map((o) => (
            <div key={o.value} className={`custom-dropdown-item${o.value === value ? ' active' : ''}`}
              onMouseDown={() => { onChange(o.value); setOpen(false); }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PartDetailView({ part, onBack, onDelivered }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [delivering, setDelivering] = useState(null);

  useEffect(() => {
    api.getPartHistory(part.id).then(setEvents).finally(() => setLoading(false));
  }, [part.id]);

  async function handleDeliver(e) {
    setDelivering(e.shipment_id);
    try {
      const result = await api.deliverShipment(part.id, e.shipment_id);
      setEvents((prev) => prev.map((ev) =>
        ev.shipment_id === e.shipment_id
          ? { ...ev, status: 'delivered', delivered_at: new Date().toISOString() }
          : ev
      ));
      onDelivered(part.id, result.new_quantity, e.quantity);
    } catch (err) { alert(err.message); }
    finally { setDelivering(null); }
  }

  const visible = filter === 'all' ? events : events.filter((e) => e.type === filter);

  return (
    <>
      <button className="back-arrow" onClick={onBack}>← Back to My Station</button>
      <div className="dash-header" style={{ marginTop: 8 }}>
        <div>
          <h1>{part.name}</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            <span className="sku-badge">{part.sku}</span>
          </p>
        </div>
        <Dropdown value={filter} onChange={setFilter} options={DETAIL_FILTERS} />
      </div>
      <div className="card">
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : visible.length === 0 ? (
          <div className="empty">No events yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Time</th><th>Event</th><th>User</th><th>Details</th><th></th></tr>
              </thead>
              <tbody>
                {visible.map((e, i) => (
                  <tr key={i}>
                    <td className="meta" style={{ whiteSpace: 'nowrap' }}>{new Date(e.at).toLocaleString()}</td>
                    <td>
                      {e.type === 'quantity_change' ? (
                        <span className="badge" style={{ background: e.delta > 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', color: e.delta > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          Qty {e.delta > 0 ? `+${e.delta}` : e.delta}
                        </span>
                      ) : (
                        <span className={`badge badge-${e.status === 'delivered' ? 'admin' : 'delegate'}`}>
                          {e.status === 'delivered' ? 'Delivered' : 'In transit'}
                        </span>
                      )}
                    </td>
                    <td className="meta">{e.user_email || e.created_by_email || '—'}</td>
                    <td className="meta">
                      {e.type === 'quantity_change' ? (
                        <>{e.old_quantity} → {e.new_quantity}{e.note ? ` · ${e.note}` : ''}</>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{e.quantity} units</span>
                          {e.tracking_link && <a href={e.tracking_link} target="_blank" rel="noopener noreferrer" className="tracking-link">Track →</a>}
                          {e.status === 'delivered' && e.delivered_at && <span className="meta">{new Date(e.delivered_at).toLocaleDateString()}</span>}
                        </div>
                      )}
                    </td>
                    <td>
                      {e.type === 'shipment' && e.status === 'pending' && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleDeliver(e)} disabled={delivering === e.shipment_id}>
                          {delivering === e.shipment_id ? <span className="spinner" /> : 'Mark Delivered'}
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

/* ── Delegate Dashboard ── */

export default function DelegateDashboard() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailPart, setDetailPart] = useState(null);

  const loadParts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getParts();
      setParts(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadParts(); }, [loadParts]);

  function handleUpdated(partId, newQty) {
    setParts((prev) => prev.map((p) => p.id === partId ? { ...p, quantity: newQty } : p));
  }

  function handleDelivered(partId, newQty, deliveredQty) {
    setParts((prev) => prev.map((p) => p.id === partId
      ? { ...p, quantity: newQty, in_transit: Math.max(0, parseInt(p.in_transit || 0) - deliveredQty) }
      : p
    ));
  }

  const lowCount = parts.filter((p) => (p.quantity + (parseInt(p.in_transit) || 0)) < p.min_threshold).length;

  if (detailPart) {
    return (
      <div className="page">
        <Navbar />
        <div className="container" style={{ paddingTop: 24 }}>
          <PartDetailView part={detailPart} onBack={() => setDetailPart(null)} onDelivered={handleDelivered} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar />
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="dash-header">
          <div>
            <h1>My Station</h1>
            {lowCount > 0 && (
              <p style={{ fontSize: 13, color: 'var(--color-warning)', marginTop: 4 }}>
                ⚠ {lowCount} part{lowCount > 1 ? 's' : ''} below minimum threshold
              </p>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={loadParts}>↻ Refresh</button>
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        <div className="card">
          {loading ? (
            <div className="empty"><span className="spinner" /></div>
          ) : (
            <PartsTable
              parts={parts}
              onUpdated={handleUpdated}
              onDelete={() => {}}
              isAdmin={false}
              onViewHistory={(p) => setDetailPart(p)}
              onViewShipments={(p) => setDetailPart(p)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
