import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button } from './Primitives.jsx';

function useDialogBehaviour(open, onClose, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const root = ref.current;
    const focusables = () => [...root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')];
    (focusables()[0] || root)?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function Modal({ open, onClose, title, children, wide, footer }) {
  const ref = useRef(null);
  const { t } = useTranslation();
  useDialogBehaviour(open, onClose, ref);
  if (!open) return null;
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
        <div className="row between"><h2 style={{ margin: 0, fontSize: '1.3rem' }}>{title}</h2><Button variant="ghost" size="sm" className="icon" onClick={onClose} aria-label={t('common.close')}>✕</Button></div>
        <div style={{ marginTop: 14 }}>{children}</div>
        {footer && <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>, document.body);
}

export function Drawer({ open, onClose, title, side = 'left', children }) {
  const ref = useRef(null);
  const { t } = useTranslation();
  useDialogBehaviour(open, onClose, ref);
  if (!open) return null;
  return createPortal(
    <>
      <div className="overlay" style={{ display: 'block', padding: 0 }} onMouseDown={onClose} />
      <aside className={`drawer ${side}`} role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
        <div className="row between" style={{ marginBottom: 12 }}><strong>{title}</strong><Button variant="ghost" size="sm" className="icon" onClick={onClose} aria-label={t('common.close')}>✕</Button></div>
        {children}
      </aside>
    </>, document.body);
}

export function ConfirmDialog({ state, onClose }) {
  const { t } = useTranslation();
  return (
    <Modal open={!!state} onClose={() => onClose(false)} title={state?.title || t('common.confirm')}
      footer={<><Button variant="outline" onClick={() => onClose(false)}>{t('common.cancel')}</Button><Button variant={state?.danger ? 'danger' : ''} onClick={() => onClose(true)}>{state?.confirmLabel || t('common.confirm')}</Button></>}>
      <p style={{ margin: 0 }}>{state?.body}</p>
    </Modal>
  );
}

/** Simple click-to-open dropdown panel (closes on outside click / Escape). Items with data-close close it. */
export function Dropdown({ button, children, label, align = 'right', onOpen, className = '' }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const click = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', click);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key); };
  }, [open]);
  return (
    <div className="pos-rel" ref={ref}>
      <button type="button" className={`btn ghost icon ${className}`} aria-haspopup="true" aria-expanded={open} aria-label={label}
        onClick={() => { setOpen((o) => !o); if (!open) onOpen?.(); }}>{button}</button>
      {open && <div className="menu" style={align === 'left' ? { left: 0, right: 'auto' } : undefined} onClick={(e) => { if (e.target.closest('[data-close]')) setOpen(false); }}>{children}</div>}
    </div>
  );
}
