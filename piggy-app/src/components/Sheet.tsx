import React, { useEffect } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}

/** Bottom sheet on phones, centred dialog on wide screens. */
export const Sheet: React.FC<Props> = ({ title, onClose, left, right, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <div className="left">{left ?? <button className="link-btn" onClick={onClose}>Cancel</button>}</div>
          <h2>{title}</h2>
          <div className="right">{right}</div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
};

export const Switch: React.FC<{ id: string; checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ id, checked, onChange, label }) => (
  <label className="switch">
    <input id={id} type="checkbox" role="switch" aria-label={label} checked={checked} onChange={e => onChange(e.target.checked)} />
    <span />
  </label>
);

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}
