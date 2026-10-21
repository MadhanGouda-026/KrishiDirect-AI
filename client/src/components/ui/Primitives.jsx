import { Children, cloneElement, isValidElement, useId, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Button({ variant = '', size = '', loading = false, children, className = '', as: As, ...rest }) {
  const cls = `btn ${variant} ${size} ${className}`.trim();
  if (As) return <As className={cls} {...rest}>{children}</As>;
  return (
    <button type="button" className={cls} disabled={loading || rest.disabled} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export const Badge = ({ color = '', children, title }) => <span className={`badge ${color}`} title={title}>{children}</span>;
export const Card = ({ className = '', pad, hover, children, ...r }) => <div className={`card ${pad ? 'pad' : ''} ${hover ? 'hover' : ''} ${className}`} {...r}>{children}</div>;

const STATUS_COLOR = {
  active: 'green', draft: 'gray', paused: 'yellow', sold: 'blue',
  pending: 'yellow', accepted: 'green', rejected: 'red', countered: 'orange', withdrawn: 'gray', expired: 'gray',
  placed: 'yellow', confirmed: 'blue', prepared: 'orange', dispatched: 'orange', ready_for_pickup: 'orange', received: 'green', cancelled: 'gray',
};
export function StatusBadge({ status }) {
  const { t } = useTranslation();
  return <Badge color={STATUS_COLOR[status] || ''}>{t(`status.${status}`, { defaultValue: status })}</Badge>;
}

/** Wraps a control with label, required marker, hint and inline error (wired for screen readers). */
export function Field({ label, required, error, hint, children, className = '' }) {
  const id = useId();
  const { t } = useTranslation();
  const child = Children.only(children);
  const described = [error && `${id}-e`, hint && `${id}-h`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${error ? 'invalid' : ''} ${className}`}>
      {label && <label htmlFor={id}>{label}{required ? <span className="req" aria-hidden="true">*</span> : <span className="muted small"> ({t('common.optional')})</span>}</label>}
      {isValidElement(child) ? cloneElement(child, { id, 'aria-invalid': !!error || undefined, 'aria-describedby': described, 'aria-required': required || undefined }) : child}
      {hint && <span id={`${id}-h`} className="hint">{hint}</span>}
      {error && <span id={`${id}-e`} className="err" role="alert">{error}</span>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, label }) {
  const refs = useRef([]);
  const onKey = (e, i) => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[n].key); refs.current[n]?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tb, i) => (
        <button key={tb.key} ref={(el) => (refs.current[i] = el)} role="tab" aria-selected={value === tb.key} tabIndex={value === tb.key ? 0 : -1} onKeyDown={(e) => onKey(e, i)} onClick={() => onChange(tb.key)}>
          {tb.label}{tb.count !== undefined && <span className="badge" style={{ marginLeft: 6 }}>{tb.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Tooltip({ text, children }) {
  const id = useId();
  return <span className="tip">{cloneElement(children, { 'aria-describedby': id })}<span role="tooltip" id={id} className="bubble">{text}</span></span>;
}

export function Breadcrumbs({ items }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('common.breadcrumb')}>
      <ol className="crumbs">
        <li><Link to="/">{t('nav.home')}</Link></li>
        {items.map((it, i) => <li key={i} aria-current={i === items.length - 1 ? 'page' : undefined}>{it.to ? <Link to={it.to}>{it.label}</Link> : it.label}</li>)}
      </ol>
    </nav>
  );
}

export function Pagination({ page, pages, onChange }) {
  const { t } = useTranslation();
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label={t('common.pagination')}>
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹ {t('common.prev')}</Button>
      <span aria-live="polite">{t('common.page', { n: page, pages })}</span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>{t('common.next')} ›</Button>
    </nav>
  );
}

export function Steps({ steps, current }) {
  return (
    <ol className="steps" style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="progress">
      {steps.map((s, i) => (
        <li key={s} className={`s ${i < current ? 'done' : ''} ${i === current ? 'cur' : ''}`} aria-current={i === current ? 'step' : undefined}>
          <div className="bar" />{i + 1}. {s}
        </li>
      ))}
    </ol>
  );
}

export function useBool(initial = false) {
  const [v, set] = useState(initial);
  return [v, () => set(true), () => set(false), () => set((x) => !x)];
}
