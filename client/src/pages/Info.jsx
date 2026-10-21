import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Breadcrumbs, Card, Field } from '../components/ui/Primitives.jsx';
import { Logo } from '../components/Art.jsx';
import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useNames, usePageTitle } from '../utils/hooks.js';

const arr = (v) => (Array.isArray(v) ? v : []);

function LegalPage({ ns, crumb }) {
  const { t } = useNames();
  usePageTitle(t(`nav.${ns}`));
  const sections = arr(t(`${ns}.sections`, { returnObjects: true }));
  return (
    <div className="container" style={{ maxWidth: 860, paddingBottom: 32 }}>
      <Breadcrumbs items={[{ label: t(`nav.${ns}`) }]} />
      <h1 style={{ fontSize: 'clamp(1.7rem,4vw,2.4rem)' }}>{t(`nav.${ns}`)}</h1>
      <p className="muted small">{t('legal.updated')} · {t('legal.version')}</p>
      <div className="notice" role="note">⚠️ {t('legal.draft')}</div>
      <nav aria-label={t('legal.toc')} className="card pad" style={{ margin: '16px 0' }}><strong>{t('legal.toc')}</strong>
        <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>{sections.map((s, i) => <li key={i}><a href={`#${ns}-${i}`}>{s.h}</a></li>)}</ol></nav>
      {sections.map((s, i) => (
        <section key={i} id={`${ns}-${i}`} style={{ marginBottom: 22 }}><h2 style={{ fontSize: '1.25rem' }}>{i + 1}. {s.h}</h2>{arr(s.p).map((p, j) => <p key={j}>{p}</p>)}</section>
      ))}
      <p className="muted small">{t('legal.contact')} <Link to="/contact">{t('nav.contact')}</Link>.</p>
    </div>
  );
}
export const Privacy = () => <LegalPage ns="privacy" />;
export const Terms = () => <LegalPage ns="terms" />;

export function About() {
  const { t } = useNames();
  usePageTitle(t('nav.about'));
  const values = ['v1', 'v2', 'v3', 'v4'];
  return (
    <>
      <section className="hero"><div className="container" style={{ padding: '40px 16px' }}>
        <Breadcrumbs items={[{ label: t('nav.about') }]} />
        <div className="row" style={{ gap: 16 }}><span style={{ background: 'var(--forest)', borderRadius: 18, padding: 6, display: 'inline-flex' }}><Logo size={52} /></span><div><h1 style={{ margin: 0, fontSize: 'clamp(1.8rem,5vw,3rem)' }}>{t('about.title')}</h1><p style={{ margin: 0 }}>{t('app.support')}</p></div></div>
      </div></section>
      <div className="container section stack" style={{ maxWidth: 980 }}>
        <div className="grid g2" style={{ alignItems: 'start' }}>
          <div><h2>{t('about.problemH')}</h2><p>{t('about.problem')}</p><p>{t('about.problem2')}</p></div>
          <div><h2>{t('about.missionH')}</h2><p>{t('about.mission')}</p><Badge color="yellow wrap">PS 1.2 — {t('about.ps')}</Badge></div>
        </div>
        <h2>{t('about.howH')}</h2>
        <div className="grid g3">{['a', 'b', 'c', 'd', 'e', 'f'].map((k) => <Card key={k} pad hover><h3>{t(`about.f_${k}`)}</h3><p className="muted" style={{ margin: 0 }}>{t(`about.f_${k}_d`)}</p></Card>)}</div>
        <h2>{t('about.valuesH')}</h2>
        <div className="grid g2">{values.map((k) => <Card key={k} pad><h3>{t(`about.${k}`)}</h3><p className="muted" style={{ margin: 0 }}>{t(`about.${k}_d`)}</p></Card>)}</div>
        <Card pad><h2>{t('about.honestH')}</h2><ul>{['h1', 'h2', 'h3', 'h4'].map((k) => <li key={k}>{t(`about.${k}`)}</li>)}</ul></Card>
        <Card pad><h2>{t('about.whoH')}</h2><p>{t('about.who')}</p><div className="row"><Button as={Link} to="/marketplace">{t('hero.browse')}</Button><Button as={Link} to="/sell" variant="accent">{t('hero.sell')}</Button><Button as={Link} to="/contact" variant="outline">{t('nav.contact')}</Button></div></Card>
      </div>
    </>
  );
}

export function Help() {
  const { t } = useNames();
  usePageTitle(t('nav.help'));
  const groups = ['start', 'selling', 'buying', 'orders', 'data'];
  return (
    <div className="container" style={{ maxWidth: 860, paddingBottom: 32 }}>
      <Breadcrumbs items={[{ label: t('nav.help') }]} />
      <h1 style={{ fontSize: 'clamp(1.7rem,4vw,2.4rem)' }}>❓ {t('help.title')}</h1>
      {groups.map((g) => (
        <section key={g} className="faq" style={{ marginBottom: 20 }}><h2 style={{ fontSize: '1.2rem' }}>{t(`help.g_${g}`)}</h2>
          {arr(t(`help.${g}`, { returnObjects: true })).map((x, i) => <details key={i}><summary>{x.q}</summary><p style={{ margin: '8px 0 0' }}>{x.a}</p></details>)}</section>))}
      <Card pad><strong>{t('help.still')}</strong> <Link to="/contact">{t('nav.contact')}</Link></Card>
    </div>
  );
}

export function Contact() {
  const { t, valErrors } = useNames();
  usePageTitle(t('nav.contact'));
  const { toast, fail } = useApp();
  const [f, setF] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.name.trim()) er.name = 'required';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'invalid';
    if (f.message.trim().length < 10) er.message = 'tooShort';
    setErrors(valErrors(er));
    if (Object.keys(er).length) return;
    setBusy(true);
    try { await api('/contact', { method: 'POST', body: f }); setDone(true); toast(t('contact.sent')); } catch (err) { if (err.fields) setErrors(valErrors(err.fields)); else fail(err); } finally { setBusy(false); }
  };
  return (
    <div className="container" style={{ maxWidth: 900, paddingBottom: 32 }}>
      <Breadcrumbs items={[{ label: t('nav.contact') }]} />
      <h1 style={{ fontSize: 'clamp(1.7rem,4vw,2.4rem)' }}>✉️ {t('contact.title')}</h1>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <Card pad>{done ? <div className="stack"><h3>✅ {t('contact.sent')}</h3><p className="muted">{t('contact.sentBody')}</p><Button as={Link} to="/">{t('nav.home')}</Button></div> : (
          <form onSubmit={submit} noValidate className="stack">
            <Field label={t('contact.name')} required error={errors.name}><input className="input" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label={t('contact.email')} required error={errors.email}><input className="input" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label={t('contact.message')} required error={errors.message}><textarea className="textarea" maxLength={2000} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Field>
            <Button type="submit" loading={busy}>{t('common.send')}</Button><p className="muted small" style={{ margin: 0 }}>{t('contact.privacy')} <Link to="/privacy">{t('nav.privacy')}</Link>.</p>
          </form>)}</Card>
        <Card pad><h3>{t('contact.details')}</h3><p>📧 support@example.org <span className="muted small">({t('footer.placeholder')})</span><br />📞 +91 00000 00000 <span className="muted small">({t('footer.placeholder')})</span><br />📍 Karnataka, India</p><p className="muted small">{t('contact.hours')}</p><p><Link to="/help">{t('nav.help')}</Link></p></Card>
      </div>
    </div>
  );
}

export function NotFound() {
  const { t } = useNames();
  usePageTitle('404');
  return <div className="container section center"><div style={{ fontSize: '4rem' }} aria-hidden="true">🌾</div><h1>{t('err.404title')}</h1><p className="muted">{t('err.404body')}</p><Button as={Link} to="/">{t('nav.home')}</Button></div>;
}
