
import React from 'react';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-slate-900/80 backdrop-blur-lg border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] p-8 m-4 text-slate-200 shadow-2xl shadow-blue-500/10 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Solar Scope Radio</h2>
                        <p className="text-xs text-blue-400 font-bold tracking-widest uppercase">Astronomical Astrometric Engine</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-3xl font-light leading-none text-slate-400 hover:text-white transition-colors"
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                </div>

                <p className="mb-6 leading-relaxed">
                    This interactive globe is a unique fusion of technology and nature, bringing together live radio broadcasts and real-time biodiversity observations from across the planet. It's an auditory and visual exploration of our world, showcasing the vibrant soundscapes and life forms shared by humans and wildlife.
                </p>

                <div className="space-y-6">
                    <div className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-xl">
                        <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-2">Core Inspiration</h3>
                        <p className="text-sm text-slate-300">
                            Visual systems and orbital mechanics are synced with the aesthetics of <strong>Solar Walk 2</strong> by <a href="https://vitotechnology.com/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-300 underline decoration-blue-500/50 underline-offset-4 font-bold transition-colors">Vito Technology</a>.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-white mb-2">Data Sources</h3>
                        <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm">
                            <li>
                                <strong>Live Bird Detections:</strong> Sourced from the <a href="https://birdnet.cornell.edu/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">BirdNET</a> project by The Cornell Lab of Ornithology.
                            </li>
                            <li>
                                <strong>iNaturalist Observations:</strong> Biodiversity data shared by the global community at <a href="https://www.inaturalist.org/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">iNaturalist</a>.
                            </li>
                             <li>
                                <strong>Tree Identification:</strong> User-submitted tree photos are identified using the <a href="https://ai.google.dev/gemini-api" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Gemini API</a>.
                            </li>
                            <li>
                                <strong>Celestial Exploration:</strong> Star and planet data linked to <a href="https://stellarium-web.org/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Stellarium Web</a>.
                            </li>
                            <li>
                                <strong>Global Radio Stations:</strong> Provided by the community-driven <a href="https://www.radio-browser.info/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">radio-browser.info</a> API.
                            </li>
                        </ul>
                    </div>
                     <div>
                        <h3 className="text-lg font-bold text-white mb-2">Technical Credits</h3>
                        <p className="text-slate-300 text-sm">
                           Developed to demonstrate the power of real-time environmental data streams. The source code is available on <a href="https://github.com/Orwebcraft-ecologists-association/Birds-on-Earth-Radio-globe" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">GitHub</a>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutModal;