
import type { RadioStation, BirdSighting, TreeSighting, INaturalistObservation } from '../types';
import { prepackagedStations } from './stationData';
import { normalizeCountryName, repairStationCoordinates } from './worldGeography';

// --- Data Cleaning and Validation ---

/**
 * Cleans, standardizes, and geographically verifies a single radio station object.
 * @param station The raw radio station object.
 * @returns A cleaned, truly positioned radio station object.
 */
const cleanStationData = (station: RadioStation): RadioStation => {
  // 1. Clean and normalize tags
  let tags = station.tags || '';
  if (typeof tags !== 'string' || tags.trim() === '') {
    tags = 'various';
  } else {
    tags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).join(',');
  }

  // 2. Normalize country name & repair missing/ocean/wrong-country coordinates
  const country = normalizeCountryName(station.country || '');
  return repairStationCoordinates({
    ...station,
    tags,
    country,
  });
};


// Fetches a list of available radio-browser.info servers.
// Includes a hardcoded fallback list for maximum reliability.
const getApiServers = async (): Promise<string[]> => {
    // These are known to be reliable. Added more diverse servers for resilience.
    const fallbackServers = [
        'de1.api.radio-browser.info',
        'de2.api.radio-browser.info',
        'nl1.api.radio-browser.info',
        'fr1.api.radio-browser.info',
        'at1.api.radio-browser.info',
        'radiobrowser.prod.api.onlineradiobox.com',
    ];

    try {
        // 'all.api...' is the recommended endpoint for discovering servers.
        const response = await fetch('https://all.api.radio-browser.info/json/servers');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const servers: { name: string }[] = await response.json();
        const serverNames = servers.map(server => server.name);
        // Randomize server list to distribute load and not always hit the same one first.
        return serverNames.sort(() => Math.random() - 0.5);
    } catch (error) {
        console.warn('Could not fetch dynamic server list, using hardcoded fallbacks.', error);
        // Randomize fallbacks as well.
        return fallbackServers.sort(() => Math.random() - 0.5);
    }
};

export const fetchStations = async (): Promise<RadioStation[]> => {
    /**
     * Helper function to validate and clean a station before adding it to the map.
     * @param station The station object to process.
     * @param stationMap The map to add the valid station to.
     */
    const processAndAddStation = (station: RadioStation, stationMap: Map<string, RadioStation>) => {
        // 1. Validation: Ensure essential fields exist and are valid.
        if (!station || !station.stationuuid) return;
        if (!station.url_resolved || typeof station.url_resolved !== 'string' || station.url_resolved.trim() === '') return;
        if (!station.country || typeof station.country !== 'string' || station.country.trim() === '') return;

        // 2. Cleaning & Geographic Repair: Standardize fields and ensure true city/country coordinates on land.
        const cleanedStation = cleanStationData(station);
        if (
            !Number.isFinite(cleanedStation.geo_lat) ||
            !Number.isFinite(cleanedStation.geo_long) ||
            cleanedStation.geo_lat < -90 ||
            cleanedStation.geo_lat > 90 ||
            cleanedStation.geo_long < -180 ||
            cleanedStation.geo_long > 180 ||
            (Math.abs(cleanedStation.geo_lat) < 0.01 && Math.abs(cleanedStation.geo_long) < 0.01)
        ) {
            return;
        }

        // 3. Add to map: The station is valid, clean, and truly located.
        stationMap.set(cleanedStation.stationuuid, cleanedStation);
    };
    
    try {
        const servers = await getApiServers();
        // Take the first 6 randomized servers and request them in parallel.
        const promises = servers.slice(0, 6).map(server => 
            new Promise<RadioStation[]>(async (resolve, reject) => {
                try {
                    const baseUrl = `https://${server}`;
                    const url = `${baseUrl}/json/stations/byvotes?limit=10000&hidebroken=true`;
                    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
                    
                    if (!response.ok) {
                        return reject(new Error(`Server ${server} status ${response.status}`));
                    }
                    const stations = await response.json();
                    if (stations && stations.length > 0) {
                        return resolve(stations);
                    }
                    return reject(new Error(`Server ${server} returned empty list`));
                } catch (error) {
                    return reject(error);
                }
            })
        );
        
        // Wait for the first promise to successfully resolve.
        const liveStations = await new Promise<RadioStation[]>((resolve, reject) => {
            let rejectedCount = 0;
            if (promises.length === 0) {
                return reject(new Error("No promises were provided to race."));
            }
            promises.forEach(p => {
                p.then(resolve).catch(() => {
                    rejectedCount++;
                    if (rejectedCount === promises.length) {
                        reject(new Error("All fetch attempts failed."));
                    }
                });
            });
        });

        // Merge live data with curated prepackaged data, prioritizing verified prepackaged URLs.
        const stationMap = new Map<string, RadioStation>();
        liveStations.forEach(station => processAndAddStation(station, stationMap));
        prepackagedStations.forEach(station => processAndAddStation(station, stationMap));

        const combinedStations = Array.from(stationMap.values());
        console.log(`Successfully fetched ${liveStations.length} live stations. Total valid & clean stations: ${combinedStations.length}.`);
        return combinedStations;

    } catch (error) {
        // This catch block is hit if all parallel promises fail.
        console.warn('Could not fetch live station updates. Using the built-in station directory.');
        const stationMap = new Map<string, RadioStation>();
        prepackagedStations.forEach(station => processAndAddStation(station, stationMap));
        const cleanedStations = Array.from(stationMap.values());
        console.log(`Using ${cleanedStations.length} valid & clean prepackaged stations.`);
        return cleanedStations;
    }
};


export const connectToBirdNET = (
    onSighting: (sighting: BirdSighting) => void,
    onOpen: () => void,
    onClose: () => void
): (() => void) => {
    try {
        const socket = new WebSocket('wss://birdnet.cornell.edu/map/ws');

        socket.onopen = () => {
            console.log("WebSocket connection established.");
            onOpen();
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'sighting' && message.lat != null && message.lon != null) {
                    
                    const latInput = message.lat;
                    const lonInput = message.lon;

                    if ((typeof latInput !== 'number' && typeof latInput !== 'string') || (typeof lonInput !== 'number' && typeof lonInput !== 'string')) {
                         console.warn(`Discarding sighting with invalid coordinate types: lat=${latInput}, lon=${lonInput}`);
                         return;
                    }

                    const lat = parseFloat(latInput as string);
                    const lon = parseFloat(lonInput as string);

                    // Rigorous validation: Ensure coordinates are valid numbers AND within the correct range.
                    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                        message.lat = lat;
                        message.lon = lon;
                        onSighting(message);
                    } else {
                         console.warn(`Discarding sighting with invalid or out-of-range coordinates: lat=${latInput}, lon=${lonInput}`);
                    }
                }
            } catch (e) {
                // Ignore non-JSON messages
            }
        };

        socket.onerror = (error) => {
            console.warn("WebSocket connection error. This is often due to network policies.", error);
            socket.close(); // This will trigger onclose
        };

        socket.onclose = () => {
            console.log("WebSocket connection closed. Falling back to simulation.");
            onClose();
        };

        return () => {
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close();
            }
        };

    } catch (e) {
        console.error("Failed to create WebSocket.", e);
        onClose();
        return () => {};
    }
};

// Fix: Changed NodeJS.Timeout to number for browser compatibility.
let simulationInterval: number | null = null;
export const startSimulation = (onSighting: (sighting: BirdSighting) => void) => {
    if (simulationInterval) return;

    const hotspots = [
        { lat: -3.4, lon: -62.2 }, // South America
        { lat: 1.0, lon: 20.0 },   // Africa
        { lat: 40, lon: -95 },     // North America
        { lat: 50, lon: 15 },      // Europe
        { lat: -10, lon: 130 }     // Oceania/SE Asia
    ];
    const species = [
        // North America
        { c: "American Robin", s: "Turdus migratorius" }, 
        { c: "Blue Jay", s: "Cyanocitta cristata" }, 
        { c: "Northern Cardinal", s: "Cardinalis cardinalis"},
        { c: "Bald Eagle", s: "Haliaeetus leucocephalus" },
        { c: "Mourning Dove", s: "Zenaida macroura" },
        { c: "American Goldfinch", s: "Spinus tristis" },
        { c: "Ruby-throated Hummingbird", s: "Archilochus colubris" },
        { c: "Downy Woodpecker", s: "Dryobates pubescens" },
        { c: "Great Horned Owl", s: "Bubo virginianus" },
        { c: "Peregrine Falcon", s: "Falco peregrinus" },
        { c: "California Condor", s: "Gymnogyps californianus" },
        { c: "Wild Turkey", s: "Meleagris gallopavo" },
        // Europe
        { c: "European Robin", s: "Erithacus rubecula"},
        { c: "Common Blackbird", s: "Turdus merula" },
        { c: "Common Chaffinch", s: "Fringilla coelebs" },
        { c: "Eurasian Blue Tit", s: "Cyanistes caeruleus" },
        { c: "Great Tit", s: "Parus major" },
        { c: "Eurasian Magpie", s: "Pica pica" },
        { c: "White Stork", s: "Ciconia ciconia" },
        { c: "Eurasian Jay", s: "Garrulus glandarius" },
        { c: "Hoopoe", s: "Upupa epops" },
        { c: "Golden Eagle", s: "Aquila chrysaetos" },
        // South America
        { c: "Scarlet Macaw", s: "Ara macao" },
        { c: "Toco Toucan", s: "Ramphastos toco" },
        { c: "Andean Cock-of-the-rock", s: "Rupicola peruvianus" },
        { c: "Sword-billed Hummingbird", s: "Ensifera ensifera" },
        { c: "Hoatzin", s: "Opisthocomus hoazin" },
        { c: "Hyacinth Macaw", s: "Anodorhynchus hyacinthinus" },
        { c: "Guianan Cock-of-the-rock", s: "Rupicola rupicola" },
        { c: "Harpy Eagle", s: "Harpia harpyja" },
        { c: "Andean Condor", s: "Vultur gryphus" },
        { c: "Resplendent Quetzal", s: "Pharomachrus mocinno" },
        // Africa
        { c: "African Grey Parrot", s: "Psittacus erithacus" },
        { c: "Lilac-breasted Roller", s: "Coracias caudatus" },
        { c: "Helmeted Guineafowl", s: "Numida meleagris" },
        { c: "Malachite Kingfisher", s: "Corythornis cristatus" },
        { c: "Ostrich", s: "Struthio camelus" },
        { c: "Secretarybird", s: "Sagittarius serpentarius" },
        { c: "Red-billed Hornbill", s: "Tockus erythrorhynchus" },
        { c: "Shoebill", s: "Balaeniceps rex" },
        { c: "Southern Ground Hornbill", s: "Bucorvus leadbeateri" },
        { c: "Violet-backed Starling", s: "Cinnyricinclus leucogaster" },
        // Asia/Australia
        { c: "Superb Fairywren", s: "Malurus cyaneus" },
        { c: "Rainbow Lorikeet", s: "Trichoglossus moluccanus" },
        { c: "Common Kingfisher", s: "Alcedo atthis" },
        { c: "Indian Peafowl", s: "Pavo cristatus" },
        { c: "Great Hornbill", s: "Buceros bicornis" },
        { c: "Atlantic Puffin", s: "Fratercula arctica" },
        { c: "Laughing Kookaburra", s: "Dacelo novaeguineae" },
        { c: "Red-crowned Crane", s: "Grus japonensis" },
        { c: "Kea", s: "Nestor notabilis" },
        { c: "Gouldian Finch", s: "Chloebia gouldiae" },
        { c: "Victoria Crowned Pigeon", s: "Goura victoria" },
        { c: "Kakapo", s: "Strigops habroptilus" },
        { c: "Mandarin Duck", s: "Aix galericulata" },
        { c: "Greater Bird-of-paradise", s: "Paradisaea apoda" },
        { c: "Philippine Eagle", s: "Pithecophaga jefferyi" },
        { c: "Splendid Fairywren", s: "Malurus splendens" },
        { c: "Tawny Frogmouth", s: "Podargus strigoides" },
        { c: "Wilson's Bird-of-paradise", s: "Cicinnurus respublica" },
        { c: "Himalayan Monal", s: "Lophophorus impejanus" },
        { c: "Siberian Crane", s: "Leucogeranus leucogeranus" },
    ];

    simulationInterval = window.setInterval(() => {
        const hotspot = hotspots[Math.floor(Math.random() * hotspots.length)];
        const bird = species[Math.floor(Math.random() * species.length)];
        const data: Omit<BirdSighting, 'id' | 'createdAt'> = {
            lat: hotspot.lat + (Math.random() - 0.5) * 20,
            lon: hotspot.lon + (Math.random() - 0.5) * 20,
            common_name: bird.c,
            scientific_name: bird.s,
            confidence: Math.random() * 0.5 + 0.5
        };
        // The App component will add id and createdAt
        onSighting(data as BirdSighting);
     }, 2000);
};

export const stopSimulation = () => {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
};

const SIMULATION_TREES = [
    // North America
    { c: "Coast Redwood", s: "Sequoia sempervirens" },
    { c: "Quaking Aspen", s: "Populus tremuloides" },
    { c: "Sugar Maple", s: "Acer saccharum" },
    { c: "Ponderosa Pine", s: "Pinus ponderosa" },
    // South America
    { c: "Kapok Tree", s: "Ceiba pentandra" },
    { c: "Jacaranda", s: "Jacaranda mimosifolia" },
    { c: "Brazil Nut Tree", s: "Bertholletia excelsa" },
    // Europe
    { c: "Silver Birch", s: "Betula pendula" },
    { c: "English Oak", s: "Quercus robur" },
    { c: "Scots Pine", s: "Pinus sylvestris" },
    // Africa
    { c: "Baobab", s: "Adansonia digitata" },
    { c: "Acacia Tortilis", s: "Vachellia tortilis" },
    { c: "Sausage Tree", s: "Kigelia africana" },
    // Asia
    { c: "Japanese Cherry", s: "Prunus serrulata" },
    { c: "Ginkgo Biloba", s: "Ginkgo biloba" },
    { c: "Banyan Tree", s: "Ficus benghalensis" },
    // Australia
    { c: "Eucalyptus", s: "Eucalyptus globulus" },
    { c: "Golden Wattle", s: "Acacia pycnantha" },
];

let treeSimulationInterval: number | null = null;

export const startTreeSimulation = (onSighting: (sighting: Omit<TreeSighting, 'id' | 'createdAt' | 'imageUrl'>) => void) => {
    if (treeSimulationInterval) return;

    const hotspots = [
        { lat: -3.4, lon: -62.2 }, // South America
        { lat: 1.0, lon: 20.0 },   // Africa
        { lat: 40, lon: -95 },     // North America
        { lat: 50, lon: 15 },      // Europe
        { lat: -25, lon: 130 },    // Australia
        { lat: 35, lon: 105 }      // Asia
    ];

    treeSimulationInterval = window.setInterval(() => {
        const hotspot = hotspots[Math.floor(Math.random() * hotspots.length)];
        const tree = SIMULATION_TREES[Math.floor(Math.random() * SIMULATION_TREES.length)];
        const data = {
            lat: hotspot.lat + (Math.random() - 0.5) * 20,
            lon: hotspot.lon + (Math.random() - 0.5) * 20,
            common_name: tree.c,
            scientific_name: tree.s,
        };
        onSighting(data);
     }, 4500);
};

export const stopTreeSimulation = () => {
    if (treeSimulationInterval) {
        clearInterval(treeSimulationInterval);
        treeSimulationInterval = null;
    }
};

export const fetchINaturalistObservations = async (): Promise<INaturalistObservation[]> => {
    try {
        const response = await fetch('https://api.inaturalist.org/v1/observations?per_page=200&order=desc&order_by=created_at');
        if (!response.ok) throw new Error('Failed to fetch iNaturalist data');
        const data = await response.json();
        return data.results
            .filter((obs: any) => obs.location) // Safety check: some observations lack coordinates
            .map((obs: any) => {
                const parts = obs.location.split(',');
                return {
                    id: obs.id,
                    lat: parseFloat(parts[0]),
                    lon: parseFloat(parts[1]),
                    common_name: obs.taxon?.preferred_common_name || obs.taxon?.name || 'Unknown',
                    // Fixed: Use 'obs' instead of 'BirdSighting' (which is a type)
                    scientific_name: obs.taxon?.name || 'Unknown',
                    imageUrl: obs.photos?.[0]?.url || `https://placehold.co/80x80/334155/FFFFFF?text=${obs.taxon?.name?.charAt(0) || '?'}`,
                    user: obs.user?.login || 'Anonymous',
                    observed_on: obs.observed_on_string || obs.created_at,
                    place_guess: obs.place_guess || 'Unknown Location'
                };
            })
            .filter((obs: any) => !isNaN(obs.lat) && !isNaN(obs.lon));
    } catch (e) {
        console.error('iNaturalist fetch error:', e);
        return [];
    }
};

export const getWikipediaUrl = (scientificName?: string, commonName?: string): string => {
    const sci = (scientificName || '').trim();
    const common = (commonName || '').trim();
    const genericTaxa = new Set(['', 'unknown', 'plantae', 'animalia', 'aves', 'fungi', 'insecta']);
    const query = !genericTaxa.has(sci.toLowerCase()) ? sci : common || sci;
    if (!query) {
        return 'https://en.wikipedia.org/wiki/Main_Page';
    }
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`;
};

export const getImageURL = async (scientificName: string, cache: Map<string, string>): Promise<string> => {
    if (cache.has(scientificName)) {
        return cache.get(scientificName)!;
    }
    try {
        const query = scientificName.replace(/ /g, '_');
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${query}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image from Wikipedia: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const imageUrl = data.thumbnail ? data.thumbnail.source : `https://placehold.co/80x80/334155/FFFFFF?text=${scientificName.charAt(0)}`;
        cache.set(scientificName, imageUrl);
        return imageUrl;
    } catch (e) {
        console.error(`Could not get image for ${scientificName}:`, e);
        const fallbackUrl = `https://placehold.co/80x80/334155/FFFFFF?text=?`;
        cache.set(scientificName, fallbackUrl);
        return fallbackUrl;
    }
};

// === IndexedDB Caching for Bird Sightings ===

const DB_NAME = 'BirdsOnEarthDB';
const DB_VERSION = 1;
const SIGHTINGS_STORE = 'sightings';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Error opening IndexedDB');
                reject('Error opening IndexedDB');
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const dbInstance = (event.target as IDBOpenDBRequest).result;
                if (!dbInstance.objectStoreNames.contains(SIGHTINGS_STORE)) {
                    const store = dbInstance.createObjectStore(SIGHTINGS_STORE, { keyPath: 'id' });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        } catch (error) {
            console.error('IndexedDB is not supported or is blocked.');
            reject(error);
        }
    });
    return dbPromise;
};

export const addSightingToCache = async (sighting: BirdSighting): Promise<void> => {
    try {
        const db = await initDB();
        const transaction = db.transaction(SIGHTINGS_STORE, 'readwrite');
        const store = transaction.objectStore(SIGHTINGS_STORE);
        store.put(sighting);

        // Clean up old sightings
        const oldTimestamp = Date.now() - CACHE_MAX_AGE;
        const index = store.index('createdAt');
        const oldSightingsRequest = index.openKeyCursor(IDBKeyRange.upperBound(oldTimestamp));

        oldSightingsRequest.onsuccess = () => {
            const cursor = oldSightingsRequest.result;
            if (cursor) {
                store.delete(cursor.primaryKey);
                cursor.continue();
            }
        };

        await new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (error) {
        console.error('Could not add sighting to cache', error);
    }
};

export const loadSightingsFromCache = async (): Promise<BirdSighting[]> => {
    try {
        const db = await initDB();
        const transaction = db.transaction(SIGHTINGS_STORE, 'readonly');
        const store = transaction.objectStore(SIGHTINGS_STORE);

        const recentTimestamp = Date.now() - CACHE_MAX_AGE;
        const index = store.index('createdAt');
        const request = index.getAll(IDBKeyRange.lowerBound(recentTimestamp));

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const sightings = request.result.sort((a, b) => b.createdAt - a.createdAt);
                console.log(`Loaded ${sightings.length} sightings from cache.`);
                resolve(sightings);
            };
            request.onerror = () => {
                console.error('Error loading sightings from cache', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Could not load sightings from cache', error);
        return [];
    }
};
