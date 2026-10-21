import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Breadcrumbs, Card, Field, Steps } from '../components/ui/Primitives.jsx';
import { Skeleton, ErrorState } from '../components/ui/Feedback.jsx';
import { SwitchIdentityNote } from '../components/Dialogs.jsx';
import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useNames, usePageTitle } from '../utils/hooks.js';
import { today } from '../utils/format.js';
import { CATEGORIES, findCrop } from '@shared/crops.js';
import { DISTRICTS } from '@shared/geo.js';
import { UNIT_KEYS, UNITS, sameGroup } from '@shared/units.js';
import { validateListing, MAX_IMAGES } from '@shared/validators.js';

const STEP_FIELDS = [
  ['cropName', 'category', 'description', 'grade', 'organic'],
  ['price', 'priceUnit', 'quantity', 'quantityUnit', 'minOrder', 'harvestDate'],
  ['district', 'village', 'fulfilment', 'availableUntil'],
  ['images', 'contactPref'],
];
const RAW_LIMIT = 6 * 1024 * 1024;

/** Validates type/size, then downsizes to keep listings light (max 900px JPEG). */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return reject(new Error('imageInvalid'));
    if (file.size > RAW_LIMIT) return reject(new Error('imageTooLarge'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let q = 0.82, out = c.toDataURL('image/jpeg', q);
      while (out.length > 400000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
      out.length > 450000 ? reject(new Error('imageTooLarge')) : resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imageInvalid')); };
    img.src = url;
  });
}

export default function Sell() {
  const { id } = useParams();
  const editing = !!id;
  const { t, valErrors, district, cat, unit } = useNames();
  const { user, toast, fail, refresh, confirm } = useApp();
  const navigate = useNavigate();
  usePageTitle(editing ? t('sell.editTitle') : t('sell.title'));
  const blank = { cropName: '', category: 'vegetables', description: '', price: '', priceUnit: 'kg', quantity: '', quantityUnit: 'kg', minOrder: '', grade: 'A', harvestDate: today(), district: user?.district || 'udupi', village: user?.village || '', fulfilment: ['pickup'], organic: 'conventional', images: [], contactPref: 'both', availableUntil: '' };
  const [f, setF] = useState(blank);
  const [status, setStatus] = useState('draft');
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(editing);
  const [loadErr, setLoadErr] = useState(null);
  const [imgUrl, setImgUrl] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiLabel, setAiLabel] = useState('');
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  useEffect(() => {
    if (!editing) return;
    api(`/listings/${id}`).then(({ listing }) => { setF({ ...blank, ...listing, availableUntil: listing.availableUntil || '' }); setStatus(listing.status); setLoading(false); }).catch((e) => { setLoadErr(e); setLoading(false); });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!editing && user) setF((x) => ({ ...x, district: user.district, village: user.village || '' })); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <div className="container section"><Skeleton h={300} /></div>;
  if (user.role !== 'farmer') return <div className="container section"><h1>{t('sell.title')}</h1><SwitchIdentityNote role="farmer" /></div>;
  if (loadErr) return <div className="container section"><ErrorState error={loadErr} /></div>;
  if (loading) return <div className="container section"><Skeleton h={400} /></div>;
  if (editing && f.sellerId && f.sellerId !== user.id) return <div className="container section"><ErrorState error={{ code: 'forbidden' }} /></div>;

  const stepNames = [t('sell.s1'), t('sell.s2'), t('sell.s3'), t('sell.s4')];
  const check = (fields, opts) => {
    const r = validateListing(f, opts);
    const e = Object.fromEntries(Object.entries(r.errors).filter(([k]) => !fields || fields.includes(k)));
    setErrors(valErrors(e));
    return Object.keys(e).length === 0;
  };
  const next = () => { if (check(STEP_FIELDS[step])) setStep(step + 1); };
  const save = async (target) => {
    const draft = target === 'draft';
    if (!draft && !check(null)) { const first = STEP_FIELDS.findIndex((fs) => fs.some((k) => validateListing(f).errors[k])); setStep(Math.max(0, first)); return; }
    if (draft && !check(['cropName'], { draft: true })) { setStep(0); return; }
    setBusy(target);
    try {
      const body = { ...f, status: target };
      const saved = editing ? await api(`/listings/${id}`, { method: 'PUT', body }) : await api('/listings', { method: 'POST', body });
      toast(draft ? t('sell.draftSaved') : t('sell.published')); refresh();
      navigate(draft ? '/farmer' : `/crop/${saved.id}`);
    } catch (e) { if (e.fields) { setErrors(valErrors(e.fields)); const first = STEP_FIELDS.findIndex((fs) => fs.some((k) => e.fields[k])); if (first >= 0) setStep(first); toast(t('err.validation'), 'error'); } else fail(e); } finally { setBusy(''); }
  };
  const addFiles = async (files) => {
    for (const file of files) {
      if (f.images.length >= MAX_IMAGES) { setErrors((e) => ({ ...e, images: t('val.tooManyImages') })); break; }
      try { const url = await fileToDataUrl(file); setF((x) => ({ ...x, images: [...x.images, url].slice(0, MAX_IMAGES) })); setErrors((e) => ({ ...e, images: undefined })); }
      catch (e) { setErrors((x) => ({ ...x, images: t(`val.${e.message}`) })); }
    }
  };
  const addUrl = () => {
    if (!/^https?:\/\/\S{3,}$/.test(imgUrl)) { setErrors((e) => ({ ...e, images: t('val.imageInvalid') })); return; }
    if (f.images.length >= MAX_IMAGES) { setErrors((e) => ({ ...e, images: t('val.tooManyImages') })); return; }
    set({ images: [...f.images, imgUrl] }); setImgUrl(''); setErrors((e) => ({ ...e, images: undefined }));
  };
  const aiDescribe = async () => {
    setAiBusy(true);
    try { const r = await api('/assistant', { method: 'POST', body: { tool: 'description', params: { cropName: f.cropName, district: district(f.district), village: f.village, harvestDate: f.harvestDate, grade: f.grade, organic: f.organic } } }); set({ description: r.text }); setAiLabel(r.label); }
    catch (e) { fail(e); } finally { setAiBusy(false); }
  };
  const act = async (kind) => {
    try {
      if (kind === 'delete') { if (!(await confirm({ title: t('sell.deleteTitle'), body: t('sell.deleteBody'), danger: true, confirmLabel: t('common.delete') }))) return; await api(`/listings/${id}`, { method: 'DELETE' }); toast(t('sell.deleted')); refresh(); navigate('/farmer'); }
      else { const s = await api(`/listings/${id}/status`, { method: 'PATCH', body: { status: kind } }); setStatus(s.status); toast(t('sell.statusChanged')); refresh(); }
    } catch (e) { fail(e); }
  };
  const onCrop = (v) => { const c = findCrop(v); set({ cropName: v, ...(c && !editing ? { category: c.cat === 'other' ? f.category : c.cat } : {}) }); };
  const onPriceUnit = (v) => set({ priceUnit: v, ...(sameGroup(v, f.quantityUnit) ? {} : { quantityUnit: v }) });
  const toggleF = (k) => set({ fulfilment: f.fulfilment.includes(k) ? f.fulfilment.filter((x) => x !== k) : [...f.fulfilment, k] });
  const unitOpts = (g) => UNIT_KEYS.filter((u) => !g || UNITS[u].group === UNITS[g].group).map((u) => <option key={u} value={u}>{unit(u)}</option>);

  return (
    <div className="container" style={{ maxWidth: 860 }}>
      <Breadcrumbs items={[{ label: t('nav.farmers'), to: '/farmer' }, { label: editing ? t('sell.editTitle') : t('sell.title') }]} />
      <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>{editing ? t('sell.editTitle') : t('sell.title')} {editing && <StatusPill status={status} />}</h1>
      <p className="muted">{t('sell.sub')} <span className="small">({t('sell.requiredNote')})</span></p>
      <Steps steps={stepNames} current={step} />
      <Card pad className="stack" style={{ marginTop: 16 }}>
        {step === 0 && <>
          <Field label={t('sell.cropName')} required error={errors.cropName} hint={t('sell.cropHint')}><input className="input" value={f.cropName} maxLength={60} onChange={(e) => onCrop(e.target.value)} /></Field>
          <Field label={t('sell.category')} required error={errors.category}><select className="select" value={f.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.emoji} {cat(c.key)}</option>)}</select></Field>
          <div className="grid g2">
            <Field label={t('sell.grade')} required error={errors.grade}><select className="select" value={f.grade} onChange={(e) => set({ grade: e.target.value })}>{['A', 'B', 'C', 'ungraded'].map((g) => <option key={g} value={g}>{t(`grade.${g}`)}</option>)}</select></Field>
            <Field label={t('sell.organic')} required error={errors.organic} hint={t('listing.organicNote')}><select className="select" value={f.organic} onChange={(e) => set({ organic: e.target.value })}><option value="conventional">{t('organic.conventional')}</option><option value="organic">{t('organic.organic')}</option></select></Field>
          </div>
          <Field label={t('sell.description')} error={errors.description} hint={aiLabel ? `${aiLabel}` : t('sell.descHint')}><textarea className="textarea" maxLength={800} value={f.description} onChange={(e) => set({ description: e.target.value })} /></Field>
          <div><Button variant="outline" size="sm" loading={aiBusy} disabled={!f.cropName} onClick={aiDescribe}>✨ {t('sell.genDesc')}</Button></div>
        </>}
        {step === 1 && <>
          <div className="grid g2">
            <Field label={`${t('sell.price')} (₹)`} required error={errors.price}><input className="input" type="number" min="0" step="any" inputMode="decimal" value={f.price} onChange={(e) => set({ price: e.target.value })} /></Field>
            <Field label={t('sell.priceUnit')} required error={errors.priceUnit}><select className="select" value={f.priceUnit} onChange={(e) => onPriceUnit(e.target.value)}>{unitOpts()}</select></Field>
            <Field label={t('sell.quantity')} required error={errors.quantity}><input className="input" type="number" min="0" step="any" inputMode="decimal" value={f.quantity} onChange={(e) => set({ quantity: e.target.value })} /></Field>
            <Field label={t('sell.quantityUnit')} required error={errors.quantityUnit}><select className="select" value={f.quantityUnit} onChange={(e) => set({ quantityUnit: e.target.value })}>{unitOpts(f.priceUnit)}</select></Field>
            <Field label={t('sell.minOrder')} required error={errors.minOrder} hint={unit(f.quantityUnit)}><input className="input" type="number" min="0" step="any" inputMode="decimal" value={f.minOrder} onChange={(e) => set({ minOrder: e.target.value })} /></Field>
            <Field label={t('sell.harvestDate')} required error={errors.harvestDate}><input className="input" type="date" max={today()} value={f.harvestDate || ''} onChange={(e) => set({ harvestDate: e.target.value })} /></Field>
          </div>
          <p className="muted small">💡 <Link to="/prices">{t('sell.checkPrices')}</Link></p>
        </>}
        {step === 2 && <>
          <div className="grid g2">
            <Field label={t('sell.district')} required error={errors.district}><select className="select" value={f.district} onChange={(e) => set({ district: e.target.value })}>{DISTRICTS.map((d) => <option key={d.key} value={d.key}>{district(d.key)}</option>)}</select></Field>
            <Field label={t('sell.village')} error={errors.village}><input className="input" maxLength={80} value={f.village} onChange={(e) => set({ village: e.target.value })} /></Field>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="label">{t('sell.fulfilment')}<span className="req">*</span></legend>
            <div className="row">{['pickup', 'delivery'].map((k) => <label key={k} className="chk"><input type="checkbox" checked={f.fulfilment.includes(k)} onChange={() => toggleF(k)} /> {t(`fulfil.${k}`)}</label>)}</div>
            {errors.fulfilment && <span className="err" role="alert">{errors.fulfilment}</span>}
          </fieldset>
          <Field label={t('sell.availableUntil')} error={errors.availableUntil} hint={t('sell.availableHint')}><input className="input" type="date" min={today()} value={f.availableUntil || ''} onChange={(e) => set({ availableUntil: e.target.value })} /></Field>
        </>}
        {step === 3 && <>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack"><legend className="label">{t('sell.photos')}</legend>
            <p className="hint" style={{ margin: 0 }}>{t('sell.photoHint', { max: MAX_IMAGES })}</p>
            <input type="file" className="input" accept="image/jpeg,image/png,image/webp" multiple aria-label={t('sell.upload')} onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }} />
            <div className="row"><input className="input grow" placeholder="https://…" value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} aria-label={t('sell.imageUrl')} /><Button variant="outline" onClick={addUrl}>{t('sell.addUrl')}</Button></div>
            {errors.images && <span className="err" role="alert">{errors.images}</span>}
            {f.images.length > 0 && <div className="row">{f.images.map((src, i) => (
              <div key={i} style={{ position: 'relative' }}><img src={src} alt={`${t('listing.photo')} ${i + 1}`} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} onError={(e) => { e.currentTarget.style.opacity = 0.3; }} />
                <Button size="sm" variant="danger" className="icon" style={{ position: 'absolute', top: -8, right: -8 }} aria-label={t('common.delete')} onClick={() => set({ images: f.images.filter((_, j) => j !== i) })}>✕</Button></div>
            ))}</div>}
          </fieldset>
          <Field label={t('sell.contactPref')} error={errors.contactPref} hint={t('sell.contactHint')}><select className="select" value={f.contactPref} onChange={(e) => set({ contactPref: e.target.value })}><option value="both">{t('sell.cp_both')}</option><option value="enquiry">{t('sell.cp_enquiry')}</option><option value="offer">{t('sell.cp_offer')}</option></select></Field>
        </>}
        <div className="row between" style={{ marginTop: 8 }}>
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>← {t('common.back')}</Button>
          <div className="row">
            {status !== 'sold' && <Button variant="ghost" loading={busy === 'draft'} onClick={() => save('draft')} disabled={editing && status !== 'draft'} title={editing && status !== 'draft' ? t('sell.draftOnly') : ''}>💾 {t('sell.saveDraft')}</Button>}
            {step < 3 ? <Button onClick={next}>{t('common.next')} →</Button> : <Button variant="accent" loading={busy === 'active'} onClick={() => save(editing && status !== 'draft' ? status : 'active')}>🚀 {editing && status !== 'draft' ? t('common.save') : t('sell.publish')}</Button>}
          </div>
        </div>
      </Card>
      {editing && (
        <Card pad style={{ marginTop: 16 }}><h3>{t('sell.manage')}</h3>
          <div className="row">
            {status === 'active' && <Button variant="outline" onClick={() => act('paused')}>⏸ {t('sell.pause')}</Button>}
            {['paused', 'sold'].includes(status) && <Button variant="outline" onClick={() => act('active')}>▶ {t('sell.resume')}</Button>}
            {['active', 'paused'].includes(status) && <Button variant="outline" onClick={() => act('sold')}>✔ {t('sell.markSold')}</Button>}
            <Button variant="danger" onClick={() => act('delete')}>🗑 {t('common.delete')}</Button>
          </div></Card>
      )}
    </div>
  );
}
const StatusPill = ({ status }) => <Badge color={{ active: 'green', draft: 'gray', paused: 'yellow', sold: 'blue' }[status]}>{status}</Badge>;
