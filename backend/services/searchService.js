function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function buildSearchRadiusPlan() {
  return [2, 5, 10];
}

function normalizeBottleType(value) {
  const normalized = String(value || 'todas').trim().toLowerCase();
  if (normalized.includes('azul')) return 'azul';
  if (normalized.includes('laranja')) return 'laranja';
  return 'todas';
}

function isBottleAvailable(entry) {
  return entry.available === true || Number(entry.available) === 1;
}

function filterAvailableBottles(entries, bottleType) {
  const normalizedType = normalizeBottleType(bottleType);

  return entries.filter((entry) => {
    if (!isBottleAvailable(entry)) return false;
    if (normalizedType === 'todas') return true;
    return normalizeBottleType(entry.bottleName) === normalizedType;
  });
}

module.exports = {
  calculateDistanceKm,
  buildSearchRadiusPlan,
  normalizeBottleType,
  filterAvailableBottles
};
