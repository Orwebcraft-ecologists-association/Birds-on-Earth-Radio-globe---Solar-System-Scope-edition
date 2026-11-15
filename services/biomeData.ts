

export interface Biome {
  name: string;
  url: string;
}

export const biomes = {
  FOREST: { name: 'Forest Ambience', url: 'https://cdn.pixabay.com/audio/2022/03/02/audio_026a454d92.mp3' },
  TROPICAL: { name: 'Tropical Jungle', url: 'https://cdn.pixabay.com/audio/2022/05/23/audio_a9a2a9a5a7.mp3' },
  COASTAL: { name: 'Coastal Seagulls', url: 'https://cdn.pixabay.com/audio/2022/08/17/audio_488894121d.mp3' },
  PLAINS: { name: 'Grassland Morning', url: 'https://cdn.pixabay.com/audio/2022/02/07/audio_f83961749c.mp3' },
  WETLAND: { name: 'Wetland Frogs', url: 'https://cdn.pixabay.com/audio/2022/04/20/audio_5174768b5a.mp3' },
};

export const biomeRegions: { biome: Biome, lat: [number, number], lon: [number, number] }[] = [
  // Tropical
  { biome: biomes.TROPICAL, lat: [-20, 20], lon: [-85, -30] }, // Amazon
  { biome: biomes.TROPICAL, lat: [-15, 15], lon: [8, 50] }, // Congo
  { biome: biomes.TROPICAL, lat: [-10, 10], lon: [95, 155] }, // Southeast Asia

  // Forest (Temperate)
  { biome: biomes.FOREST, lat: [30, 55], lon: [-125, -70] }, // North America
  { biome: biomes.FOREST, lat: [40, 60], lon: [0, 60] }, // Europe
  { biome: biomes.FOREST, lat: [25, 50], lon: [100, 145] }, // East Asia

  // Plains / Grassland
  { biome: biomes.PLAINS, lat: [30, 55], lon: [-105, -85] }, // Great Plains NA
  { biome: biomes.PLAINS, lat: [-30, 20], lon: [15, 40] }, // Serengeti/Savanna
  { biome: biomes.PLAINS, lat: [40, 55], lon: [40, 120] }, // Steppes

  // Coastal (Specific high-density areas)
  { biome: biomes.COASTAL, lat: [25, 65], lon: [-10, 20] }, // European Atlantic Coast
  { biome: biomes.COASTAL, lat: [25, 45], lon: [-98, -75] }, // US Gulf/Atlantic Coast
  { biome: biomes.COASTAL, lat: [-40, -15], lon: [110, 155] }, // Australia Coast

  // Wetland
  { biome: biomes.WETLAND, lat: [25, 30], lon: [-94, -82] }, // Everglades
  { biome: biomes.WETLAND, lat: [-22, -16], lon: [-60, -54] }, // Pantanal
];

const MAX_BIOMES = 2;

export const getBiomesForLocation = (lat: number, lon: number): Biome[] => {
    const foundBiomes = new Set<Biome>();
    for (const region of biomeRegions) {
        if (
            lat >= region.lat[0] && lat <= region.lat[1] &&
            lon >= region.lon[0] && lon <= region.lon[1]
        ) {
            foundBiomes.add(region.biome);
            if (foundBiomes.size >= MAX_BIOMES) {
                break;
            }
        }
    }
    
    // If no specific biome found, default to a generic one
    if (foundBiomes.size === 0) {
        return [biomes.FOREST];
    }

    return Array.from(foundBiomes);
}