import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar.jsx';
import PartsTable from '../components/PartsTable.jsx';
import { api } from '../api/client.js';

/* ── Part History view ── */

function PartHistoryView({ part, onBack }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPartHistory(part.id).then(setHistory).finally(() => setLoading(false));
  }, [part.id]);

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
      <button className="back-arrow" onClick={onBack}>← Back to My Station</button>
      <div className="dash-header" style={{ marginTop: 8 }}>
        <div>
          <h1>Shipments in Transit</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            {part.name} · <span className="sku-badge">{part.sku}</span>
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

/* ── Delegate Dashboard ── */

export default function DelegateDashboard() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailView, setDetailView] = useState(null);

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

  function handleDelivered(partId, newQty) {
    setParts((prev) => prev.map((p) => p.id === partId
      ? { ...p, quantity: newQty, in_transit: Math.max(0, parseInt(p.in_transit || 0) - 1) }
      : p
    ));
    setDetailView(null);
  }

  const lowCount = parts.filter((p) => p.quantity < p.min_threshold).length;

  if (detailView?.type === 'history') {
    return (
      <div className="page">
        <Navbar />
        <div className="container" style={{ paddingTop: 24 }}>
          <PartHistoryView part={detailView.part} onBack={() => setDetailView(null)} />
        </div>
      </div>
    );
  }

  if (detailView?.type === 'shipments') {
    return (
      <div className="page">
        <Navbar />
        <div className="container" style={{ paddingTop: 24 }}>
          <ShipmentsView part={detailView.part} onBack={() => setDetailView(null)} onDelivered={handleDelivered} />
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
              onViewHistory={(p) => setDetailView({ type: 'history', part: p })}
              onViewShipments={(p) => setDetailView({ type: 'shipments', part: p })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
