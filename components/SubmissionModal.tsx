import React, { useState, useEffect } from 'react';
import type { MapsGroundingLink, StationSubmission } from '../types';

interface SubmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: StationSubmission) => void;
    newStationData: StationSubmission;
    setNewStationData: React.Dispatch<React.SetStateAction<StationSubmission>>;
    onSetPickerMode: () => void;
}

const SubmissionModal: React.FC<SubmissionModalProps> = ({ isOpen, onClose, onSubmit, newStationData, setNewStationData, onSetPickerMode }) => {
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isMapsLocating, setIsMapsLocating] = useState(false);
    const [mapsFeedback, setMapsFeedback] = useState<{ text: string; links: MapsGroundingLink[]; error?: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewStationData(prev => ({ ...prev, [name]: value }));
    };

    const handleLocateViaMaps = async () => {
        const country = newStationData.country.trim();
        const name = newStationData.name.trim();
        const state = newStationData.state.trim();
        if (!country && !name) {
            setMapsFeedback({ text: '', links: [], error: 'Enter a station name or country first.' });
            return;
        }
        setIsMapsLocating(true);
        setMapsFeedback(null);
        try {
            const res = await fetch('/api/maps/locate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stationName: name, country, state }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Could not locate station via Google Maps.');
            if (typeof data.lat === 'number' && typeof data.lon === 'number') {
                setNewStationData(prev => ({ ...prev, geo_lat: data.lat, geo_long: data.lon }));
                setErrors(prev => {
                    const next = { ...prev };
                    delete next.location;
                    return next;
                });
            }
            setMapsFeedback({
                text: data.text || '',
                links: Array.isArray(data.mapsLinks) ? data.mapsLinks : [],
            });
        } catch (err) {
            setMapsFeedback({
                text: '',
                links: [],
                error: err instanceof Error ? err.message : 'Unable to reach Google Maps Grounding.',
            });
        } finally {
            setIsMapsLocating(false);
        }
    };

    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        const name = newStationData.name.trim();
        const url = newStationData.url_resolved.trim();
        const country = newStationData.country.trim();
        const state = newStationData.state.trim();
        const tags = newStationData.tags.trim();

        if (!name) newErrors.name = 'Station name is required.';
        else if (name.length > 120) newErrors.name = 'Station name must be 120 characters or fewer.';

        if (!url) {
            newErrors.url_resolved = 'Stream URL is required.';
        } else if (url.length > 500 || !/^https?:\/\/.+/.test(url)) {
            newErrors.url_resolved = 'Please enter a valid http(s) URL (max 500 characters).';
        } else {
            try {
                new URL(url);
            } catch (_) {
                newErrors.url_resolved = 'Please enter a valid URL.';
            }
        }

        if (!country) newErrors.country = 'Country is required.';
        else if (country.length > 100) newErrors.country = 'Country must be 100 characters or fewer.';
        if (state.length > 100) newErrors.state = 'State must be 100 characters or fewer.';
        if (tags.length > 200) newErrors.tags = 'Genres must be 200 characters or fewer.';

        if (newStationData.geo_lat === null || newStationData.geo_long === null) {
            newErrors.location = 'Please pick a location on the globe or use Google Maps locate.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(newStationData);
        }
    };
    
    useEffect(() => {
        if (isOpen) {
            setErrors({});
            setMapsFeedback(null);
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 animate-fadeIn"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-slate-950/96 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] p-8 m-4 text-slate-200 shadow-2xl shadow-blue-500/10 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-white mb-4">Submit a Radio Station</h2>
                    <button 
                        onClick={onClose} 
                        className="text-3xl font-light leading-none text-slate-400 hover:text-white transition-colors"
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                </div>
                <p className="mb-6 text-sm text-slate-400">
                    Found a station we're missing? Fill out the details below. All submissions are reviewed before being added to the map.
                </p>
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-300">Station Name*</label>
                        <input type="text" name="name" id="name" value={newStationData.name} onChange={handleChange} required className="mt-1 block w-full bg-slate-800 border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" />
                        {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                    </div>
                    <div>
                        <label htmlFor="url_resolved" className="block text-sm font-medium text-slate-300">Stream URL*</label>
                        <input type="url" name="url_resolved" id="url_resolved" value={newStationData.url_resolved} onChange={handleChange} required placeholder="https://..." className="mt-1 block w-full bg-slate-800 border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" />
                        {errors.url_resolved && <p className="mt-1 text-sm text-red-400">{errors.url_resolved}</p>}
                    </div>
                    <div>
                        <label htmlFor="country" className="block text-sm font-medium text-slate-300">Country*</label>
                        <input type="text" name="country" id="country" value={newStationData.country} onChange={handleChange} required className="mt-1 block w-full bg-slate-800 border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" />
                        {errors.country && <p className="mt-1 text-sm text-red-400">{errors.country}</p>}
                    </div>
                    <div>
                        <label htmlFor="state" className="block text-sm font-medium text-slate-300">State / Province / City</label>
                        <input type="text" name="state" id="state" value={newStationData.state} onChange={handleChange} className="mt-1 block w-full bg-slate-800 border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" />
                    </div>
                    <div>
                        <label htmlFor="tags" className="block text-sm font-medium text-slate-300">Genres (comma-separated)</label>
                        <input type="text" name="tags" id="tags" value={newStationData.tags} onChange={handleChange} placeholder="e.g. jazz, rock, classical" className="mt-1 block w-full bg-slate-800 border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Location*</label>
                        <div className="mt-1 p-3 bg-slate-800 border-slate-600 rounded-md space-y-2">
                            {newStationData.geo_lat !== null ? (
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-mono">Lat: {newStationData.geo_lat.toFixed(4)}, Lon: {newStationData.geo_long!.toFixed(4)}</p>
                                    <button type="button" onClick={onSetPickerMode} className="text-sm text-blue-400 hover:underline">Pick on Globe</button>
                                </div>
                            ) : (
                                <button type="button" onClick={onSetPickerMode} className="w-full text-center text-sm text-blue-400 p-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20">
                                    Click to set location on globe...
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleLocateViaMaps}
                                disabled={isMapsLocating}
                                className="w-full text-center text-xs font-bold uppercase tracking-wider text-emerald-200 p-2 rounded-md bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/30 transition-colors disabled:opacity-50"
                            >
                                {isMapsLocating ? 'Locating via Google Maps...' : 'Find True Coordinates via Google Maps'}
                            </button>
                            {mapsFeedback?.error && <p className="text-xs text-red-400">{mapsFeedback.error}</p>}
                            {mapsFeedback?.text && <p className="text-xs text-slate-300 leading-relaxed">{mapsFeedback.text}</p>}
                            {mapsFeedback?.links && mapsFeedback.links.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {mapsFeedback.links.map((l) => (
                                        <a
                                            key={l.uri}
                                            href={l.uri}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-[11px] text-emerald-200 border border-emerald-400/30"
                                        >
                                            <span>{l.title}</span>
                                            <span>&nearr;</span>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                        {errors.location && <p className="mt-1 text-sm text-red-400">{errors.location}</p>}
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button type="button" onClick={onClose} className="bg-transparent py-2 px-4 border border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 mr-3">Cancel</button>
                        <button type="submit" className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Submit for Review</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubmissionModal;
