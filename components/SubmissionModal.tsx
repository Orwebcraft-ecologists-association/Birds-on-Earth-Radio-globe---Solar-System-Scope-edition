import React, { useState, useEffect } from 'react';
import type { StationSubmission } from '../types';

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewStationData(prev => ({ ...prev, [name]: value }));
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
            newErrors.location = 'Please pick a location on the globe.';
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
        // Clear errors when modal opens
        if (isOpen) {
            setErrors({});
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
                        <label htmlFor="state" className="block text-sm font-medium text-slate-300">State / Province</label>
                        <input type="text" name="state" id="state" value={newStationData.state} onChange={handleChange} className="mt-1 block w-full bg-slate-800 border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" />
                    </div>
                    <div>
                        <label htmlFor="tags" className="block text-sm font-medium text-slate-300">Genres (comma-separated)</label>
                        <input type="text" name="tags" id="tags" value={newStationData.tags} onChange={handleChange} placeholder="e.g. jazz, rock, classical" className="mt-1 block w-full bg-slate-800 border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Location*</label>
                        <div className="mt-1 p-3 bg-slate-800 border-slate-600 rounded-md">
                            {newStationData.geo_lat !== null ? (
                                <div className="flex justify-between items-center">
                                    <p className="text-sm">Lat: {newStationData.geo_lat.toFixed(4)}, Lon: {newStationData.geo_long!.toFixed(4)}</p>
                                    <button type="button" onClick={onSetPickerMode} className="text-sm text-blue-400 hover:underline">Change</button>
                                </div>
                            ) : (
                                <button type="button" onClick={onSetPickerMode} className="w-full text-center text-sm text-blue-400 p-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20">
                                    Click to set location on globe...
                                </button>
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
