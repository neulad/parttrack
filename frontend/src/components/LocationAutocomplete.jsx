import React, { useState, useEffect, useRef } from 'react';

export const PIN = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
  </svg>
);

function useDebounce(value, delay) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

// Format a Nominatim address object → "Country, City, LastWordStreet, HouseNum"
function formatAddress(addr) {
  const country = addr.country;
  const city    = addr.city || addr.town || addr.village || addr.municipality || addr.county;
  const road    = addr.road || addr.street || addr.pedestrian || addr.footway;
  const street  = road ? road.split(' ').pop() : null;
  const num     = addr.house_number;
  const streetWithNum = [street, num].filter(Boolean).join(' ');
  return [country, city, streetWithNum].filter(Boolean).join(', ');
}

export default function LocationAutocomplete({
  value,
  onChange,          // (label: string, confirmed: bool) => void
  placeholder = 'Start typing an address…',
}) {
  const [inputText,   setInputText]   = useState(value || '');
  const [confirmed,   setConfirmed]   = useState(false);
  const [suggestions, setSuggestions] = useState([]); // [{ label, full }]
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const wrapRef       = useRef(null);
  const debounced     = useDebounce(inputText, 350);

  // Fetch from Nominatim
  useEffect(() => {
    if (confirmed || debounced.length < 2) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debounced)}&format=json&limit=5&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
      .then((r) => r.json())
      .then((results) => {
        const items = results.map((r) => ({
          label: formatAddress(r.address),  // short formatted label
          full:  r.display_name,            // shown in dropdown for context
        })).filter((r) => r.label);
        setSuggestions(items);
        setOpen(items.length > 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debounced, confirmed]);

  // Close on outside click
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function select(item) {
    setInputText(item.label);
    setConfirmed(true);
    setSuggestions([]);
    setOpen(false);
    onChange(item.label, true);
  }

  function handleType(e) {
    const v = e.target.value;
    setInputText(v);
    setConfirmed(false);
    onChange(v, false);
  }

  function clear() {
    setInputText('');
    setConfirmed(false);
    setSuggestions([]);
    setOpen(false);
    onChange('', false);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {confirmed ? (
        <div className="location-chip">
          {PIN}
          <span className="location-chip-text">{inputText}</span>
          <button type="button" className="location-chip-clear" onClick={clear} title="Change">×</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            value={inputText}
            onChange={handleType}
            onFocus={() => suggestions.length && setOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
          />
          {loading && (
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <span className="spinner" style={{ width: 14, height: 14 }} />
            </span>
          )}
        </div>
      )}

      {open && suggestions.length > 0 && !confirmed && (
        <ul className="location-dropdown">
          {suggestions.map((s, i) => (
            <li key={i} className="location-dropdown-item" onMouseDown={() => select(s)}>
              <span className="location-dropdown-label">{s.label}</span>
              <span className="location-dropdown-full">{s.full}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
