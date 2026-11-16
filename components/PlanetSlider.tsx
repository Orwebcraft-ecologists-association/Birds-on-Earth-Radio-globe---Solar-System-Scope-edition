
import React from 'react';
import { planetsMetadata } from './Globe';
import type { CelestialTarget } from '../types';

interface PlanetSliderProps {
    isVisible: boolean;
    onSelectTarget: (target: CelestialTarget) => void;
}

const PlanetSlider: React.FC<PlanetSliderProps> = ({ isVisible, onSelectTarget }) => {
    return (
        <div className={`absolute bottom-20 left-0 right-0 flex justify-center transition-all duration-700 ease-in-out z-40 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
            <div className="w-full max-w-6xl px-6 overflow-x-auto no-scrollbar py-4 flex gap-4 mask-fade-edges">
                {planetsMetadata.map((planet) => (
                    <div 
                        key={planet.name}
                        className="flex-shrink-0 w-72 bg-slate-950/92 border border-white/15 rounded-2xl p-5 shadow-2xl hover:border-white/25 transition-all group relative overflow-hidden"
                    >
                        {/* Decorative background glow */}
                        <div 
                            className="absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 transition-opacity group-hover:opacity-40" 
                            style={{ backgroundColor: `rgba(${(planet.color >> 16) & 255}, ${(planet.color >> 8) & 255}, ${planet.color & 255}, 1)` }}
                        ></div>

                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="text-xl font-bold text-white leading-tight">{planet.name}</h3>
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Planet</p>
                            </div>
                            <div 
                                className="w-10 h-10 rounded-full border border-white/20 shadow-inner flex items-center justify-center overflow-hidden"
                                style={{ background: `radial-gradient(circle at 30% 30%, #ffffff33, #000000aa)`, borderColor: `#${planet.color.toString(16).padStart(6, '0')}44` }}
                            >
                                <div 
                                    className="w-8 h-8 rounded-full blur-[1px]" 
                                    style={{ backgroundColor: `#${planet.color.toString(16).padStart(6, '0')}` }}
                                ></div>
                            </div>
                        </div>

                        <p className="text-sm text-slate-300 leading-relaxed mb-4 min-h-[4.5rem]">
                            {planet.info}
                        </p>

                        <button 
                            onClick={() => onSelectTarget({ type: 'planet', name: planet.name })}
                            className="w-full py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 border border-blue-500/30"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            Explore Body
                        </button>
                    </div>
                ))}
                
                {/* Special entry for Earth */}
                <div 
                    className="flex-shrink-0 w-72 bg-slate-950/92 border border-blue-400/35 rounded-2xl p-5 shadow-2xl hover:border-blue-400/50 transition-all group relative overflow-hidden"
                >
                    <div className="absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 bg-blue-400"></div>
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="text-xl font-bold text-white leading-tight">Earth</h3>
                            <p className="text-[10px] uppercase font-black tracking-widest text-blue-400">Home World</p>
                        </div>
                        <div className="w-10 h-10 rounded-full border border-blue-400/40 shadow-inner bg-blue-500 blur-[1px]"></div>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed mb-4 min-h-[4.5rem]">
                        The cradle of humanity and our base for listening to the world's radio and biodiversity.
                    </p>
                    <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('return-to-earth'))}
                        className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        Return Home
                    </button>
                </div>
            </div>
            
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .mask-fade-edges {
                    mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
                }
            `}</style>
        </div>
    );
};

export default PlanetSlider;
