import React, { useState, useEffect, useRef } from 'react';

const PIN = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
  </svg>
);

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function LocationAutocomplete({ value, onChange, placeholder = 'e.g. Building A' }) {
  const [inputText, setInputText]   = useState(value || '');
  const [chip, setChip]             = useState(null);   // { label, display }
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]             = useState(false);
  const [loading, setLoading]       = useState(false);
  const wrapRef                     = useRef(null);
  const debouncedText               = useDebounce(inputText, 300);

  // Fetch suggestions
  useEffect(() => {
    if (chip || debouncedText.length < 2) { setSuggestions([]); return; }
    setLoading(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debouncedText)}&format=json&limit=5&addressdetails=0`,
      { headers: { 'Accept-Language': 'en' } }
    )
      .then((r) => r.json())
      .then((data) => {
        setSuggestions(data.map((r) => r.display_name));
        setOpen(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedText, chip]);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function select(label) {
    setChip(label);
    setInputText(label);
    setSuggestions([]);
    setOpen(false);
    onChange(label);
  }

  function handleType(e) {
    const v = e.target.value;
    setInputText(v);
    setChip(null);          // chip disappears as soon as user types
    onChange(v);
  }

  function clearChip() {
    setChip(null);
    setInputText('');
    onChange('');
    setSuggestions([]);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {chip ? (
        /* ── Chip (token) mode ── */
        <div className="location-chip">
          {PIN}
          <span className="location-chip-text">{chip}</span>
          <button
            type="button"
            className="location-chip-clear"
            onClick={clearChip}
            title="Edit"
          >×</button>
        </div>
      ) : (
        /* ── Text input mode ── */
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

      {/* ── Dropdown ── */}
      {open && suggestions.length > 0 && !chip && (
        <ul className="location-dropdown">
          {suggestions.map((s, i) => (
            <li key={i} className="location-dropdown-item" onMouseDown={() => select(s)}>
              <span style={{ color: 'var(--color-primary)', marginRight: 6, flexShrink: 0 }}>{PIN}</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
