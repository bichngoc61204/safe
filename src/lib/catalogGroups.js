export const catalogGroups = [
  { id: 'safe', label: 'safe', icon: 'shield', color: '#39678b' },
  { id: 'green', label: 'green', icon: 'recycle', color: '#237452' },
  { id: 'partner', label: 'partner', icon: 'leaf', color: '#855f35' },
];

// Older catalogs used "service" as a fourth group and had a duplicate partner category.
export function organizeCatalog(data) {
  if (!Array.isArray(data?.categories) || !Array.isArray(data?.places)) return data;
  const legacyPartner = data.categories.find(category =>
    category?.id === 'partner' && category.kind === 'partner' && category.name === 'Đối tác xanh' &&
    category.nameEn === 'Green partners' && category.icon === 'leaf' && category.color === '#7c9d52');
  const service = data.categories.find(category =>
    category.id === 'service' && category.name === 'Dịch vụ' && ['service','partner'].includes(category.kind));
  const mergePartner = Boolean(legacyPartner && service);
  const support = data.categories.find(category => category.id === 'safe' && category.name === 'An toàn');
  const policePlace = support && data.places.find(place => place.id === '1' && place.category === 'safe' &&
    place.name === 'Công an Phường Mỹ An / An Thượng');
  const canSplitPolice = Boolean(policePlace && !data.categories.some(category => category.id === 'police') &&
    data.categories.length - Number(mergePartner) < 40);
  if (!legacyPartner && !support && !data.categories.some(category => category.kind === 'service')) return data;

  const categories = data.categories.filter(category => !mergePartner || category !== legacyPartner).map(category => {
    if (category === legacyPartner) return { ...category, name: 'Dịch vụ', nameEn: 'Services' };
    if (category === support) return { ...category, name: 'Hỗ trợ cộng đồng', nameEn: 'Community support' };
    if (category.kind === 'service') return { ...category, kind: 'partner' };
    return category;
  });
  if (canSplitPolice) {
    categories.unshift({ ...support, id: 'police', name: 'Công an', nameEn: 'Police' });
  }
  const places = data.places.map(place => {
    if (mergePartner && place.category === 'partner') return { ...place, category: 'service' };
    if (canSplitPolice && place === policePlace) return { ...place, category: 'police' };
    return place;
  });
  return { ...data, categories, places };
}
