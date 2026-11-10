export const englishRoadPrefixes = [
  ['Đường ', 'Street', false],
  ['Phố ', 'Street', false],
  ['Đại lộ ', 'Boulevard', false],
  ['Hẻm ', 'Alley', true],
  ['Ngõ ', 'Lane', true],
  ['Quốc lộ ', 'National Highway', true],
  ['Tỉnh lộ ', 'Provincial Road', true],
];

export function roadName(name, lang) {
  if (!name || lang !== 'en') return name;
  const lower = name.toLowerCase();
  const match = englishRoadPrefixes.find(([prefix]) => lower.startsWith(prefix.toLowerCase()));
  if (!match) return name;
  const [prefix, label, before] = match;
  const properName = name.slice(prefix.length);
  return before ? `${label} ${properName}` : `${properName} ${label}`;
}

export const translatedPlaceFields = {
  name: 150, address: 250, owner: 150, hours: 100, waste: 250, description: 1000,
};

export function placeText(place, field, lang, fallback = place[field]) {
  if (lang !== 'en') return fallback;
  const value = place[`${field}En`];
  const translation = typeof value === 'string' ? value.trim() : '';
  if (translation) return translation;
  if (field === 'source' && fallback === 'Dữ liệu minh họa') return 'Sample data';
  if (field !== 'address' || !fallback) return fallback;
  return fallback.split(',').map(part => {
    const text = part.trim();
    if (text === 'Việt Nam') return 'Vietnam';
    const number = text.match(/^\d+[\w/-]*\s+/)?.[0] || '';
    return number + roadName(text.slice(number.length), lang);
  }).join(', ');
}
