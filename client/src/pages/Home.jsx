import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeroArt, CropImage } from '../components/Art.jsx';
import { Button, Badge, Card } from '../components/ui/Primitives.jsx';
import { CardSkeletons } from '../components/ui/Feedback.jsx';
import { ListingCard } from '../components/ListingCard.jsx';
import { WeatherWidget } from '../components/Widgets.jsx';
import { useFetch } from '../api/client.js';
import { useNames, usePageTitle } from '../utils/hooks.js';
import { useApp } from '../context/AppContext.jsx';
import { CATEGORIES, cropByKey } from '@shared/crops.js';
import { inr } from '../utils/format.js';

const CHIPS = ['tomato', 'onion', 'coconut', 'arecanut', 'rice', 'banana', 'chilli', 'mango', 'ragi', 'turmeric'];

export default function Home() {
  const { t, lang, crop, cat } = useNames();
  usePageTitle('');
  const navigate = useNavigate();
  const { pushSearch, user } = useApp();
  const [q, setQ] = useState('');
  const prices = useFetch('/prices/summary');
  const latest = useFetch('/listings?pageSize=4&sort=newest');
  const go = (term) => { pushSearch(term); navigate(`/marketplace?q=${encodeURIComponent(term)}`); };
  const panel = (prices.data?.items || []).filter((p) => ['tomato', 'onion', 'coconut', 'arecanut', 'banana', 'rice'].includes(p.key));
  return (
    <>
      <section className="hero">
        <div className="container hero-in">
          <div className="stack">
            <Badge color="yellow">🌾 {t('hero.badge')}</Badge>
            <h1>{t('hero.title1')} <span>{t('hero.title2')}</span></h1>
            <p style={{ fontSize: '1.08rem', maxWidth: 560 }}>{t('hero.sub')}</p>
            <div className="row">
              <Button as={Link} to="/marketplace">{t('hero.browse')} →</Button>
              <Button as={Link} to="/sell" variant="accent">{t('hero.sell')}</Button>
            </div>
            <form role="search" className="searchbar" onSubmit={(e) => { e.preventDefault(); go(q); }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('hero.searchPh')} aria-label={t('nav.search')} />
              <Button type="submit" variant="yellow" style={{ borderRadius: 0 }}>🔍 {t('nav.search')}</Button>
            </form>
            <div className="chips" aria-label={t('hero.quick')}>{CHIPS.map((k) => <button key={k} className="chip" onClick={() => go(cropByKey(k).en)}>{cropByKey(k).emoji} {crop(k)}</button>)}</div>
            <div className="grid g4" style={{ gap: 10 }}>
              {[['⚖️', 'fair'], ['🤝', 'direct'], ['📍', 'local'], ['🌱', 'sustain']].map(([em, k]) => <div key={k} className="indicator"><span className="em" aria-hidden="true">{em}</span>{t(`hero.${k}`)}</div>)}
            </div>
          </div>
          <div className="stack">
            <div className="hero-art"><HeroArt /></div>
            <div className="price-panel">
              <div className="row between"><strong>📊 {t('hero.panel')}</strong><Badge color="yellow">{t('prices.demoLabel')}</Badge></div>
              {prices.loading ? <p className="muted">{t('common.loading')}</p> : (
                <table><tbody>{panel.map((p) => (
                  <tr key={p.key}><td>{cropByKey(p.key).emoji} {crop(p.key)}</td><td>{inr(p.price, lang, 1)}/{t(`unit.${p.unit}`)} <span className={p.change7d >= 0 ? 'up' : 'down'}>{p.change7d >= 0 ? '▲' : '▼'}{Math.abs(p.change7d)}%</span></td></tr>
                ))}</tbody></table>
              )}
              <p className="muted small" style={{ margin: '8px 0 0' }}>{t('hero.panelNote')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section"><div className="container">
        <div className="row between"><h2>{t('home.categories')}</h2><Link to="/marketplace">{t('common.viewAll')} →</Link></div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 130px), 1fr))' }}>
          {CATEGORIES.map((c) => (
            <Link key={c.key} to={`/marketplace?category=${c.key}`} className="cat-card" style={{ background: c.bg, color: '#243128', borderColor: c.color + '55' }}>
              <span className="em" aria-hidden="true">{c.emoji}</span>{cat(c.key)}
            </Link>
          ))}
        </div>
      </div></section>

      <section className="section alt"><div className="container">
        <div className="row between"><h2>{t('home.fresh')}</h2><Link to="/marketplace?sort=newest">{t('common.viewAll')} →</Link></div>
        {latest.loading ? <CardSkeletons n={4} /> : <div className="cards">{(latest.data?.items || []).map((l) => <ListingCard key={l.id} l={l} />)}</div>}
      </div></section>

      <section className="section"><div className="container">
        <h2 className="center">{t('home.how')}</h2>
        <div className="grid g3">
          {[['📸', 'h1'], ['🤝', 'h2'], ['📦', 'h3']].map(([em, k], i) => (
            <Card key={k} pad hover><div style={{ fontSize: '2.2rem' }} aria-hidden="true">{em}</div><h3>{i + 1}. {t(`home.${k}t`)}</h3><p className="muted">{t(`home.${k}d`)}</p></Card>
          ))}
        </div>
      </div></section>

      <section className="section alt"><div className="container grid g2" style={{ alignItems: 'start' }}>
        <div className="stack">
          <h2>{t('home.who')}</h2>
          <div className="chips">{['farmers', 'growers', 'retailers', 'wholesalers', 'restaurants', 'coops', 'fpos', 'institutions'].map((k) => <Badge key={k} color="green">{t(`home.who_${k}`)}</Badge>)}</div>
          <p className="muted">{t('home.whoNote')}</p>
          <div className="row"><Button as={Link} to="/about" variant="outline">{t('nav.about')}</Button><Button as={Link} to="/assistant" variant="outline">🤖 {t('nav.assistant')}</Button></div>
        </div>
        <WeatherWidget district={user?.district} />
      </div></section>
    </>
  );
}
