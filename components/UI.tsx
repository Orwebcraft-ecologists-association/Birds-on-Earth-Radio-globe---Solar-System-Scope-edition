import React, { useState, useMemo, useRef, useEffect } from 'react';
import type {
    BirdSighting,
    TreeSighting,
    InfoPanelData,
    Filters,
    RadioStation,
    WeatherPreset,
    ActiveTab,
    StationSubmission,
    CelestialTarget,
    INaturalistObservation,
    TimescapeConfig,
    ChatMessage,
    ChatModelId,
    ChatRoleId,
    CameraViewPreset,
    VideoCreationRecord,
    VideoMode,
    VideoAspectRatio,
    MapsGroundingLink,
} from '../types';
import AboutModal from './AboutModal';
import { allNamedStars } from '../services/constellationData';
import { planetsMetadata } from './Globe';
import PlanetSlider from './PlanetSlider';
import { useFirebaseAuth } from './FirebaseProvider';
import { ChatPanel, type ChatWindowSize } from './ChatPanel';
import { LiveVoicePanel } from './LiveVoicePanel';
import { VideoStudioPanel } from './VideoStudioPanel';
import { getWikipediaUrl } from '../services/dataService';
import { getCountryCenter } from '../services/worldGeography';

interface UIProps {
    statusMessage: string;
    totalSubmissions: number;
    latestSubmission: BirdSighting | null;
    sidebarSightings: BirdSighting[];
    treeSightings: TreeSighting[];
    inatObservations: INaturalistObservation[];
    pinnedData: InfoPanelData | null;
    onCloseInfoPanel: () => void;
    filters: Filters;
    uniqueBirdSpecies: { scientific: string; common: string }[];
    uniqueRadioStations: RadioStation[];
    filteredRadioStationsForSearch: RadioStation[];
    uniqueCountries: string[];
    uniqueGenres: string[];
    liveBirdCount: number;
    onShowLocation: () => void;
    userLocation: { lat: number; lon: number } | null;
    onAttractBirds: () => void;
    isAttracting: boolean;
    currentStation: RadioStation | null;
    isPlaying: boolean;
    isAudioLoading: boolean;
    volume: number;
    onPlayPause: () => void;
    onVolumeChange: (volume: number) => void;
    audioError: string | null;
    audioContextRef: React.RefObject<AudioContext | null>;
    audioAnalyserRef: React.RefObject<AnalyserNode | null>;
    isStationLocked: boolean;
    onToggleLock: () => void;
    isAboutModalOpen: boolean;
    onOpenAboutModal: () => void;
    onCloseAboutModal: () => void;
    isSoundscapeMode: boolean;
    onToggleSoundscapeMode: () => void;
    weatherPreset: WeatherPreset;
    onWeatherPresetChange: (preset: WeatherPreset) => void;
    sunIntensity: number;
    onSunIntensityChange: (intensity: number) => void;
    sunOrbitSpeed: number;
    onSunOrbitSpeedChange: (speed: number) => void;
    starRotationSpeed: number;
    onStarRotationSpeedChange: (speed: number) => void;
    isUiVisible: boolean;
    onToggleUIVisibility: () => void;
    onToggleExplorePanel: () => void;
    queue: RadioStation[];
    onRemoveFromQueue: (stationuuid: string) => void;
    onSelectAndPlayStation: (stationuuid: string) => void;
    onSelectAndFindBird: (scientificName: string) => void;
    onFlyToLocation: (lat: number, lon: number) => void;
    onSelectCelestialTarget: (target: CelestialTarget) => void;
    favoriteStations: RadioStation[];
    onToggleFavorite: (stationuuid: string) => void;
    onRadioTextChange: (value: string) => void;
    onRadioCountryChange: (value: string) => void;
    onRadioGenreChange: (value: string) => void;
    onBirdNameChange: (value: string) => void;
    onBirdSelect: (item: { value: string; label: string }) => void;
    activeTab: ActiveTab;
    onActiveTabChange: (tab: ActiveTab) => void;
    brokenStationIds: Set<string>;
    onOpenSubmissionModal: () => void;
    isSubmissionModalOpen: boolean;
    onCloseSubmissionModal: () => void;
    onStationSubmit: (data: StationSubmission) => void;
    newStationData: StationSubmission;
    setNewStationData: React.Dispatch<React.SetStateAction<StationSubmission>>;
    onSetPickerMode: () => void;
    onOpenTreeSubmissionModal: () => void;
    timescape: TimescapeConfig;
    onTimescapeChange: (config: TimescapeConfig) => void;
    chatMessages: ChatMessage[];
    chatRole: ChatRoleId;
    chatModel: ChatModelId;
    isChatStreaming: boolean;
    chatError: string | null;
    viewerContext: string;
    onChatRoleChange: (role: ChatRoleId) => void;
    onChatModelChange: (model: ChatModelId) => void;
    onSendChatMessage: (message: string) => void;
    onClearChat: () => void;
    onDismissChatError: () => void;
    cameraViewPreset: CameraViewPreset;
    onCameraViewPresetChange: (preset: CameraViewPreset) => void;
    videoHistory: VideoCreationRecord[];
    onVideoGenerated: (record: { mode: VideoMode; prompt: string; aspectRatio: VideoAspectRatio }) => Promise<void>;
    onDeleteVideoHistoryItem: (creationId: string) => void;
    onSelectSpeciesPoint?: (point: InfoPanelData) => void;
    terrainRelief?: number;
    onTerrainReliefChange?: (relief: number) => void;
    onLocateViaMaps?: (opts: {
        stationId?: string;
        stationName?: string;
        country?: string;
        state?: string;
        lat?: number;
        lon?: number;
    }) => Promise<void>;
    isLocatingViaMaps?: boolean;
    mapsLocateResult?: {
        targetKey: string;
        text: string;
        lat: number | null;
        lon: number | null;
        mapsLinks: MapsGroundingLink[];
        error?: string;
    } | null;
    chatUseMaps?: boolean;
    onChatUseMapsChange?: (enabled: boolean) => void;
    viewMode?: 'globe' | 'map';
    onViewModeChange?: (mode: 'globe' | 'map') => void;
}

const InfoPanel: React.FC<{
    data: InfoPanelData;
    onClose: () => void;
    currentStation: RadioStation | null;
    isPlaying: boolean;
    isAudioLoading: boolean;
    audioError: string | null;
    volume: number;
    onPlayPause: () => void;
    onVolumeChange: (v: number) => void;
    isFavorite: boolean;
    onToggleFavorite: (id: string) => void;
    onLocateViaMaps?: UIProps['onLocateViaMaps'];
    isLocatingViaMaps?: boolean;
    mapsLocateResult?: UIProps['mapsLocateResult'];
}> = ({
    data,
    onClose,
    currentStation,
    isPlaying,
    isAudioLoading,
    audioError,
    volume,
    onPlayPause,
    onVolumeChange,
    isFavorite,
    onToggleFavorite,
    onLocateViaMaps,
    isLocatingViaMaps,
    mapsLocateResult,
}) => {
    if (data.type === 'celestial-star' || data.type === 'planet' || data.type === 'sun' || data.type === 'moon') return null;

    let title = 'Point Info';
    let subtitle = '';
    let image = '';
    let wikipediaUrl: string | null = null;
    if (data.type === 'radio') {
        title = data.title;
        subtitle = data.place;
    } else if (data.type === 'bird') {
        title = data.common;
        subtitle = data.scientific;
        image = data.imgUrl || '';
        wikipediaUrl = getWikipediaUrl(data.scientific, data.common);
    } else if (data.type === 'tree') {
        title = data.common;
        subtitle = data.scientific;
        image = data.imageUrl;
        wikipediaUrl = getWikipediaUrl(data.scientific, data.common);
    } else if (data.type === 'inaturalist') {
        title = data.common;
        subtitle = data.scientific;
        image = data.imageUrl;
        wikipediaUrl = getWikipediaUrl(data.scientific, data.common);
    }

    const isCurrentRadio = data.type === 'radio' && currentStation?.stationuuid === data.id;

    return (
        <div className="fixed bottom-24 left-5 w-72 md:w-80 bg-slate-950/92 rounded-2xl border border-white/15 shadow-2xl z-[70] animate-fadeIn">
            {image &&
                (wikipediaUrl ? (
                    <a href={wikipediaUrl} target="_blank" rel="noopener noreferrer" className="block group" title={`Open ${title} on Wikipedia`}>
                        <img src={image} className="w-full h-36 object-cover rounded-t-2xl border-b border-white/10 group-hover:opacity-90 transition-opacity" alt={title} />
                    </a>
                ) : (
                    <img src={image} className="w-full h-36 object-cover rounded-t-2xl border-b border-white/10" alt={title} />
                ))}
            <div className="p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                        {wikipediaUrl ? (
                            <a
                                href={wikipediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block group"
                                title={`Open ${title} on Wikipedia`}
                            >
                                <h3 className="font-black text-lg text-white italic truncate group-hover:text-blue-400 transition-colors" title={title}>
                                    {title}
                                </h3>
                                <p className="text-blue-400 text-xs font-bold italic truncate group-hover:underline">{subtitle}</p>
                            </a>
                        ) : (
                            <>
                                <h3 className="font-black text-lg text-white italic truncate" title={title}>
                                    {title}
                                </h3>
                                <p className="text-blue-400 text-xs font-bold italic truncate">{subtitle}</p>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {data.type === 'radio' && (
                            <button
                                onClick={() => onToggleFavorite(data.id)}
                                className="p-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                                title="Toggle Favorite"
                            >
                                <svg
                                    className={`w-4 h-4 ${isFavorite ? 'text-yellow-400' : 'text-slate-400'}`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 bg-white/5 rounded-full hover:bg-white/10 text-slate-400">
                            &times;
                        </button>
                    </div>
                </div>
                {wikipediaUrl && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                            <span>
                                {data.type === 'bird'
                                    ? `Confidence ${(data.score * 100).toFixed(0)}%`
                                    : data.type === 'inaturalist'
                                    ? `Observer: ${data.user}`
                                    : 'Flora Specimen'}
                            </span>
                            <span className="font-mono text-slate-500">
                                {data.lat.toFixed(1)}°, {data.lon.toFixed(1)}°
                            </span>
                        </div>
                        <a
                            href={wikipediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
                        >
                            <span>Open in Wikipedia</span>
                            <span>&nearr;</span>
                        </a>
                    </div>
                )}
                {isCurrentRadio && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onPlayPause}
                                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/30"
                            >
                                {isAudioLoading ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : isPlaying ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M6 4l10 6-10 6V4z" />
                                    </svg>
                                )}
                            </button>
                            <div className="flex-1 min-w-0">
                                <p
                                    className={`text-[10px] font-black uppercase tracking-widest ${
                                        isAudioLoading
                                            ? 'text-blue-400'
                                            : audioError === 'Tap Play to listen'
                                            ? 'text-amber-400'
                                            : audioError
                                            ? 'text-red-400'
                                            : 'text-emerald-400'
                                    }`}
                                >
                                    {isAudioLoading
                                        ? 'Healing / Connecting...'
                                        : audioError
                                        ? audioError
                                        : isPlaying
                                        ? 'Live Stream'
                                        : 'Paused'}
                                </p>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={volume}
                                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                                    className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-1.5"
                                    aria-label="Volume"
                                />
                            </div>
                        </div>
                    </div>
                )}
                {data.type === 'radio' && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span>Coords: {data.lat.toFixed(2)}°, {data.lon.toFixed(2)}°</span>
                            <div className="flex items-center gap-1.5">
                                {onLocateViaMaps && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            void onLocateViaMaps({
                                                stationId: data.id,
                                                stationName: data.title,
                                                country: data.country,
                                                state: data.state,
                                                lat: data.lat,
                                                lon: data.lon,
                                            })
                                        }
                                        disabled={isLocatingViaMaps}
                                        className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider text-emerald-200 transition-colors disabled:opacity-50"
                                    >
                                        {isLocatingViaMaps ? 'Locating...' : 'Verify Maps'}
                                    </button>
                                )}
                            </div>
                        </div>
                        {mapsLocateResult && mapsLocateResult.targetKey === data.id && (
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                                {mapsLocateResult.error ? (
                                    <p className="text-[11px] text-red-400">{mapsLocateResult.error}</p>
                                ) : (
                                    <>
                                        {mapsLocateResult.text && (
                                            <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                {mapsLocateResult.text}
                                            </p>
                                        )}
                                        {mapsLocateResult.mapsLinks.length > 0 && (
                                            <div className="flex flex-wrap gap-1 pt-1">
                                                {mapsLocateResult.mapsLinks.map((link) => (
                                                    <a
                                                        key={link.uri}
                                                        href={link.uri}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-[10px] font-bold text-emerald-200 border border-emerald-400/30"
                                                    >
                                                        <span>{link.title}</span>
                                                        <span>&nearr;</span>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export const UI: React.FC<UIProps> = (props) => {
    const {
        statusMessage,
        totalSubmissions,
        sidebarSightings,
        treeSightings,
        inatObservations,
        pinnedData,
        onCloseInfoPanel,
        filters,
        currentStation,
        isPlaying,
        isAudioLoading,
        volume,
        onPlayPause,
        onVolumeChange,
        audioError,
        isUiVisible,
        onToggleUIVisibility,
        onSelectAndPlayStation,
        onFlyToLocation,
        onSelectCelestialTarget,
        favoriteStations,
        onToggleFavorite,
        onRadioTextChange,
        onRadioCountryChange,
        uniqueCountries,
        uniqueRadioStations,
        activeTab,
        onActiveTabChange,
        isAboutModalOpen,
        onOpenAboutModal,
        onCloseAboutModal,
        timescape,
        onTimescapeChange,
        sunIntensity,
        onSunIntensityChange,
        starRotationSpeed,
        onStarRotationSpeedChange,
        terrainRelief = 0.18,
        onTerrainReliefChange,
        onOpenTreeSubmissionModal,
        onOpenSubmissionModal,
        filteredRadioStationsForSearch,
        chatMessages,
        chatRole,
        chatModel,
        isChatStreaming,
        chatError,
        viewerContext,
        onChatRoleChange,
        onChatModelChange,
        onSendChatMessage,
        onClearChat,
        onDismissChatError,
        cameraViewPreset,
        onCameraViewPresetChange,
        videoHistory,
        onVideoGenerated,
        onDeleteVideoHistoryItem,
        onSelectSpeciesPoint,
        onLocateViaMaps,
        isLocatingViaMaps,
        mapsLocateResult,
        chatUseMaps = false,
        onChatUseMapsChange,
        viewMode = 'globe',
        onViewModeChange,
    } = props;

    const { user, authReady, authError, signInWithGoogle, signOutUser, clearAuthError } = useFirebaseAuth();

    const [isSidebarMinimised, setIsSidebarMinimised] = useState(false);
    const [isDockCollapsed, setIsDockCollapsed] = useState(false);
    const [chatSize, setChatSize] = useState<ChatWindowSize>('standard');
    const [starSearchQuery, setStarSearchQuery] = useState('');

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (e.key === 'h' || e.key === 'H') {
                onToggleUIVisibility();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onToggleUIVisibility]);

    const filteredStars = useMemo(() => {
        const query = starSearchQuery.trim().toLowerCase();
        const sorted = [...allNamedStars].sort((a, b) => (a.mag ?? 99) - (b.mag ?? 99));
        if (!query) return sorted;
        return sorted.filter(
            (star) =>
                (star.name && star.name.toLowerCase().includes(query)) ||
                star.constellation.toLowerCase().includes(query) ||
                (star.spectralType && star.spectralType.toLowerCase().includes(query))
        );
    }, [starSearchQuery]);

    const tabContainerRef = useRef<HTMLDivElement>(null);
    const isDraggingTabs = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const onMouseDown = (e: React.MouseEvent) => {
        if (!tabContainerRef.current) return;
        isDraggingTabs.current = true;
        startX.current = e.pageX - tabContainerRef.current.offsetLeft;
        scrollLeft.current = tabContainerRef.current.scrollLeft;
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingTabs.current || !tabContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - tabContainerRef.current.offsetLeft;
        const walk = (x - startX.current) * 2;
        tabContainerRef.current.scrollLeft = scrollLeft.current - walk;
    };

    const stopDragging = () => {
        isDraggingTabs.current = false;
    };

    const openPanelTab = (tab: ActiveTab) => {
        if (!isUiVisible) onToggleUIVisibility();
        setIsSidebarMinimised(false);
        onActiveTabChange(tab);
    };

    const tabList: { id: ActiveTab; label: string }[] = [
        { id: 'stations', label: 'Radio' },
        { id: 'detections', label: 'Birds' },
        { id: 'inaturalist', label: 'iNet' },
        { id: 'trees', label: 'Flora' },
        { id: 'celestial', label: 'Space' },
        { id: 'chat', label: 'Chat' },
        { id: 'voice', label: 'Voice' },
        { id: 'video', label: 'Video' },
        { id: 'timescape', label: 'Time' },
        { id: 'visuals', label: 'FX' },
        { id: 'favorites', label: 'Saved' },
    ];

    const viewPresets: { id: CameraViewPreset; label: string }[] = [
        { id: 'earth', label: 'Earth' },
        { id: 'satellite', label: 'Orbiter' },
        { id: 'solar', label: 'Solar' },
        { id: 'zenith', label: 'Zenith' },
    ];

    return (
        <>
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .tab-fade-right { mask-image: linear-gradient(to right, black 85%, transparent); }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.35s ease-out forwards; }
            `}</style>

            {/* Minimal Top-Left Branding */}
            <div
                className={`absolute top-0 left-0 p-5 pointer-events-none transition-all duration-500 ${
                    isUiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                }`}
            >
                <h1 className="text-xl md:text-3xl font-black text-white italic uppercase tracking-tighter">
                    Solar Scope Radio
                </h1>
                <p className="text-[10px] md:text-xs font-bold tracking-widest text-cyan-400 uppercase">
                    Orbital Observatory • {totalSubmissions.toLocaleString()} Bio-Acoustic Detections
                </p>
            </div>

            <PlanetSlider isVisible={isUiVisible && activeTab === 'celestial'} onSelectTarget={onSelectCelestialTarget} />

            {pinnedData && (
                <InfoPanel
                    data={pinnedData}
                    onClose={onCloseInfoPanel}
                    currentStation={currentStation}
                    isPlaying={isPlaying}
                    isAudioLoading={isAudioLoading}
                    audioError={audioError}
                    volume={volume}
                    onPlayPause={onPlayPause}
                    onVolumeChange={onVolumeChange}
                    isFavorite={pinnedData.type === 'radio' ? favoriteStations.some((s) => s.stationuuid === pinnedData.id) : false}
                    onToggleFavorite={onToggleFavorite}
                    onLocateViaMaps={onLocateViaMaps}
                    isLocatingViaMaps={isLocatingViaMaps}
                    mapsLocateResult={mapsLocateResult}
                />
            )}

            {/* Top-Right Compact Bar & Collapsible Tool Drawer */}
            <div className="fixed top-5 right-5 flex flex-col items-end gap-2.5 z-[60]">
                <div className="flex items-center gap-2 pointer-events-auto">
                    {authReady &&
                        (user ? (
                            <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-slate-950/92 rounded-xl border border-white/15 shadow-xl">
                                {user.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt={user.displayName || 'User'}
                                        className="w-6 h-6 rounded-full object-cover border border-white/20"
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black uppercase">
                                        {(user.displayName || user.email || 'U')[0]}
                                    </div>
                                )}
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 max-w-[90px] truncate hidden sm:inline">
                                    {user.displayName || user.email}
                                </span>
                                <button
                                    onClick={signOutUser}
                                    className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors pl-1 border-l border-white/15"
                                    title="Sign out"
                                >
                                    Out
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={signInWithGoogle}
                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl border border-blue-400/40 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z" />
                                </svg>
                                Sign In
                            </button>
                        ))}
                    {onViewModeChange && (
                        <button
                            type="button"
                            onClick={() => onViewModeChange(viewMode === 'map' ? 'globe' : 'map')}
                            className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all shadow-xl ${
                                viewMode === 'map'
                                    ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/50 text-white'
                                    : 'bg-slate-950/92 hover:bg-emerald-600/30 border-emerald-500/40 text-emerald-300 hover:text-white'
                            }`}
                            title={viewMode === 'map' ? 'Switch back to 3D Solar Globe' : 'Open interactive Google Maps view'}
                        >
                            {viewMode === 'map' ? '3D Globe' : 'Google Maps'}
                        </button>
                    )}
                    <button
                        onClick={onToggleUIVisibility}
                        className="px-3 py-2 bg-slate-950/92 rounded-xl border border-white/15 text-[10px] font-black uppercase tracking-wider text-slate-200 hover:bg-slate-800 transition-all shadow-xl"
                        title="Toggle HUD (Shortcut: H)"
                    >
                        {isUiVisible ? 'Hide HUD' : 'Show HUD'}
                    </button>
                    <button
                        onClick={onOpenAboutModal}
                        className="p-2.5 bg-slate-950/92 rounded-xl border border-white/15 text-white hover:bg-slate-800 transition-all shadow-xl"
                        title="About"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </div>

                {authError && (
                    <div className="pointer-events-auto bg-red-950 border border-red-500/40 text-red-200 text-[11px] px-4 py-2 rounded-xl flex items-center gap-2 shadow-xl max-w-xs">
                        <span className="truncate">{authError}</span>
                        <button onClick={clearAuthError} className="text-red-300 hover:text-white font-bold">
                            &times;
                        </button>
                    </div>
                )}

                <div
                    className={`bg-slate-950/92 rounded-2xl flex flex-col pointer-events-auto border border-white/15 shadow-2xl transition-all duration-300 ease-out ${
                        activeTab === 'chat' && !isSidebarMinimised
                            ? chatSize === 'wide'
                                ? 'w-[calc(100vw-2.5rem)] md:w-[46rem] lg:w-[54rem] max-h-[82vh] md:max-h-[calc(100vh-8.5rem)]'
                                : chatSize === 'large'
                                ? 'w-[calc(100vw-2.5rem)] md:w-[34rem] max-h-[78vh] md:max-h-[calc(100vh-10rem)]'
                                : 'w-[calc(100vw-2.5rem)] md:w-96 max-h-[70vh] md:max-h-[calc(100vh-13rem)]'
                            : `w-[calc(100vw-2.5rem)] md:w-96 ${
                                  isSidebarMinimised ? 'max-h-[56px]' : 'max-h-[70vh] md:max-h-[calc(100vh-12rem)]'
                              }`
                    } ${isUiVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                >
                    <div className="relative border-b border-white/10 p-2.5 flex items-center justify-between">
                        <div
                            ref={tabContainerRef}
                            onMouseDown={onMouseDown}
                            onMouseMove={onMouseMove}
                            onMouseUp={stopDragging}
                            onMouseLeave={stopDragging}
                            className="flex overflow-x-auto no-scrollbar gap-1 px-1 tab-fade-right cursor-grab active:cursor-grabbing select-none"
                        >
                            {tabList.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => openPanelTab(tab.id)}
                                    className={`px-3 py-1.5 text-[10px] font-black rounded-lg flex-shrink-0 transition-all uppercase tracking-tight ${
                                        activeTab === tab.id
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-400 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setIsSidebarMinimised(!isSidebarMinimised)}
                            className="p-1.5 text-slate-400 hover:text-white transition-colors"
                            title={isSidebarMinimised ? 'Expand panel' : 'Collapse panel'}
                        >
                            {isSidebarMinimised ? '▼' : '▲'}
                        </button>
                    </div>

                    {!isSidebarMinimised && (
                        <div className="overflow-y-auto p-4 flex-1 space-y-4 no-scrollbar">
                            {activeTab === 'detections' &&
                                sidebarSightings.map((s) => (
                                    <a
                                        key={s.id}
                                        href={getWikipediaUrl(s.scientific_name, s.common_name)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => {
                                            onFlyToLocation(s.lat, s.lon);
                                            onSelectSpeciesPoint?.({
                                                id: s.id,
                                                lat: s.lat,
                                                lon: s.lon,
                                                type: 'bird',
                                                common: s.common_name,
                                                scientific: s.scientific_name,
                                                score: s.confidence,
                                                createdAt: s.createdAt,
                                                imgUrl: s.imgUrl,
                                            });
                                        }}
                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group border border-transparent hover:border-white/5"
                                        title={`Open ${s.common_name} (${s.scientific_name}) on Wikipedia`}
                                    >
                                        <img
                                            src={s.imgUrl}
                                            className="w-11 h-11 object-cover rounded-lg bg-slate-800 flex-shrink-0"
                                            alt={s.common_name}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-xs text-white italic group-hover:text-blue-400 transition-colors truncate">
                                                {s.common_name}
                                            </p>
                                            <p className="text-[9px] text-slate-400 italic truncate">{s.scientific_name}</p>
                                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">
                                                Confidence: {(s.confidence * 100).toFixed(0)}%
                                            </p>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 opacity-75 group-hover:opacity-100 flex-shrink-0">
                                            Wiki &nearr;
                                        </span>
                                    </a>
                                ))}

                            {activeTab === 'inaturalist' &&
                                inatObservations.map((obs) => (
                                    <a
                                        key={obs.id}
                                        href={getWikipediaUrl(obs.scientific_name, obs.common_name)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => {
                                            onFlyToLocation(obs.lat, obs.lon);
                                            onSelectSpeciesPoint?.({
                                                id: obs.id,
                                                lat: obs.lat,
                                                lon: obs.lon,
                                                type: 'inaturalist',
                                                common: obs.common_name,
                                                scientific: obs.scientific_name,
                                                imageUrl: obs.imageUrl,
                                                user: obs.user,
                                            });
                                        }}
                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer group border border-transparent hover:border-white/5"
                                        title={`Open ${obs.common_name} (${obs.scientific_name}) on Wikipedia`}
                                    >
                                        <img
                                            src={obs.imageUrl}
                                            className="w-11 h-11 object-cover rounded-lg bg-slate-800 flex-shrink-0"
                                            alt={obs.common_name}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-xs text-white italic group-hover:text-cyan-400 transition-colors truncate">
                                                {obs.common_name}
                                            </p>
                                            <p className="text-[9px] text-slate-400 italic truncate">{obs.scientific_name}</p>
                                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">
                                                Observer: {obs.user}
                                            </p>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 opacity-75 group-hover:opacity-100 flex-shrink-0">
                                            Wiki &nearr;
                                        </span>
                                    </a>
                                ))}

                            {activeTab === 'stations' && (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Search stations, cities, countries..."
                                            value={filters.radio.text}
                                            onChange={(e) => onRadioTextChange(e.target.value)}
                                            className="flex-1 bg-slate-800 rounded-xl px-4 py-2.5 text-xs text-white border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/50 font-bold"
                                        />
                                        <button
                                            onClick={onOpenSubmissionModal}
                                            className="px-3 py-2.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-xl border border-blue-500/30 text-[10px] font-black uppercase tracking-wider transition-all flex-shrink-0"
                                            title="Submit a radio station"
                                        >
                                            + Add
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={filters.radio.country}
                                            onChange={(e) => onRadioCountryChange(e.target.value)}
                                            aria-label="Filter stations by country"
                                            className="flex-1 bg-slate-800 rounded-xl px-3 py-2 text-xs text-white border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/50 font-bold"
                                        >
                                            <option value="all">All Countries ({uniqueRadioStations.length})</option>
                                            {uniqueCountries.map((country) => (
                                                <option key={country} value={country}>
                                                    {country}
                                                </option>
                                            ))}
                                        </select>
                                        {filters.radio.country !== 'all' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const c = getCountryCenter(filters.radio.country);
                                                    if (c) onFlyToLocation(c.lat, c.lon);
                                                    void onLocateViaMaps?.({ country: filters.radio.country, lat: c?.lat, lon: c?.lon });
                                                }}
                                                disabled={isLocatingViaMaps}
                                                className="px-2.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider text-emerald-200 transition-colors flex-shrink-0 disabled:opacity-50"
                                                title="Center globe & ground country info with Google Maps"
                                            >
                                                {isLocatingViaMaps ? 'Maps...' : 'Maps Info'}
                                            </button>
                                        )}
                                    </div>
                                    {filters.radio.country !== 'all' &&
                                        mapsLocateResult &&
                                        mapsLocateResult.targetKey === `country:${filters.radio.country}` && (
                                            <div className="p-3 rounded-xl bg-white/5 border border-emerald-500/25 space-y-2">
                                                {mapsLocateResult.error ? (
                                                    <p className="text-[11px] text-red-400">{mapsLocateResult.error}</p>
                                                ) : (
                                                    <>
                                                        {mapsLocateResult.text && (
                                                            <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                                {mapsLocateResult.text}
                                                            </p>
                                                        )}
                                                        {mapsLocateResult.mapsLinks.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {mapsLocateResult.mapsLinks.map((link) => (
                                                                    <a
                                                                        key={link.uri}
                                                                        href={link.uri}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-[10px] font-bold text-emerald-200 border border-emerald-400/30"
                                                                    >
                                                                        <span>{link.title}</span>
                                                                        <span>&nearr;</span>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    <div className="space-y-1">
                                        {filteredRadioStationsForSearch.slice(0, 60).map((station) => {
                                            const isActive = currentStation?.stationuuid === station.stationuuid;
                                            return (
                                                <div
                                                    key={station.stationuuid}
                                                    className={`flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 group border transition-colors ${
                                                        isActive
                                                            ? 'bg-blue-600/15 border-blue-500/30'
                                                            : 'border-transparent hover:border-white/5'
                                                    }`}
                                                >
                                                    <div className="flex-1 truncate pr-2">
                                                        <p
                                                            className={`font-bold text-xs italic truncate transition-colors ${
                                                                isActive ? 'text-blue-400' : 'text-white group-hover:text-blue-400'
                                                            }`}
                                                        >
                                                            {station.name}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 uppercase tracking-widest">
                                                            {station.state ? `${station.state}, ${station.country}` : station.country}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => onSelectAndPlayStation(station.stationuuid)}
                                                        className={`p-2.5 rounded-full transition-all ${
                                                            isActive && isPlaying
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white'
                                                        }`}
                                                    >
                                                        {isActive && isAudioLoading ? (
                                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        ) : isActive && isPlaying ? (
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.841z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'trees' && (
                                <div className="space-y-4">
                                    <button
                                        onClick={onOpenTreeSubmissionModal}
                                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Identify Specimen
                                    </button>
                                    <div className="space-y-2">
                                        {treeSightings.map((t) => (
                                            <a
                                                key={t.id}
                                                href={getWikipediaUrl(t.scientific_name, t.common_name)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={() => {
                                                    onFlyToLocation(t.lat, t.lon);
                                                    onSelectSpeciesPoint?.({
                                                        id: t.id,
                                                        lat: t.lat,
                                                        lon: t.lon,
                                                        type: 'tree',
                                                        common: t.common_name,
                                                        scientific: t.scientific_name,
                                                        imageUrl: t.imageUrl,
                                                        createdAt: t.createdAt,
                                                    });
                                                }}
                                                className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer group border border-transparent hover:border-white/5"
                                                title={`Open ${t.common_name} (${t.scientific_name}) on Wikipedia`}
                                            >
                                                <img
                                                    src={t.imageUrl}
                                                    className="w-11 h-11 object-cover rounded-lg bg-slate-800 flex-shrink-0"
                                                    alt={t.common_name}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-xs text-white italic group-hover:text-emerald-400 transition-colors truncate">
                                                        {t.common_name}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest truncate">
                                                        {t.scientific_name}
                                                    </p>
                                                </div>
                                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 opacity-75 group-hover:opacity-100 flex-shrink-0">
                                                    Wiki &nearr;
                                                </span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'celestial' && (
                                <div className="space-y-4">
                                    <div className="p-3.5 bg-purple-500/10 border border-purple-500/25 rounded-xl">
                                        <h4 className="text-purple-300 text-[10px] font-black uppercase tracking-widest mb-1">Astrometry Active</h4>
                                        <p className="text-slate-300 text-[11px] leading-relaxed">
                                            Search bright stars by name, constellation, or spectral class, or switch to Solar view below.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Star Search</span>
                                            <span className="text-[9px] font-mono text-purple-300">{filteredStars.length} stars</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search stars, Orion, Sirius, A1V..."
                                                value={starSearchQuery}
                                                onChange={(e) => setStarSearchQuery(e.target.value)}
                                                className="w-full bg-slate-800 rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-white border border-white/10 outline-none focus:ring-2 focus:ring-purple-500/50 font-bold"
                                            />
                                            {starSearchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={() => setStarSearchQuery('')}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm font-bold"
                                                    title="Clear star search"
                                                >
                                                    &times;
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                                            {filteredStars.length > 0 ? (
                                                filteredStars.map((star) => {
                                                    const isSelected = pinnedData?.type === 'celestial-star' && pinnedData.name === star.name;
                                                    const specKey = star.spectralType ? star.spectralType[0] : '';
                                                    const specColor =
                                                        specKey === 'O'
                                                            ? '#9bb0ff'
                                                            : specKey === 'B'
                                                            ? '#aabfff'
                                                            : specKey === 'A'
                                                            ? '#cad7ff'
                                                            : specKey === 'F'
                                                            ? '#f8f7ff'
                                                            : specKey === 'G'
                                                            ? '#fff4ea'
                                                            : specKey === 'K'
                                                            ? '#ffd2a1'
                                                            : specKey === 'M'
                                                            ? '#ffcc6f'
                                                            : '#ffffff';
                                                    return (
                                                        <button
                                                            key={`${star.constellation}-${star.name}`}
                                                            type="button"
                                                            onClick={() =>
                                                                star.name &&
                                                                onSelectCelestialTarget({
                                                                    type: 'star',
                                                                    name: star.name,
                                                                    ra: star.ra,
                                                                    dec: star.dec,
                                                                })
                                                            }
                                                            className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                                                                isSelected
                                                                    ? 'bg-purple-600/20 border-purple-500/40'
                                                                    : 'bg-white/5 border-transparent hover:bg-purple-600/15 hover:border-purple-500/25'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <span
                                                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                    style={{ backgroundColor: specColor }}
                                                                />
                                                                <div className="min-w-0">
                                                                    <p
                                                                        className={`text-xs font-bold italic truncate ${
                                                                            isSelected ? 'text-purple-300' : 'text-white'
                                                                        }`}
                                                                    >
                                                                        {star.name}
                                                                    </p>
                                                                    <p className="text-[9px] text-slate-400 uppercase tracking-wider truncate">
                                                                        {star.constellation} {star.spectralType ? `• ${star.spectralType}` : ''}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] font-mono text-slate-300 flex-shrink-0 ml-2">
                                                                {star.mag !== undefined ? `mag ${star.mag.toFixed(2)}` : ''}
                                                            </span>
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                <p className="text-center py-4 text-[11px] text-slate-500">No matching stars found.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Planets</span>
                                        <div className="grid grid-cols-2 gap-2">
                                            {planetsMetadata.map((p) => (
                                                <button
                                                    key={p.name}
                                                    onClick={() => onSelectCelestialTarget({ type: 'planet', name: p.name })}
                                                    className="p-3 bg-white/5 rounded-xl text-[10px] font-black uppercase text-slate-300 hover:text-white hover:bg-purple-600/20 transition-all border border-white/5 flex items-center gap-2"
                                                >
                                                    <div
                                                        className="w-4 h-4 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: `#${p.color.toString(16).padStart(6, '0')}` }}
                                                    />
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'chat' && (
                                <ChatPanel
                                    messages={chatMessages}
                                    role={chatRole}
                                    model={chatModel}
                                    isStreaming={isChatStreaming}
                                    error={chatError}
                                    currentStation={currentStation}
                                    pinnedData={pinnedData}
                                    chatSize={chatSize}
                                    onChatSizeChange={setChatSize}
                                    onRoleChange={onChatRoleChange}
                                    onModelChange={onChatModelChange}
                                    useMapsGrounding={chatUseMaps}
                                    onToggleMapsGrounding={() => onChatUseMapsChange?.(!chatUseMaps)}
                                    onSendMessage={onSendChatMessage}
                                    onClearChat={onClearChat}
                                    onDismissError={onDismissChatError}
                                />
                            )}

                            {activeTab === 'voice' && <LiveVoicePanel activeRole={chatRole} viewerContext={viewerContext} />}

                            {activeTab === 'video' && (
                                <VideoStudioPanel
                                    videoHistory={videoHistory}
                                    isSignedIn={!!user}
                                    onSignIn={() => {
                                        void signInWithGoogle();
                                    }}
                                    onVideoGenerated={onVideoGenerated}
                                    onDeleteHistoryItem={onDeleteVideoHistoryItem}
                                />
                            )}

                            {activeTab === 'timescape' && (
                                <div className="space-y-5">
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                        <p className="text-[10px] font-black text-blue-300 uppercase mb-1 tracking-widest">
                                            Temporal Synchronisation
                                        </p>
                                        <p className="text-white font-mono text-xs">{new Date(Date.now() + timescape.offset).toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                                            <span>Normal Time</span>
                                            <span>Hyper-Speed ({timescape.speed}x)</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="1000"
                                            step="1"
                                            value={timescape.speed}
                                            onChange={(e) => onTimescapeChange({ ...timescape, speed: parseFloat(e.target.value) })}
                                            className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <button
                                        onClick={() => onTimescapeChange({ ...timescape, isPaused: !timescape.isPaused })}
                                        className={`w-full py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${
                                            timescape.isPaused ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200'
                                        }`}
                                    >
                                        {timescape.isPaused ? 'Resume Universal Flux' : 'Pause Epoch'}
                                    </button>
                                </div>
                            )}

                            {activeTab === 'visuals' && (
                                <div className="space-y-6 py-2">
                                    {onTerrainReliefChange && (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Globe 3D Terrain</label>
                                                <span className="text-[10px] font-mono text-emerald-400">{Math.round((terrainRelief / 0.18) * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="0.36"
                                                step="0.01"
                                                value={terrainRelief}
                                                onChange={(e) => onTerrainReliefChange(parseFloat(e.target.value))}
                                                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sun Exposure</label>
                                            <span className="text-[10px] font-mono text-blue-400">{sunIntensity.toFixed(1)} EV</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="8"
                                            step="0.1"
                                            value={sunIntensity}
                                            onChange={(e) => onSunIntensityChange(parseFloat(e.target.value))}
                                            className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sidereal Drift</label>
                                            <span className="text-[10px] font-mono text-purple-400">{(starRotationSpeed * 100).toFixed(0)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="0.5"
                                            step="0.01"
                                            value={starRotationSpeed}
                                            onChange={(e) => onStarRotationSpeedChange(parseFloat(e.target.value))}
                                            className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'favorites' && (
                                <div className="space-y-3">
                                    {!user && authReady && (
                                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2.5">
                                            <p className="text-[11px] text-slate-300 leading-relaxed">
                                                Sign in with Google to save and sync your favorite stations across sessions.
                                            </p>
                                            <button
                                                onClick={signInWithGoogle}
                                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Sign in with Google
                                            </button>
                                        </div>
                                    )}
                                    {favoriteStations.length > 0 ? (
                                        favoriteStations.map((station) => (
                                            <div
                                                key={station.stationuuid}
                                                className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-yellow-500/10 transition-all border border-transparent hover:border-yellow-500/20 group"
                                            >
                                                <div onClick={() => onSelectAndPlayStation(station.stationuuid)} className="cursor-pointer truncate flex-1 pr-3">
                                                    <p className="font-bold text-xs text-white italic truncate group-hover:text-yellow-400 transition-colors">
                                                        {station.name}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 uppercase tracking-widest">{station.country}</p>
                                                </div>
                                                <button
                                                    onClick={() => onToggleFavorite(station.stationuuid)}
                                                    className="p-1.5 text-yellow-400 hover:scale-125 transition-transform"
                                                >
                                                    ★
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-8 text-center text-slate-500">
                                            <p className="text-[11px] uppercase font-black tracking-widest opacity-50 mb-2">No bookmarks indexed</p>
                                            <p className="text-[10px]">Select a station to save it here.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Compact Collapsible Floating Bottom Control Dock (<= 15% height, leaves center viewport clear) */}
            <div
                className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[65] max-w-[96vw] transition-all duration-500 ${
                    isUiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
                }`}
            >
                <div className="bg-slate-950/92 border border-white/15 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button
                        type="button"
                        onClick={() => setIsDockCollapsed((c) => !c)}
                        className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase text-slate-300 flex-shrink-0"
                        title={isDockCollapsed ? 'Expand dock' : 'Collapse dock'}
                    >
                        {isDockCollapsed ? 'Dock +' : 'Dock −'}
                    </button>

                    {!isDockCollapsed && (
                        <>
                            <div className="h-5 w-px bg-white/10 flex-shrink-0" />
                            {/* Camera View Presets */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {viewPresets.map((preset) => (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => {
                                            if (viewMode === 'map') onViewModeChange?.('globe');
                                            onCameraViewPresetChange(preset.id);
                                        }}
                                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                                            viewMode === 'globe' && cameraViewPreset === preset.id
                                                ? 'bg-cyan-600 text-white'
                                                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                                {onViewModeChange && (
                                    <button
                                        type="button"
                                        onClick={() => onViewModeChange(viewMode === 'map' ? 'globe' : 'map')}
                                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                                            viewMode === 'map'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-emerald-600/15 text-emerald-300 hover:bg-emerald-600 hover:text-white'
                                        }`}
                                    >
                                        Maps
                                    </button>
                                )}
                            </div>

                            <div className="h-5 w-px bg-white/10 flex-shrink-0" />

                            {/* Studio & Telemetry Quick Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => openPanelTab('voice')}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                                        activeTab === 'voice'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-emerald-600/15 text-emerald-300 hover:bg-emerald-600 hover:text-white'
                                    }`}
                                >
                                    Voice
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openPanelTab('video')}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                                        activeTab === 'video'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-purple-600/15 text-purple-300 hover:bg-purple-600 hover:text-white'
                                    }`}
                                >
                                    Video
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openPanelTab('chat')}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                                        activeTab === 'chat'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-blue-600/15 text-blue-300 hover:bg-blue-600 hover:text-white'
                                    }`}
                                >
                                    Chat
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openPanelTab('celestial')}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                                        activeTab === 'celestial'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    Stars
                                </button>
                            </div>

                            {currentStation && (
                                <>
                                    <div className="h-5 w-px bg-white/10 flex-shrink-0" />
                                    <button
                                        type="button"
                                        onClick={onPlayPause}
                                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30 text-left flex-shrink-0"
                                        title={isPlaying ? 'Pause radio' : 'Resume radio'}
                                    >
                                        <span className="text-[10px] font-black uppercase text-blue-300">
                                            {isPlaying ? 'Pause' : 'Play'}
                                        </span>
                                        <span className="text-[10px] font-bold text-white max-w-[110px] truncate">{currentStation.name}</span>
                                    </button>
                                </>
                            )}

                            <span className="hidden lg:inline text-[9px] font-black uppercase tracking-widest text-slate-400 pl-2 border-l border-white/10 flex-shrink-0">
                                {statusMessage}
                            </span>
                        </>
                    )}
                </div>
            </div>

            <AboutModal isOpen={isAboutModalOpen} onClose={onCloseAboutModal} />
        </>
    );
};
