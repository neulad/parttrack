import React, { useState } from 'react';
import { api } from '../api/client.js';

function QuantityControl({ part, onUpdated }) {
  const [mode, setMode] = useState('stepper'); // 'stepper' | 'exact'
  const [delta, setDelta] = useState(0);
  const [exact, setExact] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const currentQty = part.quantity;
  const previewQty = mode === 'stepper' ? currentQty + delta : (exact === '' ? currentQty : parseInt(exact));

  async function confirm() {
    const newQty = mode === 'stepper' ? currentQty + delta : parseInt(exact);
    if (isNaN(newQty) || newQty < 0) { setErr('Invalid quantity'); return; }
    if (newQty === currentQty) { setDelta(0); setExact(''); return; }
    setSaving(true);
    setErr('');
    try {
      await api.updateQuantity(part.id, newQty);
      onUpdated(part.id, newQty);
      setDelta(0);
      setExact('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const changed = mode === 'stepper' ? delta !== 0 : (exact !== '' && parseInt(exact) !== currentQty);

  function reset() { setDelta(0); setExact(''); setErr(''); }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="qty-control" style={{ flexWrap: 'nowrap' }}>

        {/* Input area — fixed width so confirm buttons never shift it */}
        <div style={{ width: 110, flexShrink: 0 }}>
          {mode === 'stepper' ? (
            <div className="qty-stepper">
              <button className="stepper-btn" onClick={() => setDelta((d) => d - 1)}>−</button>
              <span className={`stepper-delta ${delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : ''}`}>
                {delta > 0 ? `+${delta}` : delta}
              </span>
              <button className="stepper-btn" onClick={() => setDelta((d) => d + 1)}>+</button>
            </div>
          ) : (
            <input
              className="qty-exact-input"
              type="number"
              min="0"
              placeholder={String(currentQty)}
              value={exact}
              onChange={(e) => setExact(e.target.value)}
              style={{ width: '100%' }}
            />
          )}
        </div>

        {/* Preview + action buttons — always in DOM, hidden when unchanged */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, visibility: changed ? 'visible' : 'hidden' }}>
          <span className="qty-preview">→ {previewQty}</span>
          <button className="btn btn-primary btn-sm" onClick={confirm} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Confirm'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={reset}>✕</button>
        </div>

      </div>

      <button className="qty-mode-toggle" onClick={() => { setMode(mode === 'stepper' ? 'exact' : 'stepper'); reset(); }}>
        {mode === 'stepper' ? 'enter exact value' : 'use stepper'}
      </button>

      {err && <span style={{ fontSize: 11, color: 'var(--color-danger)' }}>{err}</span>}
    </div>
  );
}

export default function PartsTable({ parts, onUpdated, onDelete, isAdmin }) {
  if (!parts.length) {
    return <div className="empty">No parts found.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {isAdmin && <th>Station</th>}
            <th>Part</th>
            <th>SKU</th>
            <th>Supplier</th>
            <th>Min</th>
            <th>Qty</th>
            <th>Adjust</th>
            {isAdmin && <th></th>}
          </tr>
        </thead>
        <tbody>
          {parts.map((p) => {
            const isLow = p.quantity < p.min_threshold;
            return (
              <tr key={p.id} className={isLow ? 'low-stock' : ''}>
                {isAdmin && <td className="meta">{p.station_name}</td>}
                <td>
                  <div className="part-name">{p.name}</div>
                </td>
                <td><span className="sku-badge">{p.sku}</span></td>
                <td className="meta">{p.supplier || '—'}</td>
                <td className="meta">{p.min_threshold}</td>
                <td>
                  <span className={`qty-value ${isLow ? 'qty-low' : 'qty-ok'}`}>
                    {p.quantity}
                    {isLow && ' ⚠'}
                  </span>
                </td>
                <td>
                  <QuantityControl part={p} onUpdated={onUpdated} />
                </td>
                {isAdmin && (
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onDelete(p.id)}
                      title="Delete part"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
