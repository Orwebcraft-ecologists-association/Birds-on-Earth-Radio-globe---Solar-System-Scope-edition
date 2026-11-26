import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    APIProvider,
    Map as GoogleMap,
    AdvancedMarker,
    Pin,
    InfoWindow,
    useAdvancedMarkerRef,
    useMap,
    useMapsLibrary,
    useApiLoadingStatus,
    APILoadingStatus,
} from '@vis.gl/react-google-maps';
import type {
    RadioStation,
    BirdSighting,
    TreeSighting,
    INaturalistObservation,
    InfoPanelData,
    RadioPointData,
} from '../types';
import { getWikipediaUrl } from '../services/dataService';
import { getCountryCenter } from '../services/worldGeography';

const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
const GMP_ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];

type MapTypeOption = 'hybrid' | 'terrain' | 'roadmap' | 'satellite';

interface SelectedMarkerState {
    key: string;
    kind: 'radio' | 'bird' | 'flora' | 'user' | 'place';
    title: string;
    subtitle: string;
    lat: number;
    lng: number;
    imageUrl?: string;
    wikiUrl?: string | null;
    mapsUri?: string | null;
    station?: RadioStation;
    confidence?: number;
}

interface NearbyPlaceMarker {
    id: string;
    name: string;
    address: string;
    typeLabel: string;
    lat: number;
    lng: number;
    mapsUri: string | null;
}

export interface GoogleMapViewProps {
    stations: RadioStation[];
    filteredStations: RadioStation[];
    selectedCountry: string;
    birdSightings: BirdSighting[];
    treeSightings: TreeSighting[];
    inatObservations: INaturalistObservation[];
    userLocation: { lat: number; lon: number } | null;
    currentStation: RadioStation | null;
    isPlaying: boolean;
    isAudioLoading: boolean;
    favoriteIds: Set<string>;
    flyToTarget: { lat: number; lon: number; ts?: number } | null;
    isUiVisible: boolean;
    onSelectStation: (stationData: RadioPointData) => void;
    onToggleFavorite: (stationuuid: string) => void;
    onSelectPoint: (point: InfoPanelData) => void;
    onFlyGlobeTo: (lat: number, lon: number) => void;
    onCloseMapView: () => void;
}

function isQuotaError(err: unknown): boolean {
    if (!err) return false;
    const msg =
        err instanceof Error
            ? `${err.name} ${err.message}`
            : typeof err === 'object'
            ? JSON.stringify(err)
            : String(err);
    const upper = msg.toUpperCase();
    return (
        upper.includes('429') ||
        upper.includes('RESOURCE_EXHAUSTED') ||
        upper.includes('OVER_QUERY_LIMIT') ||
        upper.includes('QUOTA_EXCEEDED') ||
        upper.includes('QUOTAEXCEEDEDERROR') ||
        upper.includes('OVERQUOTAMAPERROR')
    );
}

function dispatchQuotaExceeded(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
}

interface AdvancedMarkerWithRefProps {
    position: google.maps.LatLngLiteral;
    title: string;
    zIndex?: number;
    onMarkerClick: (marker: google.maps.marker.AdvancedMarkerElement) => void;
    children: React.ReactNode;
}

const AdvancedMarkerWithRef: React.FC<AdvancedMarkerWithRefProps> = ({
    position,
    title,
    zIndex,
    onMarkerClick,
    children,
}) => {
    const [markerRef, marker] = useAdvancedMarkerRef();

    return (
        <AdvancedMarker
            ref={markerRef}
            position={position}
            title={title}
            zIndex={zIndex}
            onClick={() => {
                if (marker) {
                    onMarkerClick(marker);
                }
            }}
        >
            {children}
        </AdvancedMarker>
    );
};

const MapCameraController: React.FC<{
    flyToTarget: { lat: number; lon: number; ts?: number } | null;
    selectedCountry: string;
}> = ({ flyToTarget, selectedCountry }) => {
    const map = useMap();
    const lastTsRef = useRef<number | undefined>(undefined);
    const lastCountryRef = useRef<string>('all');

    useEffect(() => {
        if (!map || !flyToTarget) return;
        if (flyToTarget.ts && flyToTarget.ts === lastTsRef.current) return;
        lastTsRef.current = flyToTarget.ts;

        if (
            Number.isFinite(flyToTarget.lat) &&
            Number.isFinite(flyToTarget.lon) &&
            !(Math.abs(flyToTarget.lat) < 0.001 && Math.abs(flyToTarget.lon) < 0.001)
        ) {
            map.panTo({ lat: flyToTarget.lat, lng: flyToTarget.lon });
            const currentZoom = map.getZoom() ?? 4;
            if (currentZoom < 6) {
                map.setZoom(7);
            }
        }
    }, [map, flyToTarget]);

    useEffect(() => {
        if (!map || selectedCountry === lastCountryRef.current) return;
        lastCountryRef.current = selectedCountry;
        if (selectedCountry !== 'all') {
            const center = getCountryCenter(selectedCountry);
            if (center) {
                map.panTo({ lat: center.lat, lng: center.lon });
                map.setZoom(6);
            }
        }
    }, [map, selectedCountry]);

    return null;
};

interface MapWorkspaceProps extends GoogleMapViewProps {}

const MapWorkspace: React.FC<MapWorkspaceProps> = ({
    stations,
    filteredStations,
    selectedCountry,
    birdSightings,
    treeSightings,
    inatObservations,
    userLocation,
    currentStation,
    isPlaying,
    isAudioLoading,
    favoriteIds,
    flyToTarget,
    isUiVisible,
    onSelectStation,
    onToggleFavorite,
    onSelectPoint,
    onFlyGlobeTo,
    onCloseMapView,
}) => {
    const map = useMap();
    const placesLib = useMapsLibrary('places');
    const loadingStatus = useApiLoadingStatus();

    const [mapTypeId, setMapTypeId] = useState<MapTypeOption>('hybrid');
    const [showRadio, setShowRadio] = useState(true);
    const [showBirds, setShowBirds] = useState(true);
    const [showFlora, setShowFlora] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
    const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
    const [placeError, setPlaceError] = useState<string | null>(null);
    const [searchedPlace, setSearchedPlace] = useState<NearbyPlaceMarker | null>(null);
    const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceMarker[]>([]);
    const [isSearchingNearby, setIsSearchingNearby] = useState(false);

    const [selectedInfo, setSelectedInfo] = useState<SelectedMarkerState | null>(null);
    const [anchorMarker, setAnchorMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(null);

    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(() => {
        if (flyToTarget && Number.isFinite(flyToTarget.lat) && Number.isFinite(flyToTarget.lon)) {
            return { lat: flyToTarget.lat, lng: flyToTarget.lon };
        }
        if (currentStation) {
            return { lat: currentStation.geo_lat, lng: currentStation.geo_long };
        }
        if (userLocation) {
            return { lat: userLocation.lat, lng: userLocation.lon };
        }
        return { lat: 32.0853, lng: 34.7818 };
    });

    const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

    useEffect(() => {
        if (loadingStatus === APILoadingStatus.AUTH_FAILURE) {
            dispatchQuotaExceeded();
        }
    }, [loadingStatus]);

    const resetAutocompleteSession = useCallback(() => {
        sessionTokenRef.current = null;
        setSuggestions([]);
    }, []);

    useEffect(() => {
        if (!placesLib) return;
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            setSuggestions([]);
            setPlaceError(null);
            return;
        }

        const timer = window.setTimeout(async () => {
            try {
                if (!sessionTokenRef.current) {
                    sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
                }
                setIsSearchingPlaces(true);
                setPlaceError(null);

                const res = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                    input: trimmed,
                    sessionToken: sessionTokenRef.current,
                });

                setSuggestions(Array.isArray(res?.suggestions) ? res.suggestions : []);
            } catch (err) {
                if (isQuotaError(err)) {
                    dispatchQuotaExceeded();
                    setPlaceError('Google Maps Places quota reached.');
                } else {
                    setPlaceError('Unable to fetch place suggestions right now.');
                }
                setSuggestions([]);
            } finally {
                setIsSearchingPlaces(false);
            }
        }, 260);

        return () => window.clearTimeout(timer);
    }, [placesLib, searchQuery]);

    const handleSelectSuggestion = useCallback(
        async (suggestion: google.maps.places.AutocompleteSuggestion) => {
            if (!placesLib || !suggestion.placePrediction) return;
            try {
                setPlaceError(null);
                const place = suggestion.placePrediction.toPlace();
                await place.fetchFields({
                    fields: ['id', 'displayName', 'formattedAddress', 'location', 'viewport', 'googleMapsURI'],
                });

                const loc = place.location;
                if (loc) {
                    const lat = loc.lat();
                    const lng = loc.lng();
                    const title = place.displayName || suggestion.placePrediction.text.text;
                    const address = place.formattedAddress || '';

                    const markerData: NearbyPlaceMarker = {
                        id: place.id || `${lat},${lng}`,
                        name: title,
                        address,
                        typeLabel: 'Selected Location',
                        lat,
                        lng,
                        mapsUri: place.googleMapsURI || null,
                    };

                    setSearchedPlace(markerData);
                    setMapCenter({ lat, lng });

                    if (map) {
                        if (place.viewport) {
                            map.fitBounds(place.viewport);
                        } else {
                            map.panTo({ lat, lng });
                            map.setZoom(11);
                        }
                    }
                    onFlyGlobeTo(lat, lng);
                }

                setSearchQuery('');
                resetAutocompleteSession();
            } catch (err) {
                if (isQuotaError(err)) {
                    dispatchQuotaExceeded();
                    setPlaceError('Google Maps Places quota reached.');
                } else {
                    setPlaceError('Could not load details for that location.');
                }
            }
        },
        [placesLib, map, onFlyGlobeTo, resetAutocompleteSession]
    );

    const handleFindNearbyNature = useCallback(async () => {
        if (!placesLib || !map) return;
        const centerObj = map.getCenter();
        const center = centerObj
            ? { lat: centerObj.lat(), lng: centerObj.lng() }
            : mapCenter;

        setIsSearchingNearby(true);
        setPlaceError(null);
        try {
            const response = await placesLib.Place.searchNearby({
                fields: ['id', 'displayName', 'location', 'formattedAddress', 'googleMapsURI', 'primaryTypeDisplayName'],
                locationRestriction: {
                    center,
                    radius: 25000,
                },
                includedPrimaryTypes: ['park', 'national_park', 'botanical_garden', 'zoo'],
                maxResultCount: 8,
                internalUsageAttributionIds: GMP_ATTRIBUTION_IDS,
            });

            const found: NearbyPlaceMarker[] = (response?.places || [])
                .filter((p) => p.location)
                .map((p) => ({
                    id: p.id || `${p.location!.lat()}-${p.location!.lng()}`,
                    name: p.displayName || 'Nature Reserve',
                    address: p.formattedAddress || '',
                    typeLabel: p.primaryTypeDisplayName || 'Nature Habitat',
                    lat: p.location!.lat(),
                    lng: p.location!.lng(),
                    mapsUri: p.googleMapsURI || null,
                }));

            setNearbyPlaces(found);
            if (found.length === 0) {
                setPlaceError('No parks or nature habitats found within 25 km of map center.');
            }
        } catch (err) {
            if (isQuotaError(err)) {
                dispatchQuotaExceeded();
                setPlaceError('Google Maps Places quota reached.');
            } else {
                setPlaceError('Nearby nature lookup is unavailable here.');
            }
        } finally {
            setIsSearchingNearby(false);
        }
    }, [placesLib, map, mapCenter]);

    const visibleStations = useMemo(() => {
        if (!showRadio) return [];
        const source = filteredStations.length > 0 ? filteredStations : stations;
        const prioritized: RadioStation[] = [];
        const seenIds: Record<string, boolean> = {};

        const addStation = (s: RadioStation) => {
            if (seenIds[s.stationuuid]) return;
            if (!Number.isFinite(s.geo_lat) || !Number.isFinite(s.geo_long)) return;
            seenIds[s.stationuuid] = true;
            prioritized.push(s);
        };

        if (currentStation) addStation(currentStation);
        for (const s of source) {
            if (favoriteIds.has(s.stationuuid)) addStation(s);
        }

        const remaining = source
            .filter((s) => !seenIds[s.stationuuid] && Number.isFinite(s.geo_lat) && Number.isFinite(s.geo_long))
            .map((s) => {
                const dLat = s.geo_lat - mapCenter.lat;
                const dLng = s.geo_long - mapCenter.lng;
                return { station: s, distSq: dLat * dLat + dLng * dLng };
            })
            .sort((a, b) => a.distSq - b.distSq);

        for (const item of remaining) {
            if (prioritized.length >= 90) break;
            addStation(item.station);
        }

        return prioritized;
    }, [showRadio, filteredStations, stations, currentStation, favoriteIds, mapCenter]);

    const visibleBirds = useMemo(() => {
        if (!showBirds) return [];
        return birdSightings
            .filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lon))
            .slice(-40);
    }, [showBirds, birdSightings]);

    const visibleFlora = useMemo(() => {
        if (!showFlora) return [];
        const combined = [
            ...treeSightings.map((t) => ({
                key: `tree-${t.id}`,
                common: t.common_name,
                scientific: t.scientific_name,
                lat: t.lat,
                lng: t.lon,
                imageUrl: t.imageUrl,
                subtitle: `${t.scientific_name} • Local Flora`,
            })),
            ...inatObservations.slice(0, 35).map((obs) => ({
                key: `inat-${obs.id}`,
                common: obs.common_name,
                scientific: obs.scientific_name,
                lat: obs.lat,
                lng: obs.lon,
                imageUrl: obs.imageUrl,
                subtitle: `${obs.scientific_name} • ${obs.user}`,
            })),
        ];
        return combined.filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
    }, [showFlora, treeSightings, inatObservations]);

    const handleCloseInfo = useCallback(() => {
        setSelectedInfo(null);
        setAnchorMarker(null);
    }, []);

    return (
        <div className="fixed inset-0 z-[20] w-full h-full bg-slate-950">
            <GoogleMap
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={GMP_ATTRIBUTION_IDS}
                defaultCenter={mapCenter}
                defaultZoom={selectedCountry !== 'all' ? 6 : 4}
                mapTypeId={mapTypeId}
                gestureHandling="greedy"
                mapTypeControl={false}
                fullscreenControl={false}
                streetViewControl={true}
                zoomControl={true}
                onCameraChanged={(ev) => {
                    if (ev?.detail?.center) {
                        setMapCenter(ev.detail.center);
                    }
                }}
                onClick={() => handleCloseInfo()}
                className="w-full h-full"
                style={{ width: '100%', height: '100%' }}
            >
                <MapCameraController flyToTarget={flyToTarget} selectedCountry={selectedCountry} />

                {/* Radio Station Markers */}
                {visibleStations.map((station) => {
                    const isCurrent = currentStation?.stationuuid === station.stationuuid;
                    const isFav = favoriteIds.has(station.stationuuid);
                    return (
                        <AdvancedMarkerWithRef
                            key={`radio-${station.stationuuid}`}
                            position={{ lat: station.geo_lat, lng: station.geo_long }}
                            title={`${station.name} (${station.country})`}
                            zIndex={isCurrent ? 1000 : isFav ? 500 : 100}
                            onMarkerClick={(marker) => {
                                const radioPt: RadioPointData = {
                                    id: station.stationuuid,
                                    lat: station.geo_lat,
                                    lon: station.geo_long,
                                    type: 'radio',
                                    title: station.name,
                                    place: station.state ? `${station.state}, ${station.country}` : station.country,
                                    url: station.url_resolved,
                                    country: station.country,
                                    state: station.state,
                                    tags: station.tags,
                                };
                                onSelectStation(radioPt);
                                setAnchorMarker(marker);
                                setSelectedInfo({
                                    key: `radio-${station.stationuuid}`,
                                    kind: 'radio',
                                    title: station.name,
                                    subtitle: station.state ? `${station.state}, ${station.country}` : station.country,
                                    lat: station.geo_lat,
                                    lng: station.geo_long,
                                    station,
                                });
                            }}
                        >
                            <Pin
                                background={isCurrent ? '#f59e0b' : isFav ? '#eab308' : '#2563eb'}
                                borderColor={isCurrent ? '#fef3c7' : '#93c5fd'}
                                glyphColor="#ffffff"
                                glyphText={isCurrent && isPlaying ? '♪' : 'R'}
                                scale={isCurrent ? 1.25 : 0.95}
                            />
                        </AdvancedMarkerWithRef>
                    );
                })}

                {/* Bird Detection Markers */}
                {visibleBirds.map((bird) => (
                    <AdvancedMarkerWithRef
                        key={`bird-${bird.id}`}
                        position={{ lat: bird.lat, lng: bird.lon }}
                        title={`${bird.common_name} (${bird.scientific_name})`}
                        zIndex={300}
                        onMarkerClick={(marker) => {
                            onSelectPoint({
                                id: bird.id,
                                lat: bird.lat,
                                lon: bird.lon,
                                type: 'bird',
                                common: bird.common_name,
                                scientific: bird.scientific_name,
                                score: bird.confidence,
                                createdAt: bird.createdAt,
                                imgUrl: bird.imgUrl,
                            });
                            setAnchorMarker(marker);
                            setSelectedInfo({
                                key: `bird-${bird.id}`,
                                kind: 'bird',
                                title: bird.common_name,
                                subtitle: bird.scientific_name,
                                lat: bird.lat,
                                lng: bird.lon,
                                imageUrl: bird.imgUrl,
                                wikiUrl: getWikipediaUrl(bird.scientific_name, bird.common_name),
                                confidence: bird.confidence,
                            });
                        }}
                    >
                        <Pin
                            background="#e11d48"
                            borderColor="#fda4af"
                            glyphColor="#ffffff"
                            glyphText="B"
                            scale={0.9}
                        />
                    </AdvancedMarkerWithRef>
                ))}

                {/* Flora & iNaturalist Markers */}
                {visibleFlora.map((item) => (
                    <AdvancedMarkerWithRef
                        key={item.key}
                        position={{ lat: item.lat, lng: item.lng }}
                        title={`${item.common} (${item.scientific})`}
                        zIndex={250}
                        onMarkerClick={(marker) => {
                            setAnchorMarker(marker);
                            setSelectedInfo({
                                key: item.key,
                                kind: 'flora',
                                title: item.common,
                                subtitle: item.subtitle,
                                lat: item.lat,
                                lng: item.lng,
                                imageUrl: item.imageUrl,
                                wikiUrl: getWikipediaUrl(item.scientific, item.common),
                            });
                        }}
                    >
                        <Pin
                            background="#059669"
                            borderColor="#6ee7b7"
                            glyphColor="#ffffff"
                            glyphText="F"
                            scale={0.85}
                        />
                    </AdvancedMarkerWithRef>
                ))}

                {/* User Location Marker */}
                {userLocation && (
                    <AdvancedMarkerWithRef
                        position={{ lat: userLocation.lat, lng: userLocation.lon }}
                        title="Your Location"
                        zIndex={900}
                        onMarkerClick={(marker) => {
                            setAnchorMarker(marker);
                            setSelectedInfo({
                                key: 'user-location',
                                kind: 'user',
                                title: 'Your Location',
                                subtitle: `${userLocation.lat.toFixed(3)}°, ${userLocation.lon.toFixed(3)}°`,
                                lat: userLocation.lat,
                                lng: userLocation.lon,
                            });
                        }}
                    >
                        <Pin
                            background="#7c3aed"
                            borderColor="#ddd6fe"
                            glyphColor="#ffffff"
                            glyphText="★"
                            scale={1.1}
                        />
                    </AdvancedMarkerWithRef>
                )}

                {/* Searched Place Marker */}
                {searchedPlace && (
                    <AdvancedMarkerWithRef
                        position={{ lat: searchedPlace.lat, lng: searchedPlace.lng }}
                        title={searchedPlace.name}
                        zIndex={950}
                        onMarkerClick={(marker) => {
                            setAnchorMarker(marker);
                            setSelectedInfo({
                                key: `place-${searchedPlace.id}`,
                                kind: 'place',
                                title: searchedPlace.name,
                                subtitle: searchedPlace.address || searchedPlace.typeLabel,
                                lat: searchedPlace.lat,
                                lng: searchedPlace.lng,
                                mapsUri: searchedPlace.mapsUri,
                            });
                        }}
                    >
                        <Pin
                            background="#ea580c"
                            borderColor="#fed7aa"
                            glyphColor="#ffffff"
                            glyphText="P"
                            scale={1.15}
                        />
                    </AdvancedMarkerWithRef>
                )}

                {/* Nearby Nature / Parks Markers */}
                {nearbyPlaces.map((np) => (
                    <AdvancedMarkerWithRef
                        key={`nearby-${np.id}`}
                        position={{ lat: np.lat, lng: np.lng }}
                        title={np.name}
                        zIndex={400}
                        onMarkerClick={(marker) => {
                            setAnchorMarker(marker);
                            setSelectedInfo({
                                key: `nearby-${np.id}`,
                                kind: 'place',
                                title: np.name,
                                subtitle: np.address || np.typeLabel,
                                lat: np.lat,
                                lng: np.lng,
                                mapsUri: np.mapsUri,
                            });
                        }}
                    >
                        <Pin
                            background="#0d9488"
                            borderColor="#99f6e4"
                            glyphColor="#ffffff"
                            glyphText="N"
                            scale={0.95}
                        />
                    </AdvancedMarkerWithRef>
                ))}

                {/* Anchored InfoWindow */}
                {selectedInfo && anchorMarker && (
                    <InfoWindow
                        anchor={anchorMarker}
                        maxWidth={280}
                        onCloseClick={handleCloseInfo}
                    >
                        <div className="p-1 text-slate-900 space-y-2 min-w-[200px]">
                            {selectedInfo.imageUrl && (
                                <img
                                    src={selectedInfo.imageUrl}
                                    alt={selectedInfo.title}
                                    className="w-full h-28 object-cover rounded-lg bg-slate-200"
                                />
                            )}
                            <div>
                                <h3 className="font-bold text-sm leading-tight text-slate-900">
                                    {selectedInfo.title}
                                </h3>
                                <p className="text-xs text-slate-600 mt-0.5">{selectedInfo.subtitle}</p>
                                <p className="text-[11px] font-mono text-slate-500 mt-1">
                                    {selectedInfo.lat.toFixed(3)}°, {selectedInfo.lng.toFixed(3)}°
                                </p>
                                {typeof selectedInfo.confidence === 'number' && (
                                    <p className="text-[11px] font-semibold text-rose-700 mt-0.5">
                                        BirdNET Confidence: {(selectedInfo.confidence * 100).toFixed(0)}%
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {selectedInfo.kind === 'radio' && selectedInfo.station && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const st = selectedInfo.station!;
                                                onSelectStation({
                                                    id: st.stationuuid,
                                                    lat: st.geo_lat,
                                                    lon: st.geo_long,
                                                    type: 'radio',
                                                    title: st.name,
                                                    place: st.state ? `${st.state}, ${st.country}` : st.country,
                                                    url: st.url_resolved,
                                                    country: st.country,
                                                    state: st.state,
                                                    tags: st.tags,
                                                });
                                            }}
                                            className="px-2.5 py-1 rounded bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700"
                                        >
                                            {currentStation?.stationuuid === selectedInfo.station.stationuuid && isAudioLoading
                                                ? 'Connecting...'
                                                : currentStation?.stationuuid === selectedInfo.station.stationuuid && isPlaying
                                                ? 'Pause'
                                                : 'Play Radio'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onToggleFavorite(selectedInfo.station!.stationuuid)}
                                            className="px-2 py-1 rounded bg-slate-100 text-slate-800 text-[11px] font-bold hover:bg-slate-200 border border-slate-300"
                                        >
                                            {favoriteIds.has(selectedInfo.station.stationuuid) ? 'Saved ★' : 'Save ☆'}
                                        </button>
                                    </>
                                )}

                                {selectedInfo.wikiUrl && (
                                    <a
                                        href={selectedInfo.wikiUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1 rounded bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700"
                                    >
                                        Wikipedia &nearr;
                                    </a>
                                )}

                                {selectedInfo.mapsUri && (
                                    <a
                                        href={selectedInfo.mapsUri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700"
                                    >
                                        Open in Google Maps &nearr;
                                    </a>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        onFlyGlobeTo(selectedInfo.lat, selectedInfo.lng);
                                        onCloseMapView();
                                    }}
                                    className="px-2.5 py-1 rounded bg-slate-800 text-white text-[11px] font-bold hover:bg-slate-900"
                                >
                                    View in 3D Globe
                                </button>
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>

            {/* Floating Google Maps Search & Layer Controls */}
            {isUiVisible && (
                <div className="fixed top-20 left-5 z-[40] w-[calc(100vw-2.5rem)] max-w-sm space-y-2 pointer-events-auto">
                    <div className="bg-slate-950/92 border border-white/15 rounded-2xl p-2.5 shadow-2xl space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search cities, parks, or places..."
                                    aria-label="Search Google Maps places"
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/50 font-semibold"
                                />
                                {isSearchingPlaces && (
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={onCloseMapView}
                                className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-wider flex-shrink-0 transition-colors"
                                title="Return to 3D Earth Globe"
                            >
                                3D Globe
                            </button>
                        </div>

                        {suggestions.length > 0 && (
                            <ul className="max-h-52 overflow-y-auto rounded-xl bg-slate-900 border border-white/10 divide-y divide-white/5">
                                {suggestions.map((suggestion, idx) => (
                                    <li key={suggestion.placePrediction?.placeId || idx}>
                                        <button
                                            type="button"
                                            onClick={() => void handleSelectSuggestion(suggestion)}
                                            className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-emerald-600/20 hover:text-white transition-colors"
                                        >
                                            {suggestion.placePrediction?.text.text}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {placeError && (
                            <p className="text-[11px] text-amber-300 px-1">{placeError}</p>
                        )}

                        {/* Map Type & Marker Layer Toggles */}
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {(['hybrid', 'terrain', 'roadmap', 'satellite'] as MapTypeOption[]).map((mt) => (
                                <button
                                    key={mt}
                                    type="button"
                                    onClick={() => setMapTypeId(mt)}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
                                        mapTypeId === mt
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                    }`}
                                >
                                    {mt}
                                </button>
                            ))}
                            <div className="h-3.5 w-px bg-white/10 mx-0.5" />
                            <button
                                type="button"
                                onClick={() => setShowRadio((v) => !v)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
                                    showRadio ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'
                                }`}
                            >
                                Radio
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowBirds((v) => !v)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
                                    showBirds ? 'bg-rose-600 text-white' : 'bg-white/5 text-slate-400'
                                }`}
                            >
                                Birds
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowFlora((v) => !v)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
                                    showFlora ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400'
                                }`}
                            >
                                Flora
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleFindNearbyNature()}
                                disabled={isSearchingNearby}
                                className="px-2 py-1 rounded-lg bg-teal-600/25 hover:bg-teal-600 text-teal-200 hover:text-white border border-teal-500/30 text-[9px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                                title="Find nearby parks, botanical gardens & nature habitats"
                            >
                                {isSearchingNearby ? 'Scanning...' : 'Nearby Parks'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const GoogleMapView: React.FC<GoogleMapViewProps> = (props) => {
    const handleProviderError = useCallback((error: unknown) => {
        if (isQuotaError(error)) {
            dispatchQuotaExceeded();
        }
    }, []);

    if (!GOOGLE_MAPS_API_KEY) {
        return (
            <div className="fixed inset-0 z-[20] w-full h-full bg-slate-950 flex items-center justify-center p-6">
                <div className="max-w-md bg-slate-900 border border-white/15 rounded-2xl p-6 text-center space-y-3 shadow-2xl">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight">Google Maps Not Configured</h2>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        A Google Maps Platform API key was not detected in the environment. Enable Google Maps Platform in settings or return to the 3D Solar Globe.
                    </p>
                    <button
                        type="button"
                        onClick={props.onCloseMapView}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider"
                    >
                        Return to 3D Globe
                    </button>
                </div>
            </div>
        );
    }

    return (
        <APIProvider
            apiKey={GOOGLE_MAPS_API_KEY}
            libraries={['marker', 'places']}
            language="en"
            region="US"
            onError={handleProviderError}
        >
            <MapWorkspace {...props} />
        </APIProvider>
    );
};
