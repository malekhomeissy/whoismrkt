// ─────────────────────────────────────────────────────────────────────────────
// City + Neighborhood geocoding for MRKT Globe.
//
// All coordinates stored as [lat, lng] — callers that pass to GeoJSON/MapLibre
// must convert to [lng, lat]. resolveLocationCoords() returns { lat, lng }.
// ─────────────────────────────────────────────────────────────────────────────

export const CITY_COORDS: Record<string, [number, number]> = {
  // ── Beirut neighborhoods ───────────────────────────────────────────────────
  "achrafieh":                   [33.8936,  35.5237],
  "ashrafieh":                   [33.8936,  35.5237],
  "hamra":                       [33.8985,  35.4868],
  "gemmayzeh":                   [33.8882,  35.5183],
  "mar mikhael":                 [33.8865,  35.5217],
  "verdun":                      [33.8833,  35.4878],
  "raouche":                     [33.8928,  35.4791],
  "badaro":                      [33.8763,  35.5162],
  "zarif":                       [33.8842,  35.4982],
  "sodeco":                      [33.8929,  35.5192],
  "sassine":                     [33.8936,  35.5234],
  "ain el mreisseh":             [33.8982,  35.4840],
  "downtown beirut":             [33.8939,  35.5033],
  "solidere":                    [33.8939,  35.5033],
  "kantari":                     [33.8890,  35.4968],
  "clemenceau":                  [33.8908,  35.4950],
  "sanayeh":                     [33.8930,  35.4904],
  "tallet el khayat":            [33.8797,  35.4942],
  "ras beirut":                  [33.8976,  35.4804],
  "manara":                      [33.8963,  35.4740],
  // ── Middle East cities ────────────────────────────────────────────────────
  "abu dhabi":                   [24.4539,  54.3773],
  "sharjah":                     [25.3462,  55.4209],
  "ajman":                       [25.4052,  55.5136],
  "ras al khaimah":              [25.7933,  55.9762],
  "beirut":                      [33.8938,  35.5018],
  "jounieh":                     [33.9772,  35.6158],
  "riyadh":                      [24.6877,  46.7219],
  "jeddah":                      [21.5433,  39.1728],
  "mecca":                       [21.3891,  39.8579],
  "doha":                        [25.2854,  51.5310],
  "kuwait city":                 [29.3759,  47.9774],
  "muscat":                      [23.5859,  58.4059],
  "manama":                      [26.2154,  50.5832],
  "amman":                       [31.9516,  35.9239],
  "cairo":                       [30.0444,  31.2357],
  "istanbul":                    [41.0082,  28.9784],
  "ankara":                      [39.9334,  32.8597],
  "tel aviv":                    [32.0853,  34.7818],
  "jerusalem":                   [31.7683,  35.2137],
  "baghdad":                     [33.3152,  44.3661],
  "tehran":                      [35.6892,  51.3890],
  // ── Dubai neighborhoods ───────────────────────────────────────────────────
  "jumeirah":                    [25.2105,  55.2559],
  "jumeirah 1":                  [25.2018,  55.2421],
  "jumeirah 2":                  [25.1967,  55.2330],
  "jumeirah 3":                  [25.1899,  55.2224],
  "difc":                        [25.2131,  55.2803],
  "jbr":                         [25.0762,  55.1368],
  "jumeirah beach residence":    [25.0762,  55.1368],
  "al quoz":                     [25.1565,  55.2233],
  "deira":                       [25.2697,  55.3225],
  "bur dubai":                   [25.2621,  55.2991],
  "karama":                      [25.2380,  55.3063],
  "satwa":                       [25.2303,  55.2819],
  "mirdif":                      [25.2236,  55.4111],
  "al barsha":                   [25.1042,  55.2029],
  "dubai hills":                 [25.1118,  55.2651],
  "dubai marina":                [25.0774,  55.1393],
  "palm jumeirah":               [25.1124,  55.1390],
  "downtown dubai":              [25.1972,  55.2744],
  "business bay":                [25.1879,  55.2691],
  "creek harbour":               [25.2052,  55.3496],
  // ── Europe ────────────────────────────────────────────────────────────────
  "london":                      [51.5074,  -0.1278],
  "paris":                       [48.8566,   2.3522],
  "milan":                       [45.4654,   9.1859],
  "rome":                        [41.9028,  12.4964],
  "madrid":                      [40.4168,  -3.7038],
  "barcelona":                   [41.3851,   2.1734],
  "berlin":                      [52.5200,  13.4050],
  "hamburg":                     [53.5511,   9.9937],
  "munich":                      [48.1351,  11.5820],
  "amsterdam":                   [52.3676,   4.9041],
  "zurich":                      [47.3769,   8.5417],
  "geneva":                      [46.2044,   6.1432],
  "vienna":                      [48.2082,  16.3738],
  "stockholm":                   [59.3293,  18.0686],
  "copenhagen":                  [55.6761,  12.5683],
  "oslo":                        [59.9139,  10.7522],
  "helsinki":                    [60.1699,  24.9384],
  "brussels":                    [50.8503,   4.3517],
  "lisbon":                      [38.7223,  -9.1393],
  "porto":                       [41.1579,  -8.6291],
  "athens":                      [37.9838,  23.7275],
  "warsaw":                      [52.2297,  21.0122],
  "prague":                      [50.0755,  14.4378],
  "budapest":                    [47.4979,  19.0402],
  "bucharest":                   [44.4268,  26.1025],
  "kyiv":                        [50.4501,  30.5234],
  "moscow":                      [55.7558,  37.6173],
  "st. petersburg":              [59.9311,  30.3609],
  // ── North America ─────────────────────────────────────────────────────────
  "new york":                    [40.7128, -74.0060],
  "los angeles":                 [34.0522,-118.2437],
  "miami":                       [25.7617, -80.1918],
  "chicago":                     [41.8781, -87.6298],
  "houston":                     [29.7604, -95.3698],
  "dallas":                      [32.7767, -96.7970],
  "atlanta":                     [33.7490, -84.3880],
  "san francisco":               [37.7749,-122.4194],
  "seattle":                     [47.6062,-122.3321],
  "las vegas":                   [36.1699,-115.1398],
  "nashville":                   [36.1627, -86.7816],
  "boston":                      [42.3601, -71.0589],
  "washington":                  [38.9072, -77.0369],
  "toronto":                     [43.6532, -79.3832],
  "montreal":                    [45.5017, -73.5673],
  "vancouver":                   [49.2827,-123.1207],
  "mexico city":                 [19.4326, -99.1332],
  // ── Asia Pacific ──────────────────────────────────────────────────────────
  "tokyo":                       [35.6762, 139.6503],
  "osaka":                       [34.6937, 135.5023],
  "seoul":                       [37.5665, 126.9780],
  "busan":                       [35.1796, 129.0756],
  "singapore":                   [1.3521,  103.8198],
  "hong kong":                   [22.3193, 114.1694],
  "taipei":                      [25.0330, 121.5654],
  "shanghai":                    [31.2304, 121.4737],
  "beijing":                     [39.9042, 116.4074],
  "shenzhen":                    [22.5431, 114.0579],
  "guangzhou":                   [23.1291, 113.2644],
  "bangkok":                     [13.7563, 100.5018],
  "jakarta":                     [-6.2088, 106.8456],
  "kuala lumpur":                [3.1390,  101.6869],
  "manila":                      [14.5995, 120.9842],
  "ho chi minh city":            [10.8231, 106.6297],
  "mumbai":                      [19.0760,  72.8777],
  "delhi":                       [28.6139,  77.2090],
  "bangalore":                   [12.9716,  77.5946],
  "kolkata":                     [22.5726,  88.3639],
  "lahore":                      [31.5204,  74.3587],
  "karachi":                     [24.8607,  67.0011],
  "dhaka":                       [23.8103,  90.4125],
  "colombo":                     [6.9271,   79.8612],
  "sydney":                      [-33.8688, 151.2093],
  "melbourne":                   [-37.8136, 144.9631],
  "brisbane":                    [-27.4698, 153.0251],
  "perth":                       [-31.9505, 115.8605],
  "auckland":                    [-36.8485, 174.7633],
  // ── Africa ────────────────────────────────────────────────────────────────
  "johannesburg":                [-26.2041,  28.0473],
  "cape town":                   [-33.9249,  18.4241],
  "lagos":                       [6.5244,    3.3792],
  "accra":                       [5.6037,   -0.1870],
  "nairobi":                     [-1.2921,  36.8219],
  "addis ababa":                 [9.0320,   38.7423],
  "casablanca":                  [33.5731,  -7.5898],
  "tunis":                       [36.8065,  10.1815],
  "algiers":                     [36.7372,   3.0865],
  "khartoum":                    [15.5007,  32.5599],
  // ── South America ─────────────────────────────────────────────────────────
  "são paulo":                   [-23.5505, -46.6333],
  "sao paulo":                   [-23.5505, -46.6333],
  "rio de janeiro":              [-22.9068, -43.1729],
  "bogotá":                      [4.7110,  -74.0721],
  "bogota":                      [4.7110,  -74.0721],
  "buenos aires":                [-34.6037, -58.3816],
  "lima":                        [-12.0464, -77.0428],
  "santiago":                    [-33.4489, -70.6693],
  "medellin":                    [6.2442,  -75.5812],
  "caracas":                     [10.4806, -66.9036],
  "montevideo":                  [-34.9011, -56.1645],
};

// ─────────────────────────────────────────────────────────────────────────────
// Exact match lookup
// ─────────────────────────────────────────────────────────────────────────────

export function geocodeCity(city: string): [number, number] | null {
  return CITY_COORDS[city.toLowerCase().trim()] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fuzzy lookup — used by the Globe at runtime for creators without stored coords
// Returns [lat, lng] (NOT [lng, lat] — callers must swap for GeoJSON)
// ─────────────────────────────────────────────────────────────────────────────

export function guessCoords(locationText: string): [number, number] | null {
  if (!locationText) return null;
  const lower = locationText.toLowerCase().trim();

  // Exact match
  const exact = geocodeCity(lower);
  if (exact) return exact;

  // locationText contains a known key ("Achrafieh, Beirut" → matches "achrafieh")
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(key)) return coords;
  }

  // A known key contains locationText ("beirut" is inside "downtown beirut")
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (key.includes(lower)) return coords;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic jitter — stable offset from user ID so stacked city markers
// spread out consistently across sessions.
// Returns [lngOffset, latOffset] in degrees (~±900 m at equator).
// ─────────────────────────────────────────────────────────────────────────────

export function deterministicJitter(userId: string): [number, number] {
  let h1 = 0, h2 = 0;
  for (let i = 0; i < userId.length; i++) {
    const c = userId.charCodeAt(i);
    h1 = ((h1 * 31 + c) & 0x7fffffff);
    h2 = ((h2 * 37 + c) & 0x7fffffff);
  }
  const lngOff = ((h1 % 10000) / 10000) * 0.018 - 0.009; // ±0.009° ≈ ±900 m
  const latOff = ((h2 % 10000) / 10000) * 0.018 - 0.009;
  return [lngOff, latOff];
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve coordinates for storing to the database at profile save time.
//
// Priority:
//   1. area + city  → neighbourhood-level match, tiny scatter (±90 m)
//   2. city only    → city-centre match, full jitter (±900 m) so stacking avoided
//   3. no match     → { lat: null, lng: null }
//
// Returns { lat, lng } — store these in location_lat / location_lng.
// ─────────────────────────────────────────────────────────────────────────────

export function resolveLocationCoords(
  area: string,
  city: string,
  userId: string,
): { lat: number | null; lng: number | null } {
  const aNorm = area.trim().toLowerCase();
  const cNorm = city.trim().toLowerCase();
  const [jLng, jLat] = deterministicJitter(userId);

  // 1. Try area key directly ("achrafieh", "hamra", "difc" …)
  if (aNorm) {
    const areaHit = geocodeCity(aNorm);
    if (areaHit) {
      return { lat: areaHit[0] + jLat * 0.1, lng: areaHit[1] + jLng * 0.1 };
    }
    // Partial area match
    for (const [key, coords] of Object.entries(CITY_COORDS)) {
      if (aNorm.includes(key) || key.includes(aNorm)) {
        return { lat: coords[0] + jLat * 0.1, lng: coords[1] + jLng * 0.1 };
      }
    }
  }

  // 2. Fall back to city-level + full jitter
  if (cNorm) {
    const cityHit = geocodeCity(cNorm);
    if (cityHit) {
      return { lat: cityHit[0] + jLat, lng: cityHit[1] + jLng };
    }
    for (const [key, coords] of Object.entries(CITY_COORDS)) {
      if (cNorm.includes(key) || key.includes(cNorm)) {
        return { lat: coords[0] + jLat, lng: coords[1] + jLng };
      }
    }
  }

  return { lat: null, lng: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Build city density map (used by Globe right sidebar)
// ─────────────────────────────────────────────────────────────────────────────

export function buildCityDensity(
  locations: Array<{ city: string | null; lat: number | null; lng: number | null }>
): Array<{ city: string; count: number; lat: number; lng: number }> {
  const counts: Record<string, { count: number; lat: number; lng: number }> = {};

  for (const loc of locations) {
    if (!loc.city) continue;
    const cityKey = loc.city.trim();
    if (!cityKey) continue;

    let lat = loc.lat;
    let lng = loc.lng;

    if (lat == null || lng == null) {
      const coords = guessCoords(cityKey);
      if (!coords) continue;
      [lat, lng] = coords; // guessCoords returns [lat, lng]
    }

    if (counts[cityKey]) {
      counts[cityKey].count += 1;
    } else {
      counts[cityKey] = { count: 1, lat, lng };
    }
  }

  return Object.entries(counts)
    .map(([city, data]) => ({ city, ...data }))
    .sort((a, b) => b.count - a.count);
}
