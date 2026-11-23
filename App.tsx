
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Globe } from './components/Globe';
import { UI } from './components/UI';
import { ExplorePanel } from './components/ExplorePanel';
import TreeSubmissionModal from './components/TreeSubmissionModal';
import SubmissionModal from './components/SubmissionModal';
import { fetchStations, connectToBirdNET, getImageURL, startSimulation, stopSimulation, addSightingToCache, loadSightingsFromCache, startTreeSimulation, stopTreeSimulation, fetchINaturalistObservations } from './services/dataService';
import { allNamedStars } from './services/constellationData';
import { useFirebaseAuth } from './components/FirebaseProvider';
import {
    addFavoriteStationToFirestore,
    deleteVideoCreationMetadata,
    removeFavoriteStationFromFirestore,
    saveVideoCreationMetadata,
    submitStationToFirestore,
    submitTreeObservationToFirestore,
    subscribeSubmittedStations,
    subscribeTreeObservations,
    subscribeUserFavorites,
    subscribeUserVideoCreations
} from './services/firebaseDataService';
import type { RadioStation, BirdSighting, TreeSighting, PointData, InfoPanelData, Filters, RadioPointData, BirdPointData, TreePointData, WeatherPreset, ActiveTab, StationSubmission, CelestialPointData, CelestialTarget, INaturalistObservation, INaturalistPointData, TimescapeConfig, ChatMessage, ChatModelId, ChatRoleId, CameraViewPreset, VideoCreationRecord, VideoMode, VideoAspectRatio } from './types';

declare const Hls: any;

const MAX_SIDEBAR_ITEMS = 20;
const IMAGE_CACHE = new Map<string, string>();

const SPECTRAL_COLORS: { [key: string]: string } = {
    'O': '#9bb0ff',
    'B': '#aabfff',
    'A': '#cad7ff',
    'F': '#f8f7ff',
    'G': '#fff4ea',
    'K': '#ffd2a1',
    'M': '#ffcc6f',
    'Unknown': '#ffffff'
};

const CelestialDetailPanel: React.FC<{ 
    data: CelestialPointData; 
    onClose: () => void;
    onNextStar?: () => void;
    onPrevStar?: () => void;
}> = ({ data, onClose, onNextStar, onPrevStar }) => {
    const specColor = data.spectralType ? SPECTRAL_COLORS[data.spectralType[0]] || '#fff' : '#fff';
    const isStar = data.type === 'celestial-star';
    
    return (
        <div className="fixed top-24 left-5 w-[calc(100vw-2.5rem)] md:w-96 bg-slate-950/94 rounded-3xl border border-white/15 shadow-[0_0_80px_rgba(0,0,0,0.6)] z-[70] animate-fadeIn overflow-hidden">
            <div className="relative h-40 bg-gradient-to-br from-slate-800 to-black flex items-center justify-center border-b border-white/10">
                <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${specColor}44 0%, transparent 75%)` }}></div>
                <div className="w-20 h-20 rounded-full blur-[3px] shadow-[0_0_50px_rgba(255,255,255,0.4)] relative z-10" style={{ backgroundColor: specColor }}></div>
                
                {isStar && onPrevStar && (
                    <button onClick={onPrevStar} className="absolute left-6 p-3.5 bg-black/40 rounded-2xl hover:bg-black/70 transition-all text-white/60 hover:text-white border border-white/10 hover:scale-110 active:scale-95" title="Previous Star">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                )}
                
                {isStar && onNextStar && (
                    <button onClick={onNextStar} className="absolute right-16 p-3.5 bg-black/40 rounded-2xl hover:bg-black/70 transition-all text-white/60 hover:text-white border border-white/10 hover:scale-110 active:scale-95" title="Next Star">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                    </button>
                )}

                <button onClick={onClose} className="absolute top-6 right-6 p-2.5 bg-black/40 rounded-xl hover:bg-black/70 transition-colors text-white/50 hover:text-white z-20">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                </button>
            </div>
            <div className="p-8">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-3xl font-black text-white italic tracking-tight">{data.name}</h2>
                    <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-300 border border-white/10">
                        {data.type.replace('celestial-', '')}
                    </span>
                </div>
                {data.constellation && <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.25em] mb-6">Constellation: {data.constellation}</p>}
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 shadow-inner">
                        <p className="text-[9px] uppercase font-black text-slate-500 mb-1 tracking-widest">Magnitude</p>
                        <p className="text-xl font-mono font-bold text-white">{data.magnitude?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 shadow-inner">
                        <p className="text-[9px] uppercase font-black text-slate-500 mb-1 tracking-widest">Spectral</p>
                        <p className="text-xl font-mono font-bold" style={{ color: specColor }}>{data.spectralType || 'N/A'}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <p className="text-[10px] uppercase font-black text-slate-500 mb-3 tracking-widest">Astrometry Summary</p>
                        <p className="text-sm text-slate-300 leading-relaxed font-medium">
                            {data.info || `A massive stellar body in the ${data.constellation} region. Located at a distance of ${data.distance}, its ${data.spectralType} spectra indicates intense sidereal flux and high-energy radiation emission.`}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-6 border-t border-white/5">
                         <div className="flex justify-between items-center bg-white/2 p-2 rounded-lg">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Right Ascension</span>
                            <span className="text-xs font-mono text-slate-300">{data.ra?.toFixed(3) || '---'}h</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/2 p-2 rounded-lg">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Declination</span>
                            <span className="text-xs font-mono text-slate-300">{data.dec?.toFixed(3) || '---'}°</span>
                        </div>
                    </div>
                </div>

                <a 
                    href={`https://stellarium-web.org/skysource/${data.name.replace(/ /g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-8 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-[0_4px_30px_rgba(37,99,235,0.3)]"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Stellarium Registry
                </a>
            </div>
        </div>
    );
};

const HoverCard: React.FC<{
    data: RadioPointData | BirdPointData | INaturalistPointData | TreePointData | CelestialPointData,
    position: { x: number, y: number },
    currentStation: RadioStation | null,
    isPlaying: boolean,
    isAudioLoading: boolean,
    volume: number,
    onVolumeChange: (v: number) => void,
    onToggleStation: (s: RadioPointData) => void,
    isStationLocked: boolean,
    isFavorite: boolean,
    onToggleFavorite: (stationuuid: string) => void,
    isBroken: boolean,
}> = ({ data, position, currentStation, isPlaying, isAudioLoading, volume, onVolumeChange, onToggleStation, isStationLocked, isFavorite, onToggleFavorite, isBroken }) => {
    
    if (data.type === 'bird') {
        const d = data as BirdPointData;
        return (
            <div className="absolute z-10 w-64 bg-slate-950/95 rounded-3xl p-5 pointer-events-none transition-all duration-300 animate-fadeIn shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/15" style={{ left: position.x, top: position.y, transform: 'translate(-50%, calc(-100% - 35px))' }}>
                {d.imgUrl && <img src={d.imgUrl} alt={d.common} className="w-full h-36 object-cover rounded-2xl mb-4 bg-slate-900 shadow-inner" />}
                <h4 className="font-black text-white text-lg leading-tight italic">{d.common}</h4>
                <p className="text-xs text-blue-400 italic mb-3 font-bold tracking-tight">{d.scientific}</p>
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">BirdNET {(d.score * 100).toFixed(0)}%</span>
                    </div>
                    <span className="text-[9px] uppercase font-black tracking-wider text-blue-400">Click for Wikipedia</span>
                </div>
            </div>
        );
    }

    if (data.type === 'inaturalist' || data.type === 'tree') {
        const d = data as INaturalistPointData | TreePointData;
        return (
            <div className="absolute z-10 w-64 bg-slate-950/95 rounded-3xl p-5 pointer-events-none transition-all duration-300 animate-fadeIn shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/15" style={{ left: position.x, top: position.y, transform: 'translate(-50%, calc(-100% - 35px))' }}>
                <img src={d.imageUrl} alt={d.common} className="w-full h-36 object-cover rounded-2xl mb-4 bg-slate-900 shadow-inner" />
                <h4 className="font-black text-white text-lg leading-tight italic">{d.common}</h4>
                <p className="text-xs text-blue-400 italic mb-4 font-bold tracking-tight">{d.scientific}</p>
                <div className="flex items-center justify-between gap-2 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${data.type === 'inaturalist' ? 'bg-cyan-500' : 'bg-emerald-500'}`}></div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{data.type === 'inaturalist' ? 'iNaturalist' : 'Local Flora'}</span>
                    </div>
                    <span className="text-[9px] uppercase font-black tracking-wider text-blue-400">Click for Wikipedia</span>
                </div>
            </div>
        );
    }

    if (data.type === 'planet' || data.type === 'celestial-star' || data.type === 'sun' || data.type === 'moon') {
        const d = data as CelestialPointData;
        const spectralColor = d.spectralType ? SPECTRAL_COLORS[d.spectralType[0]] || '#fff' : '#fff';

        return (
            <div className="absolute z-10 w-72 bg-slate-950/95 rounded-3xl p-6 pointer-events-none transition-all duration-300 animate-fadeIn shadow-[0_0_60px_rgba(0,0,0,0.7)] border border-white/15" style={{ left: position.x, top: position.y, transform: 'translate(-50%, calc(-100% - 35px))' }}>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="font-black text-white text-2xl tracking-tighter italic">{d.name}</h4>
                    {d.type === 'celestial-star' ? (
                        <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ backgroundColor: spectralColor }}></div>
                    ) : (
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: d.color || '#fff' }}></div>
                    )}
                </div>
                {d.constellation && <p className="text-[9px] font-black uppercase text-blue-500 tracking-[0.25em] mb-4">Constellation: {d.constellation}</p>}
                
                {d.spectralType && (
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Spectral Class:</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/5 border border-white/10" style={{ color: spectralColor }}>{d.spectralType}</span>
                    </div>
                )}

                <p className="text-xs text-slate-400 leading-relaxed font-medium italic">{d.info || "A distant celestial body monitored by our astrometric arrays."}</p>
                
                <div className="flex items-center gap-2 pt-4 mt-4 border-t border-white/10">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: spectralColor }}></div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">
                        Astrometric Index Point
                    </span>
                </div>
            </div>
        );
    }

    if (data.type === 'radio') {
        const d = data as RadioPointData;
        const isThisStationPlaying = currentStation?.stationuuid === d.id;
        
        return (
            <div className="absolute z-10 w-64 bg-slate-950/95 rounded-3xl p-5 pointer-events-none transition-opacity duration-300 animate-fadeIn shadow-2xl border border-white/15" style={{ left: position.x, top: position.y, transform: 'translate(-50%, calc(-100% - 20px))' }}>
                <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 overflow-hidden">
                        <h4 className="font-black truncate text-white italic text-lg tracking-tight" title={d.title}>{d.title}</h4>
                        <p className="text-xs text-slate-500 truncate font-bold uppercase tracking-widest mt-1">{d.place}</p>
                    </div>
                    <button onClick={() => onToggleFavorite(d.id)} className="p-2 rounded-xl hover:bg-white/10 transition-colors pointer-events-auto flex-shrink-0">
                        <svg className={`w-5 h-5 ${isFavorite ? 'text-yellow-400' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    </button>
                </div>
                <div className="flex items-center gap-4 mt-6 pointer-events-auto border-t border-white/5 pt-4">
                    <button onClick={() => onToggleStation(d)} className="p-3.5 rounded-2xl bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white transition-all shadow-inner">
                        {isThisStationPlaying && isAudioLoading ? (<div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>) : isThisStationPlaying && isPlaying ? (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" /></svg>) : (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4l10 6-10 6V4z" /></svg>)}
                    </button>
                    <div className="flex-1">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{isThisStationPlaying && isPlaying ? 'Transmitting' : 'Idle'}</p>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

const App: React.FC = () => {
    const { user, authReady, signInWithGoogle } = useFirebaseAuth();
    const [baseStations, setBaseStations] = useState<RadioStation[]>([]);
    const [submittedStations, setSubmittedStations] = useState<RadioStation[]>([]);
    const allStations = useMemo(() => {
        const map = new Map<string, RadioStation>();
        baseStations.forEach(s => map.set(s.stationuuid, s));
        submittedStations.forEach(s => map.set(s.stationuuid, s));
        return Array.from(map.values());
    }, [baseStations, submittedStations]);

    const [birdSightings, setBirdSightings] = useState<BirdSighting[]>([]);
    const [simulatedTrees, setSimulatedTrees] = useState<TreeSighting[]>([]);
    const [firestoreTrees, setFirestoreTrees] = useState<TreeSighting[]>([]);
    const treeSightings = useMemo(() => [...firestoreTrees, ...simulatedTrees], [firestoreTrees, simulatedTrees]);

    const [inatObservations, setInatObservations] = useState<INaturalistObservation[]>([]);
    const [sidebarSightings, setSidebarSightings] = useState<BirdSighting[]>([]);
    const [hoverData, setHoverData] = useState<InfoPanelData | null>(null);
    const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
    const [pinnedData, setPinnedData] = useState<InfoPanelData | null>(null);
    const [totalSubmissions, setTotalSubmissions] = useState(0);
    const [latestSubmission, setLatestSubmission] = useState<BirdSighting | null>(null);
    const [statusMessage, setStatusMessage] = useState('Initializing Solar System Scope...');
    
    const [filters, setFilters] = useState<Filters>({ radio: { text: '', country: 'all', genre: 'all' }, bird: { name: '', select: 'all' } });
    const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [weatherPreset, setWeatherPreset] = useState<WeatherPreset>('Seasonal');
    const [sunIntensity, setSunIntensity] = useState(3.0);
    const [sunOrbitSpeed, setSunOrbitSpeed] = useState(0.06);
    const [starRotationSpeed, setStarRotationSpeed] = useState(0.02);
    const [isUiVisible, setIsUiVisible] = useState(true);
    const [isExplorePanelOpen, setIsExplorePanelOpen] = useState(false);
    const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lon: number } | null>(null);
    const [celestialFlyToTarget, setCelestialFlyToTarget] = useState<CelestialTarget | null>(null);
    const [brokenStationIds, setBrokenStationIds] = useState<Set<string>>(new Set());
    const audioRef = useRef<HTMLAudioElement>(null);
    const hlsRef = useRef<any>(null);
    const candidatesRef = useRef<string[]>([]);
    const candidateIdxRef = useRef<number>(0);
    const [playbackTrigger, setPlaybackTrigger] = useState(0);
    const [favoriteStations, setFavoriteStations] = useState<RadioStation[]>([]);

    const [isLocationPickerMode, setIsLocationPickerMode] = useState(false);
    const [newStationData, setNewStationData] = useState<StationSubmission>({ name: '', url_resolved: '', country: '', state: '', tags: '', geo_lat: null, geo_long: null });
    const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
    const [isTreeSubmissionModalOpen, setIsTreeSubmissionModalOpen] = useState(false);
    const [isTreeLocationPickerMode, setIsTreeLocationPickerMode] = useState(false);
    const [newTreeLocation, setNewTreeLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [isIdentifyingTree, setIsIdentifyingTree] = useState(false);

    const [timescape, setTimescape] = useState<TimescapeConfig>({ speed: 1, offset: 0, isPaused: false });

    const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);
    const [volume, setVolume] = useState(0.8);
    const [isStationLocked, setIsStationLocked] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>('detections');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatRole, setChatRole] = useState<ChatRoleId>('guide');
    const [chatModel, setChatModel] = useState<ChatModelId>('gemini-4-hydrogen');
    const [isChatStreaming, setIsChatStreaming] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);
    const [cameraViewPreset, setCameraViewPreset] = useState<CameraViewPreset>('earth');
    const [videoHistory, setVideoHistory] = useState<VideoCreationRecord[]>([]);
    const chatAbortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!authReady) return;
        const unsubStations = subscribeSubmittedStations(user?.uid || null, setSubmittedStations);
        const unsubTrees = subscribeTreeObservations(user?.uid || null, setFirestoreTrees);
        let unsubFavorites: (() => void) | null = null;
        let unsubVideos: (() => void) | null = null;
        if (user) {
            unsubFavorites = subscribeUserFavorites(user.uid, setFavoriteStations);
            unsubVideos = subscribeUserVideoCreations(user.uid, setVideoHistory);
        } else {
            setFavoriteStations([]);
            setVideoHistory([]);
        }
        return () => {
            unsubStations();
            unsubTrees();
            if (unsubFavorites) unsubFavorites();
            if (unsubVideos) unsubVideos();
        };
    }, [authReady, user]);

    const handleToggleFavorite = useCallback(async (stationuuid: string) => {
        let activeUser = user;
        if (!activeUser) {
            activeUser = await signInWithGoogle();
            if (!activeUser) return;
        }
        const isFavorite = favoriteStations.some(s => s.stationuuid === stationuuid);
        if (isFavorite) {
            await removeFavoriteStationFromFirestore(activeUser.uid, stationuuid);
        } else {
            const stationToAdd = allStations.find(s => s.stationuuid === stationuuid);
            if (stationToAdd) {
                await addFavoriteStationToFirestore(activeUser.uid, stationToAdd);
            }
        }
    }, [user, signInWithGoogle, favoriteStations, allStations]);

    const handleStationSubmit = useCallback(async (submission: StationSubmission) => {
        let activeUser = user;
        if (!activeUser) {
            activeUser = await signInWithGoogle();
            if (!activeUser) return;
        }
        await submitStationToFirestore(activeUser.uid, submission);
        setIsSubmissionModalOpen(false);
        setNewStationData({ name: '', url_resolved: '', country: '', state: '', tags: '', geo_lat: null, geo_long: null });
        setStatusMessage(`Submitted "${submission.name}" to Firestore`);
    }, [user, signInWithGoogle]);

    const handleTreeSubmit = useCallback(async () => {
        if (!newTreeLocation) return;
        let activeUser = user;
        if (!activeUser) {
            activeUser = await signInWithGoogle();
            if (!activeUser) return;
        }
        setIsIdentifyingTree(true);
        try {
            const imgUrl = await getImageURL('Quercus', IMAGE_CACHE);
            await submitTreeObservationToFirestore(activeUser.uid, {
                common_name: 'Observed Tree Specimen',
                scientific_name: 'Plantae',
                imageUrl: imgUrl,
                lat: newTreeLocation.lat,
                lon: newTreeLocation.lon,
            });
            setIsTreeSubmissionModalOpen(false);
            setNewTreeLocation(null);
            setStatusMessage('Tree observation saved to Firestore');
        } finally {
            setIsIdentifyingTree(false);
        }
    }, [newTreeLocation, user, signInWithGoogle]);

    const handleSelectCelestialTarget = useCallback((t: CelestialTarget) => {
        setCelestialFlyToTarget(t);
        if (t.type === 'star') {
            const s = allNamedStars.find(x => x.name === t.name);
            if (s) setPinnedData({ type: 'celestial-star', ...s, magnitude: s.mag } as CelestialPointData);
        } else if (t.type === 'planet') {
             setPinnedData({ type: 'planet', name: t.name } as CelestialPointData);
        }
    }, []);

    const handleNextStar = useCallback(() => {
        if (!pinnedData || pinnedData.type !== 'celestial-star') return;
        const currentIndex = allNamedStars.findIndex(s => s.name === pinnedData.name);
        const nextIndex = (currentIndex + 1) % allNamedStars.length;
        const nextStar = allNamedStars[nextIndex];
        handleSelectCelestialTarget({ type: 'star', name: nextStar.name! });
    }, [pinnedData, handleSelectCelestialTarget]);

    const handlePrevStar = useCallback(() => {
        if (!pinnedData || pinnedData.type !== 'celestial-star') return;
        const currentIndex = allNamedStars.findIndex(s => s.name === pinnedData.name);
        const prevIndex = (currentIndex - 1 + allNamedStars.length) % allNamedStars.length;
        const prevStar = allNamedStars[prevIndex];
        handleSelectCelestialTarget({ type: 'star', name: prevStar.name! });
    }, [pinnedData, handleSelectCelestialTarget]);

    const uniqueBirdSpecies = useMemo(() => {
        const speciesMap = new Map<string, string>();
        birdSightings.forEach(s => { if (!speciesMap.has(s.scientific_name)) speciesMap.set(s.scientific_name, s.common_name); });
        return Array.from(speciesMap.entries()).map(([scientific, common]) => ({ scientific, common })).sort((a, b) => a.common.localeCompare(b.common));
    }, [birdSightings]);

    const filteredRadioStationsForSearch = useMemo(() => {
        const { text } = filters.radio;
        const textLower = text.trim().toLowerCase();
        if (!textLower) return allStations;
        return allStations.filter(station =>
            station.name.toLowerCase().includes(textLower) ||
            station.country.toLowerCase().includes(textLower) ||
            (station.state && station.state.toLowerCase().includes(textLower)) ||
            (station.tags && station.tags.toLowerCase().includes(textLower))
        );
    }, [allStations, filters.radio]);

    const handleNewSighting = useCallback(async (sighting: BirdSighting) => {
        sighting.id = Date.now() + Math.random();
        sighting.createdAt = Date.now();
        sighting.imgUrl = await getImageURL(sighting.scientific_name, IMAGE_CACHE);
        setBirdSightings(prev => [...prev, sighting]);
        setSidebarSightings(prev => [sighting, ...prev.slice(0, MAX_SIDEBAR_ITEMS - 1)]);
        setTotalSubmissions(prev => prev + 1);
        setLatestSubmission(sighting);
    }, []);

    const handleNewTreeSighting = useCallback(async (sighting: Omit<TreeSighting, 'id' | 'createdAt' | 'imageUrl'>) => {
        const img = await getImageURL(sighting.scientific_name, IMAGE_CACHE);
        const newSighting: TreeSighting = { ...sighting, id: Date.now(), createdAt: Date.now(), imageUrl: img };
        setSimulatedTrees(prev => [newSighting, ...prev]);
    }, []);

    useEffect(() => {
        fetchStations().then(setBaseStations).catch(console.error);
        fetchINaturalistObservations().then(setInatObservations).catch(console.error);
        
        const inatTimer = setInterval(() => { 
            fetchINaturalistObservations().then(setInatObservations); 
        }, 180000); 

        const cleanupBird = connectToBirdNET(handleNewSighting, () => setStatusMessage('BirdNET Live Stream Active'), () => setStatusMessage('Reconnecting to BirdNET...'));
        startSimulation(handleNewSighting);
        startTreeSimulation(handleNewTreeSighting);
        
        const handleReturn = () => {
            setCelestialFlyToTarget(null);
            setFlyToTarget({ lat: 0, lon: 0 });
            setPinnedData(null);
        };
        const handleCelestialGesture = () => {
            setActiveTab('celestial');
            setFlyToTarget({ lat: 0, lon: 0 });
            setCelestialFlyToTarget(null);
        };
        window.addEventListener('return-to-earth', handleReturn);
        window.addEventListener('trigger-celestial-tab', handleCelestialGesture);
        
        return () => { 
            cleanupBird(); 
            stopSimulation(); 
            stopTreeSimulation(); 
            clearInterval(inatTimer); 
            window.removeEventListener('return-to-earth', handleReturn);
            window.removeEventListener('trigger-celestial-tab', handleCelestialGesture);
        };
    }, [handleNewSighting, handleNewTreeSighting]);

    const getPlayableCandidates = useCallback((station: RadioStation): string[] => {
        const rawUrls = [station.url_resolved, ...(station.fallback_urls || [])].filter(Boolean);
        const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const result: string[] = [];
        const addUnique = (u: string) => {
            if (u && !result.includes(u)) result.push(u);
        };

        for (const raw of rawUrls) {
            const trimmed = raw.trim();
            if (isHttpsPage && trimmed.startsWith('http://')) {
                addUnique('https://' + trimmed.slice('http://'.length));
            }
            addUnique(trimmed);
        }
        return result;
    }, []);

    const loadStreamCandidate = useCallback((url: string, stationId: string) => {
        const audio = audioRef.current;
        if (!audio) return;

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        const isHls = /\.m3u8(\?|$)/i.test(url) || url.toLowerCase().includes('/playlist.m3u8');

        if (isHls && typeof Hls !== 'undefined' && Hls.isSupported()) {
            audio.removeAttribute('src');
            const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
            hlsRef.current = hls;
            hls.loadSource(url);
            hls.attachMedia(audio);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                audio.volume = volume;
                audio.play().catch(() => {
                    // Wait for user interaction or fallback via error handler if needed
                });
            });
            hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
                if (data?.fatal) {
                    hls.destroy();
                    if (hlsRef.current === hls) hlsRef.current = null;
                    const nextIdx = candidateIdxRef.current + 1;
                    if (nextIdx < candidatesRef.current.length) {
                        candidateIdxRef.current = nextIdx;
                        loadStreamCandidate(candidatesRef.current[nextIdx], stationId);
                    } else {
                        setBrokenStationIds(prev => new Set(prev).add(stationId));
                        setAudioError('Stream unavailable');
                        setIsPlaying(false);
                        setIsAudioLoading(false);
                    }
                }
            });
        } else {
            audio.src = url;
            audio.volume = volume;
            audio.load();
            audio.play().catch((err) => {
                // Ignore AbortError caused by rapid station switching
                if (err?.name === 'AbortError') return;
            });
        }
    }, [volume]);

    const handleAudioError = useCallback(() => {
        if (!currentStation) return;
        const nextIdx = candidateIdxRef.current + 1;
        if (nextIdx < candidatesRef.current.length) {
            candidateIdxRef.current = nextIdx;
            loadStreamCandidate(candidatesRef.current[nextIdx], currentStation.stationuuid);
            return;
        }
        setBrokenStationIds(prev => new Set(prev).add(currentStation.stationuuid));
        setAudioError('Stream unavailable');
        setIsPlaying(false);
        setIsAudioLoading(false);
    }, [currentStation, loadStreamCandidate]);

    const handlePlayPause = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            if (audioError && currentStation) {
                setIsAudioLoading(true);
                setAudioError(null);
                setPlaybackTrigger(t => t + 1);
            } else {
                audio.play().catch(handleAudioError);
            }
        } else {
            audio.pause();
        }
    }, [audioError, currentStation, handleAudioError]);
    
    const handleStationClick = useCallback((stationData: RadioPointData) => {
        const station = allStations.find(s => s.stationuuid === stationData.id);
        if (!station) return;

        const pointData: RadioPointData = {
            id: station.stationuuid,
            lat: station.geo_lat,
            lon: station.geo_long,
            type: 'radio',
            title: station.name,
            place: station.state ? `${station.state}, ${station.country}` : station.country,
            url: station.url_resolved,
            country: station.country,
            state: station.state,
            tags: station.tags
        };
        setPinnedData(pointData);

        if (currentStation?.stationuuid === station.stationuuid && !audioError) {
            handlePlayPause();
            return;
        }

        setBrokenStationIds(prev => {
            if (!prev.has(station.stationuuid)) return prev;
            const next = new Set(prev);
            next.delete(station.stationuuid);
            return next;
        });
        setCurrentStation(station);
        setIsAudioLoading(true);
        setAudioError(null);
        setPlaybackTrigger(t => t + 1);
    }, [allStations, currentStation, audioError, handlePlayPause]);

    useEffect(() => {
        if (currentStation && audioRef.current) {
            const candidates = getPlayableCandidates(currentStation);
            candidatesRef.current = candidates;
            candidateIdxRef.current = 0;
            if (candidates.length > 0) {
                loadStreamCandidate(candidates[0], currentStation.stationuuid);
            } else {
                setBrokenStationIds(prev => new Set(prev).add(currentStation.stationuuid));
                setAudioError('Stream unavailable');
                setIsPlaying(false);
                setIsAudioLoading(false);
            }
        }
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [currentStation, playbackTrigger, getPlayableCandidates, loadStreamCandidate]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const buildChatContext = useCallback(() => {
        const parts: string[] = [];
        parts.push(`Active view tab: ${activeTab}`);
        if (currentStation) {
            parts.push(`Currently tuned radio station: ${currentStation.name} (${currentStation.state ? `${currentStation.state}, ` : ''}${currentStation.country}, tags: ${currentStation.tags || 'general'}, ${isPlaying ? 'playing' : 'paused'})`);
        }
        if (pinnedData) {
            if (pinnedData.type === 'bird') {
                parts.push(`Selected bird detection: ${pinnedData.common} (${pinnedData.scientific}), confidence ${(pinnedData.score * 100).toFixed(0)}%`);
            } else if (pinnedData.type === 'tree' || pinnedData.type === 'inaturalist') {
                parts.push(`Selected flora/species observation: ${pinnedData.common} (${pinnedData.scientific})`);
            } else if (pinnedData.type === 'celestial-star' || pinnedData.type === 'planet' || pinnedData.type === 'sun' || pinnedData.type === 'moon') {
                parts.push(`Selected celestial body: ${pinnedData.name}${pinnedData.constellation ? ` in ${pinnedData.constellation}` : ''}${pinnedData.spectralType ? `, spectral ${pinnedData.spectralType}` : ''}`);
            }
        }
        return parts.join('\n');
    }, [activeTab, currentStation, isPlaying, pinnedData]);

    const handleSendChatMessage = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isChatStreaming) return;

        setChatError(null);
        const now = Date.now();
        const userMsg: ChatMessage = { id: `u-${now}`, role: 'user', text: trimmed, timestamp: now };
        const assistantId = `m-${now + 1}`;
        const assistantMsg: ChatMessage = { id: assistantId, role: 'model', text: '', timestamp: now + 1 };

        const historySnapshot = chatMessages
            .filter(m => !m.isError && m.text.trim().length > 0)
            .map(m => ({ role: m.role, text: m.text }));

        setChatMessages(prev => [...prev, userMsg, assistantMsg]);
        setIsChatStreaming(true);

        const controller = new AbortController();
        chatAbortRef.current = controller;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    message: trimmed,
                    history: historySnapshot,
                    role: chatRole,
                    model: chatModel,
                    context: buildChatContext(),
                }),
            });

            if (!response.ok || !response.body) {
                let errMsg = `Request failed (${response.status})`;
                try {
                    const errJson = await response.json();
                    if (errJson?.error) errMsg = errJson.error;
                } catch {
                    // keep fallback error message
                }
                throw new Error(errMsg);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let accumulated = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const events = buffer.split('\n\n');
                buffer = events.pop() || '';

                for (const event of events) {
                    const lines = event.split('\n');
                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const payloadStr = line.slice(6).trim();
                        if (!payloadStr) continue;
                        let parsed: { text?: string; error?: string; done?: boolean } | null = null;
                        try {
                            parsed = JSON.parse(payloadStr);
                        } catch {
                            continue;
                        }
                        if (parsed?.error) {
                            throw new Error(parsed.error);
                        }
                        if (parsed?.text) {
                            accumulated += parsed.text;
                            setChatMessages(prev =>
                                prev.map(m => (m.id === assistantId ? { ...m, text: accumulated } : m))
                            );
                        }
                    }
                }
            }

            if (!accumulated.trim()) {
                setChatMessages(prev =>
                    prev.map(m =>
                        m.id === assistantId
                            ? { ...m, text: 'No response was returned. Please try again.', isError: true }
                            : m
                    )
                );
            }
        } catch (err) {
            if ((err as Error)?.name === 'AbortError') return;
            const message = err instanceof Error ? err.message : 'Unable to reach Gemini right now.';
            setChatError(message);
            setChatMessages(prev =>
                prev.map(m => (m.id === assistantId && !m.text ? { ...m, text: message, isError: true } : m))
            );
        } finally {
            setIsChatStreaming(false);
            if (chatAbortRef.current === controller) {
                chatAbortRef.current = null;
            }
        }
    }, [isChatStreaming, chatMessages, chatRole, chatModel, buildChatContext]);

    const handleClearChat = useCallback(() => {
        if (chatAbortRef.current) {
            chatAbortRef.current.abort();
            chatAbortRef.current = null;
        }
        setChatMessages([]);
        setChatError(null);
        setIsChatStreaming(false);
    }, []);

    const handleVideoGenerated = useCallback(async (record: { mode: VideoMode; prompt: string; aspectRatio: VideoAspectRatio }) => {
        if (user?.uid) {
            await saveVideoCreationMetadata(user.uid, record);
        }
    }, [user]);

    const handleDeleteVideoHistoryItem = useCallback((creationId: string) => {
        if (user?.uid) {
            void deleteVideoCreationMetadata(user.uid, creationId);
        }
    }, [user]);

    return (
        <div className="relative w-full h-full text-white antialiased bg-black overflow-hidden font-sans">
            <audio
                ref={audioRef}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onPlaying={() => { setIsAudioLoading(false); setAudioError(null); }}
                onWaiting={() => setIsAudioLoading(true)}
                onError={handleAudioError}
            />
            <Globe
                radioPoints={allStations.map(s => ({ id: s.stationuuid, lat: s.geo_lat, lon: s.geo_long, type: 'radio', title: s.name, place: s.state || s.country, url: s.url_resolved, country: s.country, state: s.state, tags: s.tags } as RadioPointData))}
                birdPoints={birdSightings.map(s => ({ id: s.id, lat: s.lat, lon: s.lon, type: 'bird', common: s.common_name, scientific: s.scientific_name, score: s.confidence, createdAt: s.createdAt, imgUrl: s.imgUrl } as BirdPointData))}
                treePoints={treeSightings.map(s => ({ id: s.id, lat: s.lat, lon: s.lon, type: 'tree', common: s.common_name, scientific: s.scientific_name, imageUrl: s.imageUrl, createdAt: s.createdAt } as TreePointData))}
                inatPoints={inatObservations.map(obs => ({ id: obs.id, lat: obs.lat, lon: obs.lon, type: 'inaturalist', common: obs.common_name, scientific: obs.scientific_name, imageUrl: obs.imageUrl, user: obs.user } as INaturalistPointData))}
                userLocationPoint={userLocation ? { id: 'user-location', lat: userLocation.lat, lon: userLocation.lon, type: 'user' } : null}
                onHover={(d, p) => { setHoverData(d); setHoverPosition(p || null); }}
                onExpiredBirdIds={(ids) => setBirdSightings(prev => prev.filter(s => !ids.includes(s.id)))}
                onStationClick={(d) => { setPinnedData(d); handleStationClick(d); }}
                onPointClick={(d) => { setPinnedData(d); }}
                currentStation={currentStation}
                isSoundscapeMode={false}
                weatherPreset={weatherPreset}
                sunIntensity={sunIntensity}
                sunOrbitSpeed={sunOrbitSpeed}
                starRotationSpeed={starRotationSpeed}
                flyToTarget={flyToTarget}
                celestialFlyToTarget={celestialFlyToTarget}
                cameraViewPreset={cameraViewPreset}
                brokenStationIds={brokenStationIds}
                onGlobeBackgroundClick={() => setIsUiVisible(v => !v)}
                isLocationPickerMode={isLocationPickerMode}
                onLocationPick={l => { setNewStationData(prev => ({ ...prev, geo_lat: l.lat, geo_long: l.lon })); setIsLocationPickerMode(false); setIsSubmissionModalOpen(true); }}
                isTreeLocationPickerMode={isTreeLocationPickerMode}
                onTreeLocationPick={l => { setNewTreeLocation(l); setIsTreeLocationPickerMode(false); setIsTreeSubmissionModalOpen(true); }}
                timescape={timescape}
            />
            {(isLocationPickerMode || isTreeLocationPickerMode) && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-blue-600/95 text-white px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl border border-white/20 flex items-center gap-3">
                    <span>Click on Earth to pick coordinates</span>
                    <button
                        onClick={() => {
                            if (isLocationPickerMode) { setIsLocationPickerMode(false); setIsSubmissionModalOpen(true); }
                            if (isTreeLocationPickerMode) { setIsTreeLocationPickerMode(false); setIsTreeSubmissionModalOpen(true); }
                        }}
                        className="px-2 py-0.5 bg-black/30 rounded-full hover:bg-black/50"
                    >
                        Cancel
                    </button>
                </div>
            )}
            <UI
                statusMessage={statusMessage} totalSubmissions={totalSubmissions} latestSubmission={latestSubmission} sidebarSightings={sidebarSightings} treeSightings={treeSightings} inatObservations={inatObservations} pinnedData={pinnedData} onCloseInfoPanel={() => setPinnedData(null)} filters={filters} uniqueBirdSpecies={uniqueBirdSpecies} uniqueRadioStations={allStations} filteredRadioStationsForSearch={filteredRadioStationsForSearch} uniqueCountries={[]} uniqueGenres={[]} liveBirdCount={birdSightings.length} onShowLocation={() => {}} userLocation={userLocation} onAttractBirds={() => {}} isAttracting={false} currentStation={currentStation} isPlaying={isPlaying} isAudioLoading={isAudioLoading} volume={volume} onPlayPause={handlePlayPause} onVolumeChange={(v) => { setVolume(v); if(audioRef.current) audioRef.current.volume = v; }} audioError={audioError} audioContextRef={{current: null}} audioAnalyserRef={{current: null}} isStationLocked={isStationLocked} onToggleLock={() => setIsStationLocked(!isStationLocked)} isAboutModalOpen={isAboutModalOpen} onOpenAboutModal={() => setIsAboutModalOpen(true)} onCloseAboutModal={() => setIsAboutModalOpen(false)} isSoundscapeMode={false} onToggleSoundscapeMode={() => {}} weatherPreset={weatherPreset} onWeatherPresetChange={setWeatherPreset} sunIntensity={sunIntensity} onSunIntensityChange={setSunIntensity} sunOrbitSpeed={sunOrbitSpeed} onSunOrbitSpeedChange={setSunOrbitSpeed} starRotationSpeed={starRotationSpeed} onStarRotationSpeedChange={setStarRotationSpeed} isUiVisible={isUiVisible} onToggleUIVisibility={() => setIsUiVisible(v => !v)} onToggleExplorePanel={() => setIsExplorePanelOpen(!isExplorePanelOpen)} queue={[]} onRemoveFromQueue={() => {}} onSelectAndPlayStation={(id) => { const s = allStations.find(st => st.stationuuid === id); if (s) { handleStationClick({ id: s.stationuuid, lat: s.geo_lat, lon: s.geo_long, type: 'radio', title: s.name, place: s.state || s.country, url: s.url_resolved, country: s.country, state: s.state, tags: s.tags }); setFlyToTarget({ lat: s.geo_lat, lon: s.geo_long }); } }} onSelectAndFindBird={(n) => {}} onFlyToLocation={(lat, lon) => setFlyToTarget({lat, lon})} onSelectCelestialTarget={handleSelectCelestialTarget} favoriteStations={favoriteStations} onToggleFavorite={handleToggleFavorite} onRadioTextChange={t => setFilters(f => ({ ...f, radio: { ...f.radio, text: t } }))} onRadioCountryChange={() => {}} onRadioGenreChange={() => {}} onBirdNameChange={() => {}} onBirdSelect={() => {}} activeTab={activeTab} onActiveTabChange={setActiveTab} brokenStationIds={brokenStationIds} onOpenSubmissionModal={() => setIsSubmissionModalOpen(true)} isSubmissionModalOpen={isSubmissionModalOpen} onCloseSubmissionModal={() => setIsSubmissionModalOpen(false)} onStationSubmit={() => {}} newStationData={newStationData} setNewStationData={setNewStationData} onSetPickerMode={() => { setIsSubmissionModalOpen(false); setIsLocationPickerMode(true); }} onOpenTreeSubmissionModal={() => setIsTreeSubmissionModalOpen(true)} timescape={timescape} onTimescapeChange={setTimescape}
                chatMessages={chatMessages} chatRole={chatRole} chatModel={chatModel} isChatStreaming={isChatStreaming} chatError={chatError} viewerContext={buildChatContext()} onChatRoleChange={setChatRole} onChatModelChange={setChatModel} onSendChatMessage={handleSendChatMessage} onClearChat={handleClearChat} onDismissChatError={() => setChatError(null)}
                cameraViewPreset={cameraViewPreset} onCameraViewPresetChange={setCameraViewPreset} videoHistory={videoHistory} onVideoGenerated={handleVideoGenerated} onDeleteVideoHistoryItem={handleDeleteVideoHistoryItem} onSelectSpeciesPoint={(pt) => setPinnedData(pt)}
            />
            <TreeSubmissionModal isOpen={isTreeSubmissionModalOpen && !isTreeLocationPickerMode} onClose={() => setIsTreeSubmissionModalOpen(false)} onSubmit={handleTreeSubmit} onSetPickerMode={() => { setIsTreeSubmissionModalOpen(false); setIsTreeLocationPickerMode(true); }} isIdentifying={isIdentifyingTree} location={newTreeLocation} />
            <SubmissionModal isOpen={isSubmissionModalOpen && !isLocationPickerMode} onClose={() => setIsSubmissionModalOpen(false)} onSubmit={handleStationSubmit} newStationData={newStationData} setNewStationData={setNewStationData} onSetPickerMode={() => { setIsSubmissionModalOpen(false); setIsLocationPickerMode(true); }} />
            
            {pinnedData && (pinnedData.type === 'celestial-star' || pinnedData.type === 'planet' || pinnedData.type === 'sun' || pinnedData.type === 'moon') && (
                <CelestialDetailPanel 
                    data={pinnedData as CelestialPointData} 
                    onClose={() => setPinnedData(null)} 
                    onNextStar={handleNextStar}
                    onPrevStar={handlePrevStar}
                />
            )}

            {hoverData && hoverPosition && (hoverData.type === 'radio' || hoverData.type === 'bird' || hoverData.type === 'inaturalist' || hoverData.type === 'tree' || hoverData.type === 'planet' || hoverData.type === 'celestial-star' || hoverData.type === 'sun' || hoverData.type === 'moon') && (
                <HoverCard data={hoverData as any} position={hoverPosition} currentStation={currentStation} isPlaying={isPlaying} isAudioLoading={isAudioLoading} volume={volume} onVolumeChange={(v) => { setVolume(v); if(audioRef.current) audioRef.current.volume = v; }} onToggleStation={handleStationClick} isStationLocked={isStationLocked} isFavorite={hoverData.type === 'radio' ? favoriteStations.some(s => s.stationuuid === hoverData.id) : false} onToggleFavorite={handleToggleFavorite} isBroken={hoverData.type === 'radio' && brokenStationIds.has(hoverData.id as string)} />
            )}
        </div>
    );
};

export default App;
