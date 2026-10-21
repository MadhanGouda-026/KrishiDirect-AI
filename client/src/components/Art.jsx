import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { categoryByKey, cropByKey, localName } from '@shared/crops.js';

/** Crop photo with graceful fallback: uploaded/URL image -> illustrated placeholder. */
export function CropImage({ listing, cropKey, category, alt, index = 0 }) {
  const { i18n } = useTranslation();
  const [failed, setFailed] = useState(false);
  const src = listing?.images?.[index];
  const crop = cropByKey(listing?.cropKey || cropKey);
  const cat = categoryByKey(listing?.category || category || crop?.cat);
  const label = alt || (listing ? `${listing.cropName}` : localName(crop, i18n.language));
  if (src && !failed) return <img src={src} alt={label} loading="lazy" onError={() => setFailed(true)} />;
  return (
    <div className="crop-art" role="img" aria-label={label} style={{ background: `linear-gradient(145deg, ${cat.bg}, #fff 120%)` }}>
      <span aria-hidden="true">{crop?.emoji || cat.emoji}</span>
    </div>
  );
}

/** Original SVG illustration for the hero: smiling farmer with a basket of vegetables in a lush field. */
export function HeroArt() {
  const { t } = useTranslation();
  const rows = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg viewBox="0 0 500 440" role="img" aria-label={t('hero.alt')} preserveAspectRatio="xMidYMid slice" style={{ display: 'block', width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9fdcff" /><stop offset="0.7" stopColor="#fff3c4" /></linearGradient>
        <radialGradient id="sun"><stop offset="0" stopColor="#fff7c2" /><stop offset="1" stopColor="#ffc857" /></radialGradient>
        <linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fc45a" /><stop offset="1" stopColor="#2e8b45" /></linearGradient>
      </defs>
      <rect width="500" height="440" fill="url(#sky)" />
      <circle cx="410" cy="75" r="62" fill="#ffe08a" opacity=".35" /><circle cx="410" cy="75" r="36" fill="url(#sun)" />
      <g fill="#fff" opacity=".85"><ellipse cx="90" cy="70" rx="42" ry="13" /><ellipse cx="120" cy="60" rx="30" ry="12" /><ellipse cx="300" cy="105" rx="34" ry="10" /></g>
      <path d="M0 215 Q70 150 150 200 T300 190 T500 175 V300 H0Z" fill="#8fcf72" />
      <path d="M0 245 Q110 190 220 235 T500 215 V320 H0Z" fill="#62b455" />
      {/* arecanut / coconut palms */}
      {[[48, 250, 1], [455, 240, 1.1], [410, 262, 0.8]].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M0 0 Q-8 -60 6 -125" stroke="#8a5a2b" strokeWidth="9" fill="none" strokeLinecap="round" />
          <g fill="#2e8b45">
            <path d="M6 -125 Q-30 -150 -62 -128 Q-28 -136 6 -125Z" /><path d="M6 -125 Q42 -152 74 -126 Q40 -134 6 -125Z" />
            <path d="M6 -125 Q-14 -165 -44 -170 Q-12 -150 6 -125Z" /><path d="M6 -125 Q28 -168 58 -170 Q30 -150 6 -125Z" /><path d="M6 -125 Q6 -170 8 -182 Q16 -150 6 -125Z" />
          </g>
          <circle cx="2" cy="-120" r="6" fill="#6b4a2b" /><circle cx="11" cy="-118" r="6" fill="#7a5632" />
        </g>
      ))}
      {/* field */}
      <path d="M0 300 H500 V440 H0Z" fill="url(#field)" />
      {rows.map((i) => (
        <path key={i} d={`M${250 + (i - 4) * 12} 300 L${-260 + i * 130} 440`} stroke="#a9e37f" strokeWidth={2 + i * 0.15} opacity=".55" />
      ))}
      <g fill="#1f7a38" opacity=".9">{[30, 100, 180, 330, 420, 470].map((x, i) => <path key={i} d={`M${x} 330 q-10 -22 0 -34 q10 12 0 34 M${x} 330 q-18 -8 -22 -22 q18 2 22 22 M${x} 330 q18 -8 22 -22 q-18 2 -22 22`} />)}</g>
      <g>{[[60, 372], [128, 392], [380, 380], [440, 400]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="9" fill="#e94b35" /><circle cx={x + 14} cy={y + 4} r="8" fill="#f97316" /><path d={`M${x - 4} ${y - 8} q4 -8 8 0`} stroke="#1f7a38" strokeWidth="3" fill="none" /></g>)}</g>
      {/* farmer */}
      <g>
        <ellipse cx="270" cy="428" rx="90" ry="10" fill="#1d5e30" opacity=".35" />
        <rect x="240" y="335" width="26" height="86" rx="9" fill="#7a5632" /><rect x="274" y="335" width="26" height="86" rx="9" fill="#6b4a2b" />
        <ellipse cx="250" cy="424" rx="19" ry="8" fill="#3b2a1a" /><ellipse cx="290" cy="424" rx="19" ry="8" fill="#3b2a1a" />
        <path d="M224 238 Q270 214 316 238 L324 345 L216 345Z" fill="#fffaf0" />
        <path d="M230 236 L262 240 L238 340 L218 332Z" fill="#2e8b45" opacity=".9" />
        <path d="M270 226 V345" stroke="#e5dcc8" strokeWidth="2" />
        <rect x="259" y="204" width="22" height="26" rx="8" fill="#b4733b" />
        <path d="M226 246 Q192 292 214 328" stroke="#b4733b" strokeWidth="19" strokeLinecap="round" fill="none" />
        <path d="M314 246 Q348 292 326 328" stroke="#b4733b" strokeWidth="19" strokeLinecap="round" fill="none" />
        <circle cx="270" cy="178" r="35" fill="#c07f45" />
        <circle cx="236" cy="182" r="7" fill="#b4733b" /><circle cx="304" cy="182" r="7" fill="#b4733b" />
        <path d="M233 166 Q270 112 307 166 Q270 146 233 166Z" fill="#fffaf0" />
        <path d="M235 165 Q270 148 305 165" stroke="#f97316" strokeWidth="6" fill="none" />
        <circle cx="257" cy="178" r="3.4" fill="#2b1a0e" /><circle cx="283" cy="178" r="3.4" fill="#2b1a0e" />
        <path d="M249 168 Q257 163 265 168 M275 168 Q283 163 291 168" stroke="#2b1a0e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M255 190 Q270 183 285 190 Q270 187 255 190Z" fill="#2b1a0e" />
        <path d="M252 195 Q270 214 288 195Z" fill="#fff" stroke="#6b2d14" strokeWidth="2.4" strokeLinejoin="round" />
        {/* basket */}
        <path d="M188 334 L208 404 Q270 424 332 404 L352 334Z" fill="#c58b45" />
        <g stroke="#9c6a2e" strokeWidth="2.4" fill="none"><path d="M192 352 Q270 368 348 352" /><path d="M197 372 Q270 388 343 372" /><path d="M202 390 Q270 404 338 390" /></g>
        <ellipse cx="270" cy="334" rx="82" ry="16" fill="#a8742f" />
        <g>
          <circle cx="226" cy="322" r="17" fill="#e94b35" /><circle cx="252" cy="312" r="17" fill="#d93a26" /><circle cx="283" cy="314" r="16" fill="#e94b35" /><circle cx="312" cy="322" r="16" fill="#f97316" />
          <path d="M214 310 q14 -10 28 0 M240 301 q12 -9 26 0" stroke="#1f7a38" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M268 300 q-18 -24 -4 -40 q22 16 4 40Z" fill="#43a047" /><path d="M300 304 q16 -26 34 -26 q-6 22 -34 26Z" fill="#2e8b45" />
          <path d="M204 318 L192 288 L214 304Z" fill="#f97316" /><ellipse cx="334" cy="318" rx="9" ry="16" fill="#6a2c91" transform="rotate(25 334 318)" />
        </g>
        <circle cx="210" cy="332" r="10" fill="#b4733b" /><circle cx="330" cy="332" r="10" fill="#b4733b" />
      </g>
    </svg>
  );
}

export function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#fff" opacity=".12" />
      <path d="M32 54V28" stroke="#ffc857" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M32 31C32 18 22 11 10 13c0 13 9 19 22 18Z" fill="#83c653" />
      <path d="M32 38c0-11 10-17 22-15 0 12-9 18-22 15Z" fill="#2e8b45" stroke="#bff09a" strokeWidth="1.5" />
    </svg>
  );
}
