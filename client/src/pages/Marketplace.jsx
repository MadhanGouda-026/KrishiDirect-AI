import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button, Breadcrumbs, Pagination, Field } from '../components/ui/Primitives.jsx';
import { Drawer } from '../components/ui/Overlays.jsx';
import { CardSkeletons, EmptyState, ErrorState } from '../components/ui/Feedback.jsx';
import { ListingCard } from '../components/ListingCard.jsx';
import { useFetch } from '../api/client.js';
import { useNames, usePageTitle } from '../utils/hooks.js';
import { useApp } from '../context/AppContext.jsx';
import { CATEGORIES } from '@shared/crops.js';
import { DISTRICTS } from '@shared/geo.js';
import { downloadCsv } from '../utils/csv.js';

const KEYS = ['q', 'category', 'district', 'minPrice', 'maxPrice', 'minQty', 'grade', 'harvestAfter', 'organic', 'fulfilment', 'maxMinOrder', 'verified', 'sort', 'page'];

function FilterPanel({ p, set, clear }) {
  const { t, cat, district } = useNames();
  return (
    <div className="filters card" role="group" aria-label={t('common.filters')}>
      <Field label={t('market.category')}><select className="select" value={p.category || ''} onChange={(e) => set({ category: e.target.value })}><option value="">{t('common.all')}</option>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.emoji} {cat(c.key)}</option>)}</select></Field>
      <Field label={t('market.district')}><select className="select" value={p.district || ''} onChange={(e) => set({ district: e.target.value })}><option value="">{t('common.all')}</option>{DISTRICTS.map((d) => <option key={d.key} value={d.key}>{district(d.key)}</option>)}</select></Field>
      <div className="grid g2" style={{ gap: 10 }}>
        <Field label={t('market.minPrice')}><input className="input" type="number" min="0" inputMode="decimal" value={p.minPrice || ''} onChange={(e) => set({ minPrice: e.target.value })} /></Field>
        <Field label={t('market.maxPrice')}><input className="input" type="number" min="0" inputMode="decimal" value={p.maxPrice || ''} onChange={(e) => set({ maxPrice: e.target.value })} /></Field>
      </div>
      <p className="hint" style={{ margin: '-8px 0 0' }}>{t('market.priceNote')}</p>
      <Field label={t('market.minQty')}><input className="input" type="number" min="0" inputMode="decimal" value={p.minQty || ''} onChange={(e) => set({ minQty: e.target.value })} /></Field>
      <Field label={t('market.maxMinOrder')}><input className="input" type="number" min="0" inputMode="decimal" value={p.maxMinOrder || ''} onChange={(e) => set({ maxMinOrder: e.target.value })} /></Field>
      <Field label={t('market.grade')}><select className="select" value={p.grade || ''} onChange={(e) => set({ grade: e.target.value })}><option value="">{t('common.all')}</option>{['A', 'B', 'C', 'ungraded'].map((g) => <option key={g} value={g}>{t(`grade.${g}`)}</option>)}</select></Field>
      <Field label={t('market.harvestAfter')}><input className="input" type="date" value={p.harvestAfter || ''} onChange={(e) => set({ harvestAfter: e.target.value })} /></Field>
      <Field label={t('market.organic')}><select className="select" value={p.organic || ''} onChange={(e) => set({ organic: e.target.value })}><option value="">{t('common.all')}</option><option value="organic">{t('organic.organic')}</option><option value="conventional">{t('organic.conventional')}</option></select></Field>
      <Field label={t('market.fulfilment')}><select className="select" value={p.fulfilment || ''} onChange={(e) => set({ fulfilment: e.target.value })}><option value="">{t('common.all')}</option><option value="pickup">{t('fulfil.pickup')}</option><option value="delivery">{t('fulfil.delivery')}</option></select></Field>
      <label className="chk"><input type="checkbox" checked={p.verified === '1'} onChange={(e) => set({ verified: e.target.checked ? '1' : '' })} /> {t('market.verified')}</label>
      <Button variant="outline" onClick={clear}>{t('common.clearAll')}</Button>
    </div>
  );
}

export default function Marketplace() {
  const { t, cat } = useNames();
  usePageTitle(t('nav.marketplace'));
  const [sp, setSp] = useSearchParams();
  const { prefs, pushSearch, clearSearches } = useApp();
  const [drawer, setDrawer] = useState(false);
  const p = Object.fromEntries(KEYS.map((k) => [k, sp.get(k) || '']));
  const [q, setQ] = useState(p.q);
  useEffect(() => setQ(p.q), [p.q]);

  const set = (patch) => {
    const n = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    if (!('page' in patch)) n.delete('page');
    setSp(n, { replace: true });
  };
  const clear = () => setSp({}, { replace: true });
  const qs = useMemo(() => new URLSearchParams([...KEYS.filter((k) => p[k]).map((k) => [k, p[k]]), ['pageSize', '9']]).toString(), [sp]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data, loading, error, reload } = useFetch(`/listings?${qs}`);
  const active = KEYS.filter((k) => !['sort', 'page'].includes(k) && p[k]).length;

  const exportCsv = () => downloadCsv('listings.csv', (data?.items || []).map((l) => ({ id: l.id, crop: l.cropName, category: l.category, seller: l.seller?.name, district: l.district, price: l.price, priceUnit: l.priceUnit, quantity: l.quantity, quantityUnit: l.quantityUnit, minOrder: l.minOrder, grade: l.grade, harvestDate: l.harvestDate, organic: l.organic })));

  return (
    <div className="container">
      <Breadcrumbs items={[{ label: t('nav.marketplace') }]} />
      <div className="page-head row between">
        <div><h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)' }}>{t('nav.marketplace')}</h1><p className="muted">{t('market.sub')}</p></div>
      </div>
      <form role="search" className="searchbar" style={{ marginBottom: 14 }} onSubmit={(e) => { e.preventDefault(); pushSearch(q); set({ q }); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('hero.searchPh')} aria-label={t('nav.search')} />
        <Button type="submit" variant="yellow" style={{ borderRadius: 0 }}>🔍 {t('nav.search')}</Button>
      </form>
      <div className="chips" style={{ marginBottom: 14 }} aria-label={t('market.category')}>
        <button className={`chip ${!p.category ? 'on' : ''}`} onClick={() => set({ category: '' })}>{t('common.all')}</button>
        {CATEGORIES.map((c) => <button key={c.key} className={`chip ${p.category === c.key ? 'on' : ''}`} aria-pressed={p.category === c.key} onClick={() => set({ category: c.key })}>{c.emoji} {cat(c.key)}</button>)}
      </div>
      {prefs.searches.length > 0 && !p.q && (
        <p className="small muted">{t('market.recent')}: {prefs.searches.map((s) => <button key={s} className="chip" style={{ minHeight: 28, padding: '2px 10px', marginRight: 6 }} onClick={() => set({ q: s })}>{s}</button>)} <button className="btn ghost sm" onClick={clearSearches}>{t('common.clear')}</button></p>
      )}
      <div className="market-layout">
        <aside className="filters-desktop"><FilterPanel p={p} set={set} clear={clear} /></aside>
        <section aria-live="polite">
          <div className="row between" style={{ marginBottom: 14 }}>
            <div className="row">
              <Button className="filters-toggle" variant="outline" size="sm" onClick={() => setDrawer(true)}>⚙️ {t('common.filters')}{active ? ` (${active})` : ''}</Button>
              <strong>{loading ? t('common.loading') : t('common.results', { count: data?.total ?? 0 })}</strong>
              {active > 0 && <Button variant="ghost" size="sm" onClick={clear}>✕ {t('common.clearAll')}</Button>}
            </div>
            <div className="row">
              <label className="small" htmlFor="sort">{t('market.sort')}</label>
              <select id="sort" className="select" style={{ width: 'auto', minHeight: 38 }} value={p.sort || 'newest'} onChange={(e) => set({ sort: e.target.value })}>
                {['newest', 'priceAsc', 'priceDesc', 'quantity', 'popularity'].map((s) => <option key={s} value={s}>{t(`market.sort_${s}`)}</option>)}
              </select>
              <Button variant="ghost" size="sm" onClick={exportCsv} disabled={!data?.items?.length}>⬇ CSV</Button>
            </div>
          </div>
          {error ? <ErrorState error={error} onRetry={reload} /> : loading ? <CardSkeletons n={6} /> : data.items.length === 0 ? (
            <EmptyState emoji="🔎" title={t('market.emptyTitle')} action={<Button onClick={clear}>{t('common.clearAll')}</Button>}>{t('market.emptyBody')}</EmptyState>
          ) : (
            <>
              <div className="cards">{data.items.map((l) => <ListingCard key={l.id} l={l} onChanged={reload} />)}</div>
              <Pagination page={data.page} pages={data.pages} onChange={(n) => { set({ page: String(n) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </>
          )}
          {prefs.compare.length > 0 && <p className="center" style={{ marginTop: 18 }}><Button as={Link} to="/compare">⇄ {t('compare.open', { count: prefs.compare.length })}</Button></p>}
        </section>
      </div>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title={t('common.filters')}>
        <FilterPanel p={p} set={set} clear={clear} />
        <Button block style={{ marginTop: 12 }} onClick={() => setDrawer(false)}>{t('common.results', { count: data?.total ?? 0 })}</Button>
      </Drawer>
    </div>
  );
}
