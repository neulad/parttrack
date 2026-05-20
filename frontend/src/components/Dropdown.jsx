import React, { useState, useEffect, useRef } from 'react';

export default function Dropdown({ value, onChange, options }) {
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
