
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { BirdSighting, TreeSighting, InfoPanelData, Filters, RadioStation, WeatherPreset, BirdPointData, RadioPointData, ActiveTab, StationSubmission, TreePointData, CelestialTarget, INaturalistObservation, TimescapeConfig, INaturalistPointData } from '../types';
import AboutModal from './AboutModal';
import { allNamedStars } from '../services/constellationData';
import { planetsMetadata } from './Globe';
import PlanetSlider from './PlanetSlider';
import { useFirebaseAuth } from './FirebaseProvider';

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
    uniqueBirdSpecies: { scientific: string, common: string }[];
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
}> = ({ data, onClose, currentStation, isPlaying, isAudioLoading, audioError, volume, onPlayPause, onVolumeChange, isFavorite, onToggleFavorite }) => {
    if (data.type === 'celestial-star' || data.type === 'planet' || data.type === 'sun' || data.type === 'moon') return null;

    let title = "Point Info";
    let subtitle = "";
    let image = "";
    if (data.type === 'radio') { title = data.title; subtitle = data.place; }
    else if (data.type === 'bird') { title = data.common; subtitle = data.scientific; image = data.imgUrl || ""; }
    else if (data.type === 'tree') { title = data.common; subtitle = data.scientific; image = data.imageUrl; }
    else if (data.type === 'inaturalist') { title = data.common; subtitle = data.scientific; image = data.imageUrl; }

    const isCurrentRadio = data.type === 'radio' && currentStation?.stationuuid === data.id;

    return (
        <div className="fixed bottom-32 left-5 w-72 md:w-80 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl z-[70] animate-fadeIn">
            {image && <img src={image} className="w-full h-40 object-cover rounded-t-2xl border-b border-white/10" alt={title} />}
            <div className="p-5">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                        <h3 className="font-black text-xl text-white italic truncate" title={title}>{title}</h3>
                        <p className="text-blue-400 text-xs font-bold italic truncate">{subtitle}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        {data.type === 'radio' && (
                            <button onClick={() => onToggleFavorite(data.id)} className="p-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors" title="Toggle Favorite">
                                <svg className={`w-4 h-4 ${isFavorite ? 'text-yellow-400' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 bg-white/5 rounded-full hover:bg-white/10 text-slate-400">
                            &times;
                        </button>
                    </div>
                </div>
                {isCurrentRadio && (
                    <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
                        <div className="flex items-center gap-3">
                            <button onClick={onPlayPause} className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/30">
                                {isAudioLoading ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : isPlaying ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" /></svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4l10 6-10 6V4z" /></svg>
                                )}
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${audioError ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {audioError ? audioError : isAudioLoading ? 'Connecting...' : isPlaying ? 'Live Stream' : 'Paused'}
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
            </div>
        </div>
    );
};

export const UI: React.FC<UIProps> = (props) => {
    const {
        statusMessage, totalSubmissions, sidebarSightings, treeSightings, inatObservations,
        pinnedData, onCloseInfoPanel, filters,
        currentStation, isPlaying, isAudioLoading, volume, onPlayPause, onVolumeChange, audioError,
        isUiVisible, onToggleUIVisibility, onSelectAndPlayStation, onFlyToLocation, onSelectCelestialTarget,
        favoriteStations, onToggleFavorite, onRadioTextChange, activeTab, onActiveTabChange,
        isAboutModalOpen, onOpenAboutModal, onCloseAboutModal, timescape, onTimescapeChange,
        sunIntensity, onSunIntensityChange, starRotationSpeed, onStarRotationSpeedChange, onOpenTreeSubmissionModal,
        onOpenSubmissionModal, filteredRadioStationsForSearch
    } = props;

    const { user, authReady, authError, signInWithGoogle, signOutUser, clearAuthError } = useFirebaseAuth();

    const [isSidebarMinimised, setIsSidebarMinimised] = useState(false);
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

    const stopDragging = () => { isDraggingTabs.current = false; };

    const tabList: { id: ActiveTab; label: string }[] = [
        { id: 'detections', label: 'Birds' },
        { id: 'inaturalist', label: 'iNet' },
        { id: 'stations', label: 'Radio' },
        { id: 'trees', label: 'Flora' },
        { id: 'celestial', label: 'Space' },
        { id: 'timescape', label: 'Time' },
        { id: 'visuals', label: 'FX' },
        { id: 'favorites', label: 'Saved' }
    ];

    return (
        <>
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .tab-fade-right { mask-image: linear-gradient(to right, black 85%, transparent); }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
            `}</style>
            
            <div className={`absolute top-0 left-0 w-full p-5 text-shadow pointer-events-none transition-all duration-700 ${isUiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'}`}>
                <h1 className="text-xl md:text-4xl font-black text-white italic uppercase tracking-tighter">Solar Scope Radio</h1>
                <p className="text-[10px] md:text-xs opacity-90 font-bold tracking-widest text-cyan-400 uppercase">Engine v1.5 • Galactic Core Sync</p>
            </div>

            <PlanetSlider isVisible={activeTab === 'celestial'} onSelectTarget={onSelectCelestialTarget} />
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
                    isFavorite={pinnedData.type === 'radio' ? favoriteStations.some(s => s.stationuuid === pinnedData.id) : false}
                    onToggleFavorite={onToggleFavorite}
                />
            )}

            <div className="fixed top-5 right-5 flex flex-col items-end gap-3 z-[60]">
                <div className="flex items-center gap-2 pointer-events-auto">
                    {authReady && (
                        user ? (
                            <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-black/60 backdrop-blur-xl rounded-full border border-white/20 shadow-xl">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full object-cover border border-white/20" />
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
                                className="px-4 py-2.5 bg-blue-600/90 hover:bg-blue-500 backdrop-blur-xl rounded-full border border-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z" /></svg>
                                Sign In
                            </button>
                        )
                    )}
                    <button onClick={onToggleUIVisibility} className="p-3 bg-black/50 backdrop-blur-xl rounded-full border border-white/20 text-white hover:bg-black/70 transition-all shadow-xl">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <button onClick={onOpenAboutModal} className="p-3 bg-black/50 backdrop-blur-xl rounded-full border border-white/20 text-white hover:bg-black/70 transition-all shadow-xl">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" /></svg>
                    </button>
                </div>
                {authError && (
                    <div className="pointer-events-auto bg-red-950/90 border border-red-500/40 text-red-200 text-[11px] px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl max-w-xs">
                        <span className="truncate">{authError}</span>
                        <button onClick={clearAuthError} className="text-red-300 hover:text-white font-bold">&times;</button>
                    </div>
                )}

                <div className={`bg-slate-900/85 backdrop-blur-3xl rounded-3xl w-[calc(100vw-2.5rem)] md:w-96 flex flex-col pointer-events-auto border border-white/10 shadow-2xl transition-all duration-500 ease-out ${isUiVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'} ${isSidebarMinimised ? 'max-h-[60px]' : 'max-h-[75vh] md:max-h-[calc(100vh-14rem)]'}`}>
                    <div className="relative border-b border-white/5 p-3 flex items-center justify-between">
                        <div ref={tabContainerRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={stopDragging} onMouseLeave={stopDragging} className="flex overflow-x-auto no-scrollbar gap-1.5 px-1 tab-fade-right cursor-grab active:cursor-grabbing select-none">
                            {tabList.map(tab => (
                                <button key={tab.id} onClick={() => onActiveTabChange(tab.id)} className={`px-4 py-2 text-[10px] font-black rounded-xl flex-shrink-0 transition-all uppercase tracking-tight ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setIsSidebarMinimised(!isSidebarMinimised)} className="p-2 text-slate-500 hover:text-white transition-colors">
                            {isSidebarMinimised ? '▼' : '▲'}
                        </button>
                    </div>

                    {!isSidebarMinimised && (
                        <div className="overflow-y-auto p-4 flex-1 space-y-4 no-scrollbar">
                            {activeTab === 'detections' && sidebarSightings.map(s => (
                                <div key={s.id} onClick={() => onFlyToLocation(s.lat, s.lon)} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group border border-transparent hover:border-white/5">
                                    <img src={s.imgUrl} className="w-12 h-12 object-cover rounded-xl bg-slate-800 shadow-inner" alt={s.common_name} />
                                    <div>
                                        <p className="font-bold text-xs text-white italic group-hover:text-blue-400 transition-colors">{s.common_name}</p>
                                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Confidence: {(s.confidence*100).toFixed(0)}%</p>
                                    </div>
                                </div>
                            ))}

                            {activeTab === 'inaturalist' && inatObservations.map(obs => (
                                <div key={obs.id} onClick={() => onFlyToLocation(obs.lat, obs.lon)} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/5 cursor-pointer group border border-transparent hover:border-white/5">
                                    <img src={obs.imageUrl} className="w-12 h-12 object-cover rounded-xl bg-slate-800 shadow-inner" alt={obs.common_name} />
                                    <div>
                                        <p className="font-bold text-xs text-white italic group-hover:text-cyan-400 transition-colors">{obs.common_name}</p>
                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Observer: {obs.user}</p>
                                    </div>
                                </div>
                            ))}

                            {activeTab === 'stations' && (
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Search stations, countries, Israel..." value={filters.radio.text} onChange={e => onRadioTextChange(e.target.value)} className="flex-1 bg-slate-800/80 rounded-2xl px-5 py-3 text-xs text-white border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold" />
                                        <button onClick={onOpenSubmissionModal} className="px-3.5 py-3 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-2xl border border-blue-500/30 text-[10px] font-black uppercase tracking-wider transition-all flex-shrink-0" title="Submit a radio station">
                                            + Add
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        {filteredRadioStationsForSearch.slice(0, 60).map(station => {
                                            const isActive = currentStation?.stationuuid === station.stationuuid;
                                            return (
                                                <div key={station.stationuuid} className={`flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 group border transition-colors ${isActive ? 'bg-blue-600/15 border-blue-500/30' : 'border-transparent hover:border-white/5'}`}>
                                                    <div className="flex-1 truncate pr-2">
                                                        <p className={`font-bold text-xs italic truncate transition-colors ${isActive ? 'text-blue-400' : 'text-white group-hover:text-blue-400'}`}>{station.name}</p>
                                                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">{station.state ? `${station.state}, ${station.country}` : station.country}</p>
                                                    </div>
                                                    <button onClick={() => onSelectAndPlayStation(station.stationuuid)} className={`p-3 rounded-full transition-all shadow-inner ${isActive && isPlaying ? 'bg-blue-600 text-white' : 'bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white'}`}>
                                                        {isActive && isAudioLoading ? (
                                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                        ) : isActive && isPlaying ? (
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" /></svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.841z" /></svg>
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
                                    <button onClick={onOpenTreeSubmissionModal} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                                        Identify Specimen
                                    </button>
                                    <div className="space-y-2">
                                        {treeSightings.map(t => (
                                            <div key={t.id} onClick={() => onFlyToLocation(t.lat, t.lon)} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/5 cursor-pointer group border border-transparent hover:border-white/5">
                                                <img src={t.imageUrl} className="w-12 h-12 object-cover rounded-xl bg-slate-800 shadow-inner" alt={t.common_name} />
                                                <div>
                                                    <p className="font-bold text-xs text-white italic group-hover:text-emerald-400 transition-colors">{t.common_name}</p>
                                                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{t.scientific_name}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'celestial' && (
                                <div className="space-y-5">
                                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                                        <h4 className="text-purple-300 text-[10px] font-black uppercase tracking-widest mb-2">Astrometry Active</h4>
                                        <p className="text-slate-400 text-[11px] leading-relaxed">Zoom out to unlock the Solar System. Use the wheel or pinch to explore deep space.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {planetsMetadata.map(p => (
                                            <button key={p.name} onClick={() => onSelectCelestialTarget({ type: 'planet', name: p.name })} className="p-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-white hover:bg-purple-600/20 transition-all border border-white/5 flex flex-col items-center gap-2">
                                                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: `#${p.color.toString(16).padStart(6, '0')}` }}></div>
                                                {p.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'timescape' && (
                                <div className="space-y-6">
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                                        <p className="text-[10px] font-black text-blue-300 uppercase mb-2 tracking-widest">Temporal Synchronisation</p>
                                        <p className="text-white font-mono text-xs">{new Date(Date.now() + timescape.offset).toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                                            <span>Normal Time</span>
                                            <span>Hyper-Speed</span>
                                        </div>
                                        <input type="range" min="1" max="1000" step="1" value={timescape.speed} onChange={e => onTimescapeChange({ ...timescape, speed: parseFloat(e.target.value) })} className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                    <button onClick={() => onTimescapeChange({ ...timescape, isPaused: !timescape.isPaused })} className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${timescape.isPaused ? 'bg-emerald-600 text-white shadow-emerald-900/40' : 'bg-slate-700 text-slate-300 shadow-lg'}`}>
                                        {timescape.isPaused ? 'Resume Universal Flux' : 'Pause Epoch'}
                                    </button>
                                </div>
                            )}

                            {activeTab === 'visuals' && (
                                <div className="space-y-8 py-2">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sun Exposure</label>
                                            <span className="text-[10px] font-mono text-blue-400">{sunIntensity.toFixed(1)} EV</span>
                                        </div>
                                        <input type="range" min="0.5" max="8" step="0.1" value={sunIntensity} onChange={e => onSunIntensityChange(parseFloat(e.target.value))} className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sidereal Drift</label>
                                            <span className="text-[10px] font-mono text-purple-400">{(starRotationSpeed*100).toFixed(0)}%</span>
                                        </div>
                                        <input type="range" min="0" max="0.5" step="0.01" value={starRotationSpeed} onChange={e => onStarRotationSpeedChange(parseFloat(e.target.value))} className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'favorites' && (
                                <div className="space-y-3">
                                    {!user && authReady && (
                                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-3">
                                            <p className="text-[11px] text-slate-300 leading-relaxed">Sign in with Google to save and sync your favorite stations across sessions.</p>
                                            <button onClick={signInWithGoogle} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                                Sign in with Google
                                            </button>
                                        </div>
                                    )}
                                    {favoriteStations.length > 0 ? favoriteStations.map(station => (
                                        <div key={station.stationuuid} className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl hover:bg-yellow-500/10 transition-all border border-transparent hover:border-yellow-500/20 group">
                                            <div onClick={() => onSelectAndPlayStation(station.stationuuid)} className="cursor-pointer truncate flex-1 pr-3">
                                                <p className="font-bold text-xs text-white italic truncate group-hover:text-yellow-400 transition-colors">{station.name}</p>
                                                <p className="text-[9px] text-slate-500 uppercase tracking-widest">{station.country}</p>
                                            </div>
                                            <button onClick={() => onToggleFavorite(station.stationuuid)} className="p-2 text-yellow-500 hover:scale-125 transition-transform">★</button>
                                        </div>
                                    )) : (
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

            <div className={`fixed bottom-5 left-5 right-5 pointer-events-none transition-all duration-700 ${isUiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="bg-black/60 backdrop-blur-2xl p-4 md:p-5 rounded-3xl inline-block border border-white/10 shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                        <div>
                            <p className="text-white font-black italic text-xs md:text-sm tracking-tight">Inventory: {totalSubmissions.toLocaleString()} specimens</p>
                            <p className="text-blue-400 text-[10px] uppercase font-black tracking-widest mt-0.5">{statusMessage}</p>
                        </div>
                    </div>
                </div>
            </div>

            <AboutModal isOpen={isAboutModalOpen} onClose={onCloseAboutModal} />
        </>
    );
};
