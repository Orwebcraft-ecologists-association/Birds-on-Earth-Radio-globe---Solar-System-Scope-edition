
import React from 'react';
import type { RadioStation, BirdSighting } from '../types';

interface ExplorePanelProps {
    isOpen: boolean;
    onClose: () => void;
    recommendedStations: RadioStation[];
    recentSightings: BirdSighting[];
    onSelectStation: (stationuuid: string) => void;
    onSelectBird: (scientificName: string) => void;
}

export const ExplorePanel: React.FC<ExplorePanelProps> = ({ isOpen, onClose, recommendedStations, recentSightings, onSelectStation, onSelectBird }) => {
    return (
        <div className={`fixed inset-0 z-40 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            ></div>
            
            {/* Panel */}
            <div
                className={`absolute top-0 right-0 h-full w-full max-w-sm bg-slate-900/80 backdrop-blur-lg border-l border-slate-700 shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="explore-panel-title"
            >
                <div className="h-full overflow-y-auto p-6 text-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 id="explore-panel-title" className="text-xl font-bold text-white">Explore Guide</h2>
                        <button onClick={onClose} className="text-3xl font-light leading-none text-slate-400 hover:text-white transition-colors" aria-label="Close guide">
                            &times;
                        </button>
                    </div>

                    <div className="space-y-8">
                        <section>
                            <h3 className="font-bold text-slate-300 mb-3 tracking-wider uppercase text-sm">How to Navigate</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-3">
                                    <span className="text-blue-400 mt-1">&rarr;</span>
                                    <span>**Drag** with one finger or your mouse to rotate the globe.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-blue-400 mt-1">&rarr;</span>
                                    <span>**Pinch** with two fingers or use your scroll wheel to zoom.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-blue-400 mt-1">&rarr;</span>
                                    <span>**Tap** a point to select a station or view bird details.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-blue-400 mt-1">&rarr;</span>
                                    <span>**Tap** the empty globe background to hide or show the main controls.</span>
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="font-bold text-slate-300 mb-3 tracking-wider uppercase text-sm">Recommended Stations</h3>
                            <div className="space-y-2">
                                {recommendedStations.map(station => (
                                    <button
                                        key={station.stationuuid}
                                        onClick={() => onSelectStation(station.stationuuid)}
                                        className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-300"><path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" /><path d="M5.5 8.5a.5.5 0 0 1 .5.5v1.5a.5.5 0 0 1-1 0V9a.5.5 0 0 1 .5-.5Z" /><path d="M14.5 8.5a.5.5 0 0 1 .5.5v1.5a.5.5 0 0 1-1 0V9a.5.5 0 0 1 .5-.5Z" /><path d="M2 10a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-1.5 0V10.75A.75.75 0 0 1 2 10Z" /><path d="M18 10a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-1.5 0V10.75A.75.75 0 0 1 18 10Z" /><path d="M4.993 12.495a.75.75 0 0 1 .53 1.28l-.002.002a2.5 2.5 0 1 0 3.957 2.454.75.75 0 0 1 .638-1.32 4 4 0 1 1-6.38-3.96.75.75 0 0 1 1.257.544Z" /><path d="M15.007 12.495a.75.75 0 0 1 1.257-.544 4 4 0 1 1-6.38 3.96.75.75 0 0 1 .638 1.32A2.5 2.5 0 1 0 14.475 13.78l-.002-.002a.75.75 0 0 1 .534-1.28Z" /></svg>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-bold truncate" title={station.name}>{station.name}</p>
                                            <p className="text-xs text-slate-400 truncate" title={station.country}>{station.country || 'Unknown'}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h3 className="font-bold text-slate-300 mb-3 tracking-wider uppercase text-sm">Recent Detections</h3>
                            <div className="space-y-2">
                                {recentSightings.length > 0 ? recentSightings.map(sighting => (
                                    <button
                                        key={sighting.id}
                                        onClick={() => onSelectBird(sighting.scientific_name)}
                                        className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
                                    >
                                        <img src={sighting.imgUrl} alt={sighting.common_name} className="w-12 h-12 object-cover rounded-md flex-shrink-0 bg-slate-700" />
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-bold truncate" title={sighting.common_name}>{sighting.common_name}</p>
                                            <p className="text-xs text-slate-400 italic truncate" title={sighting.scientific_name}>{sighting.scientific_name}</p>
                                        </div>
                                    </button>
                                )) : (
                                     <p className="text-slate-400 text-center py-4 text-sm">No recent detections to display.</p>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};
