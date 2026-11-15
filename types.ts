
export interface RadioStation {
    stationuuid: string;
    name: string;
    url_resolved: string;
    fallback_urls?: string[];
    country: string;
    state: string;
    geo_lat: number;
    geo_long: number;
    tags: string;
    bitrate: number;
}

export interface BirdSighting {
    id: number;
    lat: number;
    lon: number;
    common_name: string;
    scientific_name: string;
    confidence: number;
    createdAt: number;
    imgUrl?: string;
}

export interface TreeSighting {
    id: number;
    lat: number;
    lon: number;
    common_name: string;
    scientific_name: string;
    imageUrl: string; 
    createdAt: number;
}

export interface INaturalistObservation {
    id: number;
    lat: number;
    lon: number;
    common_name: string;
    scientific_name: string;
    imageUrl: string;
    user: string;
    observed_on: string;
    place_guess: string;
}

export type PointType = 'radio' | 'bird' | 'user' | 'tree' | 'sun' | 'moon' | 'planet' | 'celestial-star' | 'inaturalist';

export interface BasePointData {
    id: string | number;
    lat: number;
    lon: number;
    type: PointType;
}

export interface RadioPointData extends BasePointData {
    type: 'radio';
    id: string;
    title: string;
    place: string;
    url: string;
    country: string;
    state: string;
    tags: string;
}

export interface BirdPointData extends BasePointData {
    type: 'bird';
    id: number;
    common: string;
    scientific: string;
    score: number;
    createdAt: number;
    imgUrl?: string;
}

export interface TreePointData extends BasePointData {
    type: 'tree';
    id: number;
    common: string;
    scientific: string;
    imageUrl: string;
    createdAt: number;
}

export interface INaturalistPointData extends BasePointData {
    type: 'inaturalist';
    id: number;
    common: string;
    scientific: string;
    imageUrl: string;
    user: string;
}

export interface UserLocationPointData extends BasePointData {
    type: 'user';
    id: 'user-location';
}

export interface CelestialPointData extends Partial<BasePointData> {
    type: 'sun' | 'moon' | 'planet' | 'celestial-star';
    name: string;
    info?: string;
    constellation?: string;
    color?: string;
    magnitude?: number;
    spectralType?: string;
    distance?: string;
}

export type PointData = RadioPointData | BirdPointData | UserLocationPointData | TreePointData | CelestialPointData | INaturalistPointData;

export type InfoPanelData = PointData;

export interface Filters {
    radio: {
        text: string;
        country: string;
        genre: string;
    };
    bird: {
        name: string;
        select: string;
    };
}

export type WeatherPreset = 'Calm' | 'Stormy' | 'Seasonal';

export type ActiveTab = 'detections' | 'stations' | 'visuals' | 'favorites' | 'trees' | 'celestial' | 'inaturalist' | 'timescape';

export interface SoundscapeBirdsong {
    name: string;
    url: string;
    volume: number;
}

export interface SoundscapeStation extends RadioStation {
    volume: number;
}

export interface StationSubmission {
    name: string;
    url_resolved: string;
    country: string;
    state: string;
    tags: string;
    geo_lat: number | null;
    geo_long: number | null;
}

export interface CelestialTarget {
    type: 'star' | 'planet';
    name: string;
    ra?: number;
    dec?: number;
}

export interface TimescapeConfig {
    speed: number;
    offset: number; // ms
    isPaused: boolean;
}
