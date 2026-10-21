// Weather provider abstraction. Set WEATHER_PROVIDER + WEATHER_API_KEY and implement `fetchLive`
// to return { tempC, humidity, summary, forecast:[{day, hiC, loC, summary}] } for a district centre.
// Until then the API returns clearly labelled SAMPLE data (live:false) — never presented as observed.
import { districtByKey } from '../../shared/geo.js';

export async function getWeather(districtKey) {
  const d = districtByKey(districtKey) || districtByKey('bengaluru_rural');
  if (process.env.WEATHER_API_KEY && process.env.WEATHER_PROVIDER) {
    console.warn('Weather provider hook not implemented; returning sample data.');
  }
  return {
    live: false,
    label: 'Sample Weather — Not Live',
    district: d.key,
    sample: {
      tempC: 27, humidity: 68, summary: 'sampleSummary',
      forecast: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => ({ day, hiC: 29 + (i % 3), loC: 21 + (i % 2), summary: i % 2 ? 'sampleCloudy' : 'samplePartly' })),
    },
  };
}
