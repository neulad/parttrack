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

  function reset() { setMode('stepper'); setDelta(0); setExact(''); setErr(''); }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="qty-control" style={{ flexWrap: 'nowrap' }}>

        {/* Input area — fixed width so confirm buttons never shift it */}
        <div style={{ width: 190, flexShrink: 0 }}>
          {mode === 'stepper' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="qty-stepper">
                <button type="button" className="stepper-btn" onClick={() => setDelta((d) => d - 1)}>−</button>
                <span className={`stepper-delta ${delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : ''}`}>
                  {delta > 0 ? `+${delta}` : delta}
                </span>
                <button type="button" className="stepper-btn" onClick={() => setDelta((d) => d + 1)}>+</button>
              </div>
              <button type="button" className="qty-switch-btn" onClick={() => { setMode('exact'); setDelta(0); setErr(''); setExact(String(currentQty)); }}>
                Exact value
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                className="qty-exact-input"
                type="number"
                min="0"
                value={exact}
                onChange={(e) => setExact(e.target.value)}
                autoFocus
                style={{ width: 96 }}
              />
              <button type="button" className="qty-switch-btn" onClick={() => { setMode('stepper'); reset(); }}>
                Use stepper
              </button>
            </div>
          )}
        </div>

        {/* Preview + action buttons — always in DOM, hidden when unchanged */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, visibility: changed ? 'visible' : 'hidden' }}>
          <span className="qty-preview">→ {previewQty}</span>
          <button type="button" className="btn btn-primary btn-sm" onClick={confirm} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Confirm'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>✕</button>
        </div>

      </div>

      {err && <span style={{ fontSize: 11, color: 'var(--color-danger)' }}>{err}</span>}
    </div>
  );
}

function stockStatus(quantity, min) {
  if (quantity === 0)        return { label: 'Out of stock — immediate reorder required',      color: 'var(--color-danger)' };
  if (quantity < min)        return { label: 'Below minimum threshold — reorder recommended',   color: 'var(--color-warning)' };
  if (quantity === min)      return { label: 'At minimum threshold — consider restocking',      color: 'var(--color-warning)' };
  return                            { label: 'Stock level adequate',                            color: 'var(--color-success)' };
}

function QtyTooltip({ quantity, min }) {
  const { label, color } = stockStatus(quantity, min);
  return (
    <span className="qty-tooltip-wrap">
      <span className={`qty-value ${quantity < min ? 'qty-low' : 'qty-ok'}`}>
        {quantity}
        {quantity < min && ' ⚠'}
      </span>
      <span className="qty-tooltip">
        <span className="qty-tooltip-dot" style={{ background: color }} />
        {label}
      </span>
    </span>
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
                  <QtyTooltip quantity={p.quantity} min={p.min_threshold} />
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
