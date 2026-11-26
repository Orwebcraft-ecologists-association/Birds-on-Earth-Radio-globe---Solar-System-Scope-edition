import countriesAtlas from 'world-atlas/countries-110m.json';
import { feature } from 'topojson-client';
import type { RadioStation } from '../types';

export type LonLat = [number, number];

export interface CountryPolygon {
    outer: LonLat[];
    holes: LonLat[][];
    area: number;
    minLon: number;
    maxLon: number;
    minLat: number;
    maxLat: number;
}

export interface CountryGeoEntry {
    id: string;
    name: string;
    atlasName: string;
    center: { lat: number; lon: number };
    polygons: CountryPolygon[];
}

const ATLAS_DISPLAY_NAME_MAP: Record<string, string> = {
    'United States of America': 'United States',
    'United Kingdom': 'United Kingdom',
    'Russian Federation': 'Russia',
    'Bosnia and Herz.': 'Bosnia and Herzegovina',
    'Central African Rep.': 'Central African Republic',
    'Dem. Rep. Congo': 'DR Congo',
    'Dominican Rep.': 'Dominican Republic',
    'Eq. Guinea': 'Equatorial Guinea',
    'eSwatini': 'Eswatini',
    'Falkland Is.': 'Falkland Islands',
    'Fr. S. Antarctic Lands': 'French Southern Territories',
    'Macedonia': 'North Macedonia',
    'N. Cyprus': 'Northern Cyprus',
    'S. Sudan': 'South Sudan',
    'Solomon Is.': 'Solomon Islands',
    'Somaliland': 'Somaliland',
    'W. Sahara': 'Western Sahara',
    "Côte d'Ivoire": 'Ivory Coast',
    'Czechia': 'Czech Republic',
    'Korea': 'South Korea',
    'South Korea': 'South Korea',
    'North Korea': 'North Korea',
    'Dem. Rep. Korea': 'North Korea',
    'Republic of Korea': 'South Korea',
    'Lao PDR': 'Laos',
    'Viet Nam': 'Vietnam',
    'Brunei': 'Brunei',
    'Myanmar': 'Myanmar',
    'Iran': 'Iran',
    'Syria': 'Syria',
    'Türkiye': 'Turkey',
    'Turkey': 'Turkey',
    'Palestine': 'Palestine',
    'Taiwan': 'Taiwan',
    'Congo': 'Republic of the Congo',
    'Republic of the Congo': 'Republic of the Congo',
    'Tanzania': 'Tanzania',
    'Moldova': 'Moldova',
    'Venezuela': 'Venezuela',
    'Bolivia': 'Bolivia',
};

const COUNTRY_ALIAS_LOOKUP: Record<string, string> = {
    'usa': 'United States',
    'us': 'United States',
    'u.s.': 'United States',
    'u.s.a.': 'United States',
    'united states': 'United States',
    'united states of america': 'United States',
    'the united states': 'United States',
    'uk': 'United Kingdom',
    'u.k.': 'United Kingdom',
    'great britain': 'United Kingdom',
    'britain': 'United Kingdom',
    'england': 'United Kingdom',
    'scotland': 'United Kingdom',
    'wales': 'United Kingdom',
    'northern ireland': 'United Kingdom',
    'united kingdom': 'United Kingdom',
    'russia': 'Russia',
    'russian federation': 'Russia',
    'the russian federation': 'Russia',
    'czechia': 'Czech Republic',
    'czech republic': 'Czech Republic',
    'türkiye': 'Turkey',
    'turkiye': 'Turkey',
    'turkey': 'Turkey',
    'republic of korea': 'South Korea',
    'korea, republic of': 'South Korea',
    'south korea': 'South Korea',
    'democratic peoples republic of korea': 'North Korea',
    'north korea': 'North Korea',
    'viet nam': 'Vietnam',
    'vietnam': 'Vietnam',
    'iran, islamic republic of': 'Iran',
    'iran': 'Iran',
    'islamic republic of iran': 'Iran',
    'tanzania, united republic of': 'Tanzania',
    'united republic of tanzania': 'Tanzania',
    'tanzania': 'Tanzania',
    'syrian arab republic': 'Syria',
    'syria': 'Syria',
    'bolivia, plurinational state of': 'Bolivia',
    'bolivia': 'Bolivia',
    'venezuela, bolivarian republic of': 'Venezuela',
    'venezuela': 'Venezuela',
    'moldova, republic of': 'Moldova',
    'republic of moldova': 'Moldova',
    'moldova': 'Moldova',
    'lao peoples democratic republic': 'Laos',
    'laos': 'Laos',
    'cote divoire': 'Ivory Coast',
    "côte d'ivoire": 'Ivory Coast',
    'ivory coast': 'Ivory Coast',
    'democratic republic of the congo': 'DR Congo',
    'dr congo': 'DR Congo',
    'dem. rep. congo': 'DR Congo',
    'congo, democratic republic of the': 'DR Congo',
    'bosnia and herzegovina': 'Bosnia and Herzegovina',
    'bosnia and herz.': 'Bosnia and Herzegovina',
    'the netherlands': 'Netherlands',
    'netherlands': 'Netherlands',
    'uae': 'United Arab Emirates',
    'united arab emirates': 'United Arab Emirates',
    'taiwan, province of china': 'Taiwan',
    'taiwan': 'Taiwan',
    'state of palestine': 'Palestine',
    'palestinian territory': 'Palestine',
    'palestine': 'Palestine',
    'north macedonia': 'North Macedonia',
    'macedonia': 'North Macedonia',
    'republic of china': 'Taiwan',
    'eswatini': 'Eswatini',
    'swaziland': 'Eswatini',
    'myanmar': 'Myanmar',
    'burma': 'Myanmar',
    'cabo verde': 'Cape Verde',
    'cape verde': 'Cape Verde',
    'hong kong': 'Hong Kong',
    'macau': 'Macau',
    'macao': 'Macau',
    'singapore': 'Singapore',
    'malta': 'Malta',
    'bahrain': 'Bahrain',
    'mauritius': 'Mauritius',
    'maldives': 'Maldives',
    'barbados': 'Barbados',
    'andorra': 'Andorra',
    'monaco': 'Monaco',
    'liechtenstein': 'Liechtenstein',
    'san marino': 'San Marino',
    'seychelles': 'Seychelles',
};

// Micro-states & territories too small for 110m Natural Earth polygons
const MICROSTATE_CENTERS: Record<string, { lat: number; lon: number }> = {
    'Singapore': { lat: 1.3521, lon: 103.8198 },
    'Malta': { lat: 35.8989, lon: 14.5146 },
    'Bahrain': { lat: 26.0667, lon: 50.5577 },
    'Hong Kong': { lat: 22.3193, lon: 114.1694 },
    'Macau': { lat: 22.1987, lon: 113.5439 },
    'Monaco': { lat: 43.7384, lon: 7.4246 },
    'Andorra': { lat: 42.5063, lon: 1.5218 },
    'Liechtenstein': { lat: 47.166, lon: 9.5554 },
    'San Marino': { lat: 43.9424, lon: 12.4578 },
    'Vatican City': { lat: 41.9029, lon: 12.4534 },
    'Barbados': { lat: 13.1939, lon: -59.5432 },
    'Mauritius': { lat: -20.3484, lon: 57.5522 },
    'Maldives': { lat: 4.1755, lon: 73.5093 },
    'Seychelles': { lat: -4.6796, lon: 55.492 },
    'Cape Verde': { lat: 14.933, lon: -23.5133 },
    'Saint Lucia': { lat: 13.9094, lon: -60.9789 },
    'Antigua and Barbuda': { lat: 17.0608, lon: -61.7964 },
    'Grenada': { lat: 12.1165, lon: -61.679 },
    'Comoros': { lat: -11.6455, lon: 43.3333 },
    'Samoa': { lat: -13.759, lon: -172.1046 },
    'Tonga': { lat: -21.179, lon: -175.1982 },
    'Bermuda': { lat: 32.3078, lon: -64.7505 },
    'Gibraltar': { lat: 36.1408, lon: -5.3536 },
};

// Verified city coordinates for major radio hubs around the world
const CITY_COORDS: { keywords: string[]; country?: string; lat: number; lon: number }[] = [
    { keywords: ['tel aviv', 'jaffa', 'yafo', 'holon', 'ramat gan', 'herzliya', 'gush dan'], country: 'Israel', lat: 32.0853, lon: 34.7818 },
    { keywords: ['jerusalem', 'yerushalayim'], country: 'Israel', lat: 31.7683, lon: 35.2137 },
    { keywords: ['haifa', 'krayot'], country: 'Israel', lat: 32.794, lon: 34.9896 },
    { keywords: ['beer sheva', 'beersheba', 'be\'er sheva', 'negev'], country: 'Israel', lat: 31.253, lon: 34.7915 },
    { keywords: ['eilat'], country: 'Israel', lat: 29.5577, lon: 34.9519 },
    { keywords: ['new york', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx'], country: 'United States', lat: 40.7128, lon: -74.006 },
    { keywords: ['los angeles', 'hollywood', 'santa monica', 'pasadena'], country: 'United States', lat: 34.0522, lon: -118.2437 },
    { keywords: ['chicago'], country: 'United States', lat: 41.8781, lon: -87.6298 },
    { keywords: ['san francisco', 'oakland', 'berkeley', 'bay area'], country: 'United States', lat: 37.7749, lon: -122.4194 },
    { keywords: ['miami'], country: 'United States', lat: 25.7617, lon: -80.1918 },
    { keywords: ['seattle'], country: 'United States', lat: 47.6062, lon: -122.3321 },
    { keywords: ['austin'], country: 'United States', lat: 30.2672, lon: -97.7431 },
    { keywords: ['boston', 'cambridge'], country: 'United States', lat: 42.3601, lon: -71.0589 },
    { keywords: ['washington', 'dc'], country: 'United States', lat: 38.9072, lon: -77.0369 },
    { keywords: ['nashville'], country: 'United States', lat: 36.1627, lon: -86.7816 },
    { keywords: ['denver'], country: 'United States', lat: 39.7392, lon: -104.9903 },
    { keywords: ['honolulu', 'hawaii'], country: 'United States', lat: 21.3069, lon: -157.8583 },
    { keywords: ['anchorage', 'alaska'], country: 'United States', lat: 61.2181, lon: -149.9003 },
    { keywords: ['london', 'bbc'], country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
    { keywords: ['manchester'], country: 'United Kingdom', lat: 53.4808, lon: -2.2426 },
    { keywords: ['edinburgh'], country: 'United Kingdom', lat: 55.9533, lon: -3.1883 },
    { keywords: ['glasgow'], country: 'United Kingdom', lat: 55.8642, lon: -4.2518 },
    { keywords: ['paris', 'ile-de-france', 'île-de-france'], country: 'France', lat: 48.8566, lon: 2.3522 },
    { keywords: ['lyon'], country: 'France', lat: 45.764, lon: 4.8357 },
    { keywords: ['marseille'], country: 'France', lat: 43.2965, lon: 5.3698 },
    { keywords: ['berlin'], country: 'Germany', lat: 52.52, lon: 13.405 },
    { keywords: ['munich', 'münchen', 'bayern', 'bavaria'], country: 'Germany', lat: 48.1351, lon: 11.582 },
    { keywords: ['hamburg'], country: 'Germany', lat: 53.5511, lon: 9.9937 },
    { keywords: ['frankfurt', 'hessen'], country: 'Germany', lat: 50.1109, lon: 8.6821 },
    { keywords: ['cologne', 'köln', 'nordrhein'], country: 'Germany', lat: 50.9375, lon: 6.9603 },
    { keywords: ['amsterdam', 'noord-holland'], country: 'Netherlands', lat: 52.3676, lon: 4.9041 },
    { keywords: ['rotterdam'], country: 'Netherlands', lat: 51.9244, lon: 4.4777 },
    { keywords: ['hilversum'], country: 'Netherlands', lat: 52.2292, lon: 5.1669 },
    { keywords: ['madrid'], country: 'Spain', lat: 40.4168, lon: -3.7038 },
    { keywords: ['barcelona', 'catalunya', 'catalonia'], country: 'Spain', lat: 41.3874, lon: 2.1686 },
    { keywords: ['rome', 'roma', 'lazio'], country: 'Italy', lat: 41.9028, lon: 12.4964 },
    { keywords: ['milan', 'milano', 'lombardia'], country: 'Italy', lat: 45.4642, lon: 9.19 },
    { keywords: ['zurich', 'zürich'], country: 'Switzerland', lat: 47.3769, lon: 8.5417 },
    { keywords: ['geneva', 'genève'], country: 'Switzerland', lat: 46.2044, lon: 6.1432 },
    { keywords: ['vienna', 'wien'], country: 'Austria', lat: 48.2082, lon: 16.3738 },
    { keywords: ['lisbon', 'lisboa'], country: 'Portugal', lat: 38.7223, lon: -9.1393 },
    { keywords: ['dublin'], country: 'Ireland', lat: 53.3498, lon: -6.2603 },
    { keywords: ['stockholm'], country: 'Sweden', lat: 59.3293, lon: 18.0686 },
    { keywords: ['oslo'], country: 'Norway', lat: 59.9139, lon: 10.7522 },
    { keywords: ['copenhagen', 'københavn'], country: 'Denmark', lat: 55.6761, lon: 12.5683 },
    { keywords: ['helsinki'], country: 'Finland', lat: 60.1699, lon: 24.9384 },
    { keywords: ['reykjavik', 'reykjavík'], country: 'Iceland', lat: 64.1466, lon: -21.9426 },
    { keywords: ['warsaw', 'warszawa'], country: 'Poland', lat: 52.2297, lon: 21.0122 },
    { keywords: ['prague', 'praha'], country: 'Czech Republic', lat: 50.0755, lon: 14.4378 },
    { keywords: ['athens', 'athina'], country: 'Greece', lat: 37.9838, lon: 23.7275 },
    { keywords: ['istanbul'], country: 'Turkey', lat: 41.0082, lon: 28.9784 },
    { keywords: ['ankara'], country: 'Turkey', lat: 39.9334, lon: 32.8597 },
    { keywords: ['moscow', 'moskva'], country: 'Russia', lat: 55.7558, lon: 37.6173 },
    { keywords: ['st petersburg', 'saint petersburg'], country: 'Russia', lat: 59.9311, lon: 30.3609 },
    { keywords: ['kyiv', 'kiev'], country: 'Ukraine', lat: 50.4501, lon: 30.5234 },
    { keywords: ['toronto', 'ontario'], country: 'Canada', lat: 43.6532, lon: -79.3832 },
    { keywords: ['montreal', 'montréal', 'quebec', 'québec'], country: 'Canada', lat: 45.5017, lon: -73.5673 },
    { keywords: ['vancouver', 'british columbia'], country: 'Canada', lat: 49.2827, lon: -123.1207 },
    { keywords: ['mexico city', 'ciudad de méxico', 'cdmx'], country: 'Mexico', lat: 19.4326, lon: -99.1332 },
    { keywords: ['bogota', 'bogotá'], country: 'Colombia', lat: 4.711, lon: -74.0721 },
    { keywords: ['são paulo', 'sao paulo'], country: 'Brazil', lat: -23.5505, lon: -46.6333 },
    { keywords: ['rio de janeiro'], country: 'Brazil', lat: -22.9068, lon: -43.1729 },
    { keywords: ['buenos aires'], country: 'Argentina', lat: -34.6037, lon: -58.3816 },
    { keywords: ['santiago'], country: 'Chile', lat: -33.4489, lon: -70.6693 },
    { keywords: ['lima'], country: 'Peru', lat: -12.0464, lon: -77.0428 },
    { keywords: ['tokyo'], country: 'Japan', lat: 35.6762, lon: 139.6503 },
    { keywords: ['osaka'], country: 'Japan', lat: 34.6937, lon: 135.5023 },
    { keywords: ['kyoto'], country: 'Japan', lat: 35.0116, lon: 135.7681 },
    { keywords: ['seoul'], country: 'South Korea', lat: 37.5665, lon: 126.978 },
    { keywords: ['beijing'], country: 'China', lat: 39.9042, lon: 116.4074 },
    { keywords: ['shanghai'], country: 'China', lat: 31.2304, lon: 121.4737 },
    { keywords: ['taipei'], country: 'Taiwan', lat: 25.033, lon: 121.5654 },
    { keywords: ['mumbai', 'maharashtra'], country: 'India', lat: 19.076, lon: 72.8777 },
    { keywords: ['delhi', 'new delhi'], country: 'India', lat: 28.6139, lon: 77.209 },
    { keywords: ['bengaluru', 'bangalore'], country: 'India', lat: 12.9716, lon: 77.5946 },
    { keywords: ['bangkok'], country: 'Thailand', lat: 13.7563, lon: 100.5018 },
    { keywords: ['jakarta'], country: 'Indonesia', lat: -6.2088, lon: 106.8456 },
    { keywords: ['manila'], country: 'Philippines', lat: 14.5995, lon: 120.9842 },
    { keywords: ['sydney', 'new south wales', 'nsw'], country: 'Australia', lat: -33.8688, lon: 151.2093 },
    { keywords: ['melbourne', 'victoria'], country: 'Australia', lat: -37.8136, lon: 144.9631 },
    { keywords: ['brisbane', 'queensland'], country: 'Australia', lat: -27.4698, lon: 153.0251 },
    { keywords: ['perth'], country: 'Australia', lat: -31.9505, lon: 115.8605 },
    { keywords: ['auckland'], country: 'New Zealand', lat: -36.8485, lon: 174.7633 },
    { keywords: ['wellington'], country: 'New Zealand', lat: -41.2865, lon: 174.7762 },
    { keywords: ['cairo'], country: 'Egypt', lat: 30.0444, lon: 31.2357 },
    { keywords: ['casablanca'], country: 'Morocco', lat: 33.5731, lon: -7.5898 },
    { keywords: ['nairobi'], country: 'Kenya', lat: -1.2921, lon: 36.8219 },
    { keywords: ['lagos'], country: 'Nigeria', lat: 6.5244, lon: 3.3792 },
    { keywords: ['johannesburg', 'gauteng'], country: 'South Africa', lat: -26.2041, lon: 28.0473 },
    { keywords: ['cape town', 'western cape'], country: 'South Africa', lat: -33.9249, lon: 18.4241 },
    { keywords: ['dubai'], country: 'United Arab Emirates', lat: 25.2048, lon: 55.2708 },
    { keywords: ['abu dhabi'], country: 'United Arab Emirates', lat: 24.4539, lon: 54.3773 },
];

export function normalizeCountryName(raw: string): string {
    const trimmed = (raw || '').trim();
    if (!trimmed) return '';
    if (ATLAS_DISPLAY_NAME_MAP[trimmed]) return ATLAS_DISPLAY_NAME_MAP[trimmed];
    const key = trimmed.toLowerCase().replace(/\s+/g, ' ');
    if (COUNTRY_ALIAS_LOOKUP[key]) return COUNTRY_ALIAS_LOOKUP[key];
    return trimmed;
}

function unwrapRing(ring: number[][]): LonLat[] {
    if (!ring || ring.length === 0) return [];
    const out: LonLat[] = [[ring[0][0], ring[0][1]]];
    for (let i = 1; i < ring.length; i++) {
        let lon = ring[i][0];
        const lat = ring[i][1];
        const prevLon = out[i - 1][0];
        while (lon - prevLon > 180) lon -= 360;
        while (lon - prevLon < -180) lon += 360;
        out.push([lon, lat]);
    }
    return out;
}

function ringSignedArea(ring: LonLat[]): number {
    let area = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
    }
    return area * 0.5;
}

function pointInRing(lon: number, lat: number, ring: LonLat[]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0];
        const yi = ring[i][1];
        const xj = ring[j][0];
        const yj = ring[j][1];
        const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

function pointInPolygonRaw(lon: number, lat: number, poly: CountryPolygon): boolean {
    if (lat < poly.minLat || lat > poly.maxLat) return false;
    const shifts = [0, -360, 360];
    for (const shift of shifts) {
        const testLon = lon + shift;
        if (testLon < poly.minLon || testLon > poly.maxLon) continue;
        if (pointInRing(testLon, lat, poly.outer)) {
            let inHole = false;
            for (const hole of poly.holes) {
                if (pointInRing(testLon, lat, hole)) {
                    inHole = true;
                    break;
                }
            }
            if (!inHole) return true;
        }
    }
    return false;
}

function computePolygonInteriorPoint(poly: CountryPolygon): { lat: number; lon: number } {
    let sumLon = 0;
    let sumLat = 0;
    const n = poly.outer.length;
    for (const [lon, lat] of poly.outer) {
        sumLon += lon;
        sumLat += lat;
    }
    const avgLon = sumLon / Math.max(1, n);
    const avgLat = sumLat / Math.max(1, n);
    const normLon = (v: number) => ((((v + 180) % 360) + 360) % 360) - 180;

    if (pointInPolygonRaw(normLon(avgLon), avgLat, poly)) {
        return { lat: avgLat, lon: normLon(avgLon) };
    }

    // Pole-of-inaccessibility style grid search for concave / crescent countries
    let bestLat = avgLat;
    let bestLon = avgLon;
    let bestMinDist = -1;
    const steps = 11;
    for (let iy = 1; iy < steps; iy++) {
        const lat = poly.minLat + ((poly.maxLat - poly.minLat) * iy) / steps;
        for (let ix = 1; ix < steps; ix++) {
            const lon = poly.minLon + ((poly.maxLon - poly.minLon) * ix) / steps;
            if (!pointInRing(lon, lat, poly.outer)) continue;
            let inHole = false;
            for (const hole of poly.holes) {
                if (pointInRing(lon, lat, hole)) {
                    inHole = true;
                    break;
                }
            }
            if (inHole) continue;
            let minD2 = Infinity;
            for (let k = 0; k < poly.outer.length; k++) {
                const dx = poly.outer[k][0] - lon;
                const dy = poly.outer[k][1] - lat;
                const d2 = dx * dx + dy * dy;
                if (d2 < minD2) minD2 = d2;
            }
            if (minD2 > bestMinDist) {
                bestMinDist = minD2;
                bestLat = lat;
                bestLon = lon;
            }
        }
    }
    return {
        lat: Math.max(-85, Math.min(85, bestLat)),
        lon: normLon(bestLon),
    };
}

function buildPolygonObj(coords: number[][][]): CountryPolygon | null {
    if (!coords || coords.length === 0 || !coords[0] || coords[0].length < 3) return null;
    const outer = unwrapRing(coords[0]);
    const holes = coords.slice(1).map(unwrapRing).filter((r) => r.length >= 3);
    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    for (const [lon, lat] of outer) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }
    const area = Math.abs(ringSignedArea(outer));
    return { outer, holes, area, minLon, maxLon, minLat, maxLat };
}

interface WorldGeographyData {
    entries: CountryGeoEntry[];
    byNormalizedName: Map<string, CountryGeoEntry>;
    coastlinePolylines: LonLat[][];
}

let cachedGeoData: WorldGeographyData | null = null;

function ensureGeographyData(): WorldGeographyData {
    if (cachedGeoData) return cachedGeoData;

    const geoJson = feature(
        countriesAtlas as any,
        (countriesAtlas as any).objects.countries
    ) as unknown as {
        features: { id?: string | number; properties?: { name?: string }; geometry: { type: string; coordinates: any } }[];
    };

    const entries: CountryGeoEntry[] = [];
    const byNormalizedName = new Map<string, CountryGeoEntry>();
    const coastlinePolylines: LonLat[][] = [];

    for (const feat of geoJson.features) {
        const atlasName = String(feat.properties?.name || '').trim();
        if (!atlasName) continue;
        const name = normalizeCountryName(atlasName);
        const polygons: CountryPolygon[] = [];

        if (feat.geometry.type === 'Polygon') {
            const p = buildPolygonObj(feat.geometry.coordinates);
            if (p) {
                polygons.push(p);
                coastlinePolylines.push(p.outer);
            }
        } else if (feat.geometry.type === 'MultiPolygon') {
            for (const polyCoords of feat.geometry.coordinates) {
                const p = buildPolygonObj(polyCoords);
                if (p) {
                    polygons.push(p);
                    coastlinePolylines.push(p.outer);
                }
            }
        }

        if (polygons.length === 0) continue;

        // Pick largest contiguous polygon (for USA, France, Russia, etc. pick main landmass)
        polygons.sort((a, b) => b.area - a.area);
        let mainPoly = polygons[0];
        // For France, continental France is in Europe (lon -5..10, lat 41..52), whereas French Guiana can rival area in equirectangular projection; prefer European mainland for France & continental US for USA if needed
        if (name === 'France') {
            const mainland = polygons.find((p) => p.minLon > -8 && p.maxLon < 12 && p.minLat > 40);
            if (mainland) mainPoly = mainland;
        } else if (name === 'United States') {
            const lower48 = polygons.find((p) => p.minLon > -130 && p.maxLon < -60 && p.minLat > 20 && p.maxLat < 52);
            if (lower48) mainPoly = lower48;
        }

        const center = computePolygonInteriorPoint(mainPoly);
        const entry: CountryGeoEntry = {
            id: String(feat.id ?? name),
            name,
            atlasName,
            center,
            polygons,
        };
        entries.push(entry);
        byNormalizedName.set(name.toLowerCase(), entry);
        byNormalizedName.set(atlasName.toLowerCase(), entry);
    }

    cachedGeoData = { entries, byNormalizedName, coastlinePolylines };
    return cachedGeoData;
}

export function getAllCountryEntries(): CountryGeoEntry[] {
    return ensureGeographyData().entries;
}

export function getCountryBorderPolylines(): LonLat[][] {
    return ensureGeographyData().coastlinePolylines;
}

export function findCountryEntry(countryName: string): CountryGeoEntry | null {
    const { byNormalizedName } = ensureGeographyData();
    const norm = normalizeCountryName(countryName);
    if (!norm) return null;
    return byNormalizedName.get(norm.toLowerCase()) || byNormalizedName.get(countryName.trim().toLowerCase()) || null;
}

export function getCountryCenter(countryName: string): { lat: number; lon: number } | null {
    const entry = findCountryEntry(countryName);
    if (entry) return { ...entry.center };
    const norm = normalizeCountryName(countryName);
    if (MICROSTATE_CENTERS[norm]) return { ...MICROSTATE_CENTERS[norm] };
    return null;
}

export function isPointInCountry(lat: number, lon: number, entry: CountryGeoEntry): boolean {
    for (const poly of entry.polygons) {
        if (pointInPolygonRaw(lon, lat, poly)) return true;
    }
    return false;
}

// --- Tectonic Mountain Ranges & Equirectangular Elevation Heightfield ---

const GRID_W = 512;
const GRID_H = 256;

interface MountainGaussian {
    lat: number;
    lon: number;
    sigmaLat: number;
    sigmaLon: number;
    amp: number;
    angleDeg?: number;
}

const MOUNTAIN_BELTS: MountainGaussian[] = [
    // Himalayas & Tibetan Plateau
    { lat: 31.5, lon: 86.0, sigmaLat: 5.5, sigmaLon: 13.0, amp: 1.0, angleDeg: -14 },
    { lat: 35.5, lon: 75.5, sigmaLat: 4.0, sigmaLon: 6.5, amp: 0.92, angleDeg: -22 }, // Karakoram / Pamirs
    { lat: 41.5, lon: 81.0, sigmaLat: 3.0, sigmaLon: 10.0, amp: 0.68, angleDeg: 8 }, // Tian Shan
    { lat: 48.0, lon: 90.0, sigmaLat: 3.5, sigmaLon: 9.0, amp: 0.56, angleDeg: -18 }, // Altai
    // Andes (South America western cordillera)
    { lat: -20.0, lon: -68.5, sigmaLat: 11.0, sigmaLon: 3.2, amp: 0.88, angleDeg: 6 },
    { lat: -4.0, lon: -77.0, sigmaLat: 9.0, sigmaLon: 2.8, amp: 0.80, angleDeg: 14 },
    { lat: -38.0, lon: -71.0, sigmaLat: 11.0, sigmaLon: 2.6, amp: 0.74, angleDeg: -5 },
    // North America Rockies / Sierra / Alaska
    { lat: 43.0, lon: -110.5, sigmaLat: 11.5, sigmaLon: 5.0, amp: 0.72, angleDeg: -18 },
    { lat: 55.0, lon: -124.0, sigmaLat: 8.5, sigmaLon: 4.5, amp: 0.70, angleDeg: -32 },
    { lat: 62.5, lon: -150.0, sigmaLat: 3.2, sigmaLon: 7.5, amp: 0.78, angleDeg: 12 }, // Denali / Alaska
    { lat: 37.5, lon: -119.0, sigmaLat: 4.5, sigmaLon: 2.4, amp: 0.60, angleDeg: -20 }, // Sierra Nevada
    { lat: 21.0, lon: -100.0, sigmaLat: 7.5, sigmaLon: 3.5, amp: 0.56, angleDeg: -28 }, // Sierra Madre
    { lat: 37.0, lon: -81.0, sigmaLat: 7.0, sigmaLon: 2.5, amp: 0.34, angleDeg: 35 }, // Appalachians
    // Europe & Middle East
    { lat: 46.2, lon: 10.0, sigmaLat: 2.2, sigmaLon: 5.5, amp: 0.68, angleDeg: 12 }, // Alps
    { lat: 42.7, lon: 0.8, sigmaLat: 1.4, sigmaLon: 3.2, amp: 0.50, angleDeg: -8 }, // Pyrenees
    { lat: 42.8, lon: 44.0, sigmaLat: 2.0, sigmaLon: 5.5, amp: 0.72, angleDeg: -18 }, // Caucasus
    { lat: 39.0, lon: 39.0, sigmaLat: 3.0, sigmaLon: 9.0, amp: 0.52, angleDeg: 4 }, // Anatolian Plateau
    { lat: 32.5, lon: 49.5, sigmaLat: 3.8, sigmaLon: 6.5, amp: 0.60, angleDeg: -32 }, // Zagros
    { lat: 63.0, lon: 13.0, sigmaLat: 6.5, sigmaLon: 3.0, amp: 0.44, angleDeg: 28 }, // Scandes
    { lat: 60.0, lon: 59.5, sigmaLat: 10.0, sigmaLon: 2.2, amp: 0.36, angleDeg: 4 }, // Urals
    // Africa
    { lat: 9.5, lon: 38.5, sigmaLat: 4.5, sigmaLon: 4.0, amp: 0.64, angleDeg: 10 }, // Ethiopian Highlands
    { lat: -2.0, lon: 35.5, sigmaLat: 6.5, sigmaLon: 3.5, amp: 0.56, angleDeg: 6 }, // East African Rift / Kilimanjaro
    { lat: 32.0, lon: -4.5, sigmaLat: 2.5, sigmaLon: 6.0, amp: 0.48, angleDeg: 18 }, // Atlas Mountains
    { lat: -29.0, lon: 28.5, sigmaLat: 3.5, sigmaLon: 3.0, amp: 0.44, angleDeg: 20 }, // Drakensberg
    // East Asia / Oceania / Poles
    { lat: 36.2, lon: 137.8, sigmaLat: 2.8, sigmaLon: 2.2, amp: 0.52, angleDeg: 30 }, // Japanese Alps
    { lat: -43.5, lon: 170.2, sigmaLat: 3.2, sigmaLon: 1.8, amp: 0.56, angleDeg: 35 }, // Southern Alps NZ
    { lat: -33.0, lon: 149.0, sigmaLat: 9.0, sigmaLon: 2.2, amp: 0.32, angleDeg: 15 }, // Great Dividing Range
    { lat: 72.0, lon: -42.0, sigmaLat: 8.0, sigmaLon: 11.0, amp: 0.58, angleDeg: 0 }, // Greenland Ice Cap
    { lat: -82.0, lon: 80.0, sigmaLat: 7.0, sigmaLon: 60.0, amp: 0.65, angleDeg: 0 }, // East Antarctica Plateau
];

const RIVER_LOWLANDS: { lat: number; lon: number; sigmaLat: number; sigmaLon: number; depth: number }[] = [
    { lat: -3.5, lon: -61.0, sigmaLat: 6.5, sigmaLon: 13.0, depth: 0.65 }, // Amazon Basin
    { lat: 0.5, lon: 21.0, sigmaLat: 6.0, sigmaLon: 6.5, depth: 0.55 }, // Congo Basin
    { lat: 35.0, lon: -90.5, sigmaLat: 6.0, sigmaLon: 6.0, depth: 0.45 }, // Mississippi Valley
    { lat: 25.5, lon: 84.0, sigmaLat: 3.0, sigmaLon: 7.5, depth: 0.50 }, // Indo-Gangetic Plain
    { lat: 60.0, lon: 72.0, sigmaLat: 7.0, sigmaLon: 14.0, depth: 0.55 }, // West Siberian Plain
];

interface TerrainGridCache {
    landMask: Uint8Array;
    mountainGrid: Float32Array;
}

let cachedTerrainGrid: TerrainGridCache | null = null;

function hash2(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
    return n - Math.floor(n);
}

function smoothNoise2(x: number, y: number, seed: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, seed);
    const b = hash2(xi + 1, yi, seed);
    const c = hash2(xi, yi + 1, seed);
    const d = hash2(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function ridgeFbm(latDeg: number, lonDeg: number): number {
    const latRad = (latDeg * Math.PI) / 180;
    const lonRad = (lonDeg * Math.PI) / 180;
    const nx = Math.cos(latRad) * Math.cos(lonRad) * 6.0;
    const ny = Math.sin(latRad) * 6.0;
    const nz = Math.cos(latRad) * Math.sin(lonRad) * 6.0;
    let total = 0;
    let amp = 0.5;
    let freq = 1;
    for (let i = 0; i < 4; i++) {
        const s = smoothNoise2((nx + nz * 0.7) * freq + 20, (ny + nz * 0.5) * freq + 20, 31 + i * 17);
        const ridge = 1 - Math.abs(s * 2 - 1);
        total += ridge * ridge * amp;
        freq *= 2.05;
        amp *= 0.5;
    }
    return total;
}

function rasterizeRingScanline(ring: LonLat[], grid: Uint8Array, w: number, h: number, xorFill: boolean) {
    if (ring.length < 3) return;
    let minLat = 90;
    let maxLat = -90;
    for (const [, lat] of ring) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }
    const yStart = Math.max(0, Math.floor(((90 - maxLat) / 180) * h));
    const yEnd = Math.min(h - 1, Math.ceil(((90 - minLat) / 180) * h));

    const intersections: number[] = [];
    for (let y = yStart; y <= yEnd; y++) {
        const lat = 90 - ((y + 0.5) / h) * 180;
        intersections.length = 0;

        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const x1 = ring[i][0];
            const y1 = ring[i][1];
            const x2 = ring[j][0];
            const y2 = ring[j][1];
            if ((y1 <= lat && y2 > lat) || (y2 <= lat && y1 > lat)) {
                const lonHit = x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1);
                intersections.push(lonHit);
            }
        }
        intersections.sort((a, b) => a - b);

        for (let k = 0; k + 1 < intersections.length; k += 2) {
            const lStart = intersections[k];
            const lEnd = intersections[k + 1];
            const xStartPx = Math.floor(((lStart + 180) / 360) * w);
            const xEndPx = Math.ceil(((lEnd + 180) / 360) * w);
            for (let x = xStartPx; x <= xEndPx; x++) {
                const wx = ((x % w) + w) % w;
                const idx = y * w + wx;
                if (xorFill) {
                    grid[idx] = grid[idx] ? 0 : 1;
                } else {
                    grid[idx] = 1;
                }
            }
        }
    }
}

function ensureTerrainGrid(): TerrainGridCache {
    if (cachedTerrainGrid) return cachedTerrainGrid;

    const { entries } = ensureGeographyData();
    const landMask = new Uint8Array(GRID_W * GRID_H);
    const polyMask = new Uint8Array(GRID_W * GRID_H);

    for (const entry of entries) {
        for (const poly of entry.polygons) {
            polyMask.fill(0);
            rasterizeRingScanline(poly.outer, polyMask, GRID_W, GRID_H, true);
            for (const hole of poly.holes) {
                rasterizeRingScanline(hole, polyMask, GRID_W, GRID_H, true);
            }
            for (let i = 0; i < polyMask.length; i++) {
                if (polyMask[i]) landMask[i] = 1;
            }
        }
    }

    const mountainGrid = new Float32Array(GRID_W * GRID_H);
    for (let y = 0; y < GRID_H; y++) {
        const lat = 90 - ((y + 0.5) / GRID_H) * 180;
        for (let x = 0; x < GRID_W; x++) {
            const lon = ((x + 0.5) / GRID_W) * 360 - 180;
            let m = 0;
            for (const belt of MOUNTAIN_BELTS) {
                let dLon = lon - belt.lon;
                if (dLon > 180) dLon -= 360;
                if (dLon < -180) dLon += 360;
                const dLat = lat - belt.lat;
                if (Math.abs(dLat) > belt.sigmaLat * 3.2 || Math.abs(dLon) > belt.sigmaLon * 3.2) continue;
                const ang = ((belt.angleDeg || 0) * Math.PI) / 180;
                const cosA = Math.cos(ang);
                const sinA = Math.sin(ang);
                const rx = dLon * cosA + dLat * sinA;
                const ry = -dLon * sinA + dLat * cosA;
                const dist2 = (rx * rx) / (belt.sigmaLon * belt.sigmaLon) + (ry * ry) / (belt.sigmaLat * belt.sigmaLat);
                const val = belt.amp * Math.exp(-0.5 * dist2);
                if (val > m) m = val;
                else m = Math.min(1.0, m + val * 0.25);
            }

            let basin = 0;
            for (const b of RIVER_LOWLANDS) {
                let dLon = lon - b.lon;
                if (dLon > 180) dLon -= 360;
                if (dLon < -180) dLon += 360;
                const dLat = lat - b.lat;
                const dist2 = (dLon * dLon) / (b.sigmaLon * b.sigmaLon) + (dLat * dLat) / (b.sigmaLat * b.sigmaLat);
                basin = Math.max(basin, b.depth * Math.exp(-0.5 * dist2));
            }

            const ridge = ridgeFbm(lat, lon);
            const rawElevation = Math.max(0.06, m * (0.68 + 0.52 * ridge) + 0.14 * ridge - basin * 0.22);
            mountainGrid[y * GRID_W + x] = Math.min(1.0, rawElevation);
        }
    }

    cachedTerrainGrid = { landMask, mountainGrid };
    return cachedTerrainGrid;
}

export function getEarthElevationSample(lat: number, lon: number): { land: number; elevation: number } {
    const { landMask, mountainGrid } = ensureTerrainGrid();
    const clampedLat = Math.max(-89.99, Math.min(89.99, lat));
    let wrappedLon = ((((lon + 180) % 360) + 360) % 360) - 180;
    if (wrappedLon === 180) wrappedLon = -180;

    const fx = ((wrappedLon + 180) / 360) * GRID_W - 0.5;
    const fy = ((90 - clampedLat) / 180) * GRID_H - 0.5;

    const x0 = Math.floor(fx);
    const y0 = Math.max(0, Math.min(GRID_H - 1, Math.floor(fy)));
    const x1 = x0 + 1;
    const y1 = Math.max(0, Math.min(GRID_H - 1, y0 + 1));

    const tx = fx - x0;
    const ty = Math.max(0, Math.min(1, fy - y0));

    const wx0 = ((x0 % GRID_W) + GRID_W) % GRID_W;
    const wx1 = ((x1 % GRID_W) + GRID_W) % GRID_W;

    const idx00 = y0 * GRID_W + wx0;
    const idx10 = y0 * GRID_W + wx1;
    const idx01 = y1 * GRID_W + wx0;
    const idx11 = y1 * GRID_W + wx1;

    const l0 = landMask[idx00] * (1 - tx) + landMask[idx10] * tx;
    const l1 = landMask[idx01] * (1 - tx) + landMask[idx11] * tx;
    const land = l0 * (1 - ty) + l1 * ty;

    const e0 = mountainGrid[idx00] * (1 - tx) + mountainGrid[idx10] * tx;
    const e1 = mountainGrid[idx01] * (1 - tx) + mountainGrid[idx11] * tx;
    const mountain = e0 * (1 - ty) + e1 * ty;

    // Land emerges crisply from sea level (0) up to Himalayan/Andean peaks (~1.0)
    const elevation = land > 0.05 ? land * (0.14 + 0.86 * mountain) : 0;
    return { land, elevation };
}

export function getTerrainDisplacementAt(lat: number, lon: number, reliefScale = 0.18): number {
    if (reliefScale <= 0.001) return 0;
    const { elevation } = getEarthElevationSample(lat, lon);
    return elevation * reliefScale;
}

export function isLandAt(lat: number, lon: number, radiusDeg = 0.8): boolean {
    if (getEarthElevationSample(lat, lon).land > 0.25) return true;
    if (radiusDeg <= 0) return false;
    const offsets = [
        [radiusDeg, 0],
        [-radiusDeg, 0],
        [0, radiusDeg],
        [0, -radiusDeg],
    ];
    for (const [dLat, dLon] of offsets) {
        if (getEarthElevationSample(lat + dLat, lon + dLon).land > 0.25) return true;
    }
    return false;
}

function deterministicHash(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function findCityMatch(station: RadioStation, normalizedCountry: string): { lat: number; lon: number } | null {
    const haystack = `${station.state || ''} ${station.name || ''}`.toLowerCase();
    for (const city of CITY_COORDS) {
        if (city.country && city.country !== normalizedCountry) continue;
        if (city.keywords.some((kw) => haystack.includes(kw))) {
            return { lat: city.lat, lon: city.lon };
        }
    }
    return null;
}

function addDeterministicMicroOffset(
    lat: number,
    lon: number,
    seedStr: string,
    countryEntry: CountryGeoEntry | null,
    maxSpreadDeg = 0.22
): { lat: number; lon: number } {
    const h = deterministicHash(seedStr);
    const angle = ((h % 3600) / 3600) * Math.PI * 2;
    const r = 0.03 + (((h >>> 12) % 1000) / 1000) * maxSpreadDeg;
    const candLat = Math.max(-85, Math.min(85, lat + Math.sin(angle) * r));
    const cosLat = Math.max(0.25, Math.cos((lat * Math.PI) / 180));
    let candLon = lon + (Math.cos(angle) * r) / cosLat;
    candLon = ((((candLon + 180) % 360) + 360) % 360) - 180;

    if (!countryEntry || isPointInCountry(candLat, candLon, countryEntry) || isLandAt(candLat, candLon, 0.35)) {
        return { lat: candLat, lon: candLon };
    }
    return { lat, lon };
}

/**
 * Validates and repairs radio station coordinates so stations sit in their true
 * geographic city/country on land (never stranded at Null Island (0,0) or open ocean).
 */
export function repairStationCoordinates(station: RadioStation): RadioStation {
    const normalizedCountry = normalizeCountryName(station.country || '');
    const countryEntry = findCountryEntry(normalizedCountry);

    const rawLat = Number(station.geo_lat);
    const rawLon = Number(station.geo_long);

    const isInvalidCoords =
        !Number.isFinite(rawLat) ||
        !Number.isFinite(rawLon) ||
        rawLat < -90 ||
        rawLat > 90 ||
        rawLon < -180 ||
        rawLon > 180 ||
        (Math.abs(rawLat) < 0.05 && Math.abs(rawLon) < 0.05);

    let coordsValidForCountry = !isInvalidCoords;

    if (coordsValidForCountry && countryEntry) {
        const insidePoly = isPointInCountry(rawLat, rawLon, countryEntry);
        if (!insidePoly) {
            // Allow small coastal buffer (~2.2 deg) for coastal towns, islands & 110m polygon simplification
            let minDistDeg = Infinity;
            for (const poly of countryEntry.polygons) {
                for (let i = 0; i < poly.outer.length; i += Math.max(1, Math.floor(poly.outer.length / 40))) {
                    let dLon = rawLon - poly.outer[i][0];
                    if (dLon > 180) dLon -= 360;
                    if (dLon < -180) dLon += 360;
                    const dLat = rawLat - poly.outer[i][1];
                    const d = Math.hypot(dLon, dLat);
                    if (d < minDistDeg) minDistDeg = d;
                }
            }
            if (minDistDeg > 2.4 && !isLandAt(rawLat, rawLon, 0.6)) {
                coordsValidForCountry = false;
            } else if (minDistDeg > 6.5) {
                // Clearly outside country (e.g., Null Island or wrong hemisphere)
                coordsValidForCountry = false;
            }
        }
    } else if (coordsValidForCountry && !isLandAt(rawLat, rawLon, 1.2)) {
        // Micro-state station placed in mid-ocean
        coordsValidForCountry = false;
    }

    if (coordsValidForCountry) {
        return {
            ...station,
            country: normalizedCountry || station.country,
            geo_lat: rawLat,
            geo_long: rawLon,
        };
    }

    // Resolve true city or country interior coordinates
    const cityMatch = findCityMatch(station, normalizedCountry);
    const fallbackCenter = cityMatch || getCountryCenter(normalizedCountry);
    if (!fallbackCenter) {
        return {
            ...station,
            country: normalizedCountry || station.country,
            geo_lat: Number.isFinite(rawLat) ? rawLat : 0,
            geo_long: Number.isFinite(rawLon) ? rawLon : 0,
        };
    }

    const spread = cityMatch ? 0.09 : 0.25;
    const nudged = addDeterministicMicroOffset(
        fallbackCenter.lat,
        fallbackCenter.lon,
        `${station.stationuuid}:${station.name}`,
        countryEntry,
        spread
    );

    return {
        ...station,
        country: normalizedCountry || station.country,
        geo_lat: Number(nudged.lat.toFixed(4)),
        geo_long: Number(nudged.lon.toFixed(4)),
    };
}
