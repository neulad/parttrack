import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { api } from '../api/client.js';

const PIN = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
  </svg>
);

function InfoRow({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  );
}

export default function OrderPage() {
  const navigate = useNavigate();
  const partId = new URLSearchParams(window.location.search).get('part_id');

  const [part, setPart] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitErr, setSubmitErr] = useState('');
  const [quantity, setQuantity] = useState('');
  const [trackingLink, setTrackingLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!partId) { setLoadErr('No part specified in the URL.'); setLoading(false); return; }
    api.getPart(partId)
      .then(setPart)
      .catch((e) => setLoadErr(`Failed to load part: ${e.message}`))
      .finally(() => setLoading(false));
  }, [partId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitErr('');
    setSubmitting(true);
    try {
      await api.createShipment(partId, { quantity: parseInt(quantity), tracking_link: trackingLink || undefined });
      setDone(true);
    } catch (e) {
      setSubmitErr(`Could not log shipment: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <Navbar />
      <div className="container" style={{ paddingTop: 24, maxWidth: 640 }}>

        <button className="back-arrow" onClick={() => navigate('/')}>
          ← Back to Parts
        </button>

        {loading && <div className="empty"><span className="spinner" /></div>}
        {loadErr && <div className="banner banner-error" style={{ marginTop: 12 }}>{loadErr}</div>}

        {part && !done && (
          <>
            <div className="dash-header" style={{ marginTop: 8 }}>
              <div>
                <h1>Log Shipment</h1>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  Record how many units were ordered and add a tracking link.
                </p>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                <InfoRow label="Part"><div style={{ fontWeight: 600 }}>{part.name}</div></InfoRow>
                <InfoRow label="SKU"><span className="sku-badge">{part.sku}</span></InfoRow>
                {part.supplier && <InfoRow label="Supplier"><div>{part.supplier}</div></InfoRow>}
                <InfoRow label="Min threshold"><div>{part.min_threshold}</div></InfoRow>
                <InfoRow label="Station" ><div style={{ fontWeight: 500, gridColumn: '1 / -1' }}>{part.station_name}</div></InfoRow>
                {part.station_location && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Address</div>
                    <a
                      className="location-token"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(part.station_location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {PIN}&nbsp;{part.station_location}
                    </a>
                  </div>
                )}
                <InfoRow label="Current stock">
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: part.quantity < part.min_threshold ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>
                    {part.quantity}
                    {part.quantity < part.min_threshold && <span style={{ fontSize: 13 }}>⚠</span>}
                  </div>
                </InfoRow>
                {parseInt(part.in_transit) > 0 && (
                  <InfoRow label="Already in transit">
                    <div style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{part.in_transit}</div>
                  </InfoRow>
                )}
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              {submitErr && <div className="banner banner-error" style={{ marginBottom: 16 }}>{submitErr}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Quantity ordered</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 10"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Tracking link <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(optional)</span></label>
                  <input
                    type="url"
                    value={trackingLink}
                    onChange={(e) => setTrackingLink(e.target.value)}
                    placeholder="e.g. https://track.dhl.com/..."
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <span className="spinner" /> : 'Log Shipment'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {done && (
          <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <h2 style={{ marginBottom: 8 }}>Shipment logged</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20 }}>
              {quantity} × {part.name} is now tracked as in transit.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Back to Parts
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
