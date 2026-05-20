import React, { useEffect, useState } from 'react';
import Dropdown from './Dropdown.jsx';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

const DETAIL_FILTERS = [
  { value: 'all', label: 'All events' },
  { value: 'shipment', label: 'Deliveries' },
  { value: 'quantity_change', label: 'Qty adjustments' },
];

export default function PartDetailView({ part, backLabel = 'Back', onBack, onDelivered }) {
  const { showToast } = useToast();
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
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDelivering(null);
    }
  }

  const visible = filter === 'all' ? events : events.filter((e) => e.type === filter);

  return (
    <>
      <button className="back-arrow" onClick={onBack}>← {backLabel}</button>
      <div className="dash-header" style={{ marginTop: 8 }}>
        <div>
          <h1>{part.name}</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            <span className="sku-badge">{part.sku}</span>&nbsp;·&nbsp;{part.station_name}
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
                          {e.tracking_link && (
                            <a href={e.tracking_link} target="_blank" rel="noopener noreferrer" className="tracking-link">Track →</a>
                          )}
                          {e.status === 'delivered' && e.delivered_at && (
                            <span className="meta">{new Date(e.delivered_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {e.type === 'shipment' && e.status === 'pending' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleDeliver(e)}
                          disabled={delivering === e.shipment_id}
                        >
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
