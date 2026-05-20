import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar.jsx';
import PartsTable from '../components/PartsTable.jsx';
import PartDetailView from '../components/PartDetailView.jsx';
import { api } from '../api/client.js';

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
      setParts(data.rows);
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
          <PartDetailView
            part={detailPart}
            backLabel="Back to My Station"
            onBack={() => setDetailPart(null)}
            onDelivered={handleDelivered}
          />
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
