
import React, { useState, useEffect } from 'react';

interface TreeSubmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (imageDataUrl: string) => void; 
    onSetPickerMode: () => void;
    isIdentifying: boolean;
    location: { lat: number, lon: number } | null;
}

const TreeSubmissionModal: React.FC<TreeSubmissionModalProps> = ({ isOpen, onClose, onSubmit, onSetPickerMode, isIdentifying, location }) => {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setError('Image size should be less than 4MB.');
                return;
            }
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file (JPEG, PNG, GIF).');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
                setError(null);
            };
            reader.onerror = () => {
                setError('Failed to read the image file.');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = () => {
        if (isIdentifying) return;

        let errors = [];
        if (!imagePreview) errors.push('an image');
        if (!location) errors.push('a location on the globe');
        
        if (errors.length > 0) {
            setError(`Please provide ${errors.join(' and ')}.`);
            return;
        }

        if (imagePreview) {
            onSubmit(imagePreview);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setImagePreview(null);
            setError(null);
        }
    }, [isOpen]);

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
                className="bg-slate-900/80 backdrop-blur-lg border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] p-8 m-4 text-slate-200 shadow-2xl shadow-blue-500/10 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-white mb-4">Identify a Tree</h2>
                    <button 
                        onClick={onClose} 
                        className="text-3xl font-light leading-none text-slate-400 hover:text-white transition-colors"
                        aria-label="Close modal"
                        disabled={isIdentifying}
                    >
                        &times;
                    </button>
                </div>
                <p className="mb-6 text-sm text-slate-400">
                    Upload a clear photo of a tree (or its leaf, flower, or bark) and set its location on the globe. Our AI will attempt to identify it.
                </p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">1. Upload Photo</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Tree preview" className="mx-auto h-32 w-auto rounded-md" />
                                ) : (
                                    <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                                <div className="flex text-sm text-slate-400 justify-center">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-slate-800 rounded-md font-medium text-blue-400 hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 focus-within:ring-blue-500 px-2">
                                        <span>{imagePreview ? 'Change photo' : 'Upload a file'}</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" disabled={isIdentifying} />
                                    </label>
                                </div>
                                <p className="text-xs text-slate-500">PNG, JPG, GIF up to 4MB</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300">2. Set Location</label>
                        <div className="mt-1 p-3 bg-slate-800 border-slate-600 rounded-md">
                            {location ? (
                                <div className="flex justify-between items-center">
                                    <p className="text-sm">Lat: {location.lat.toFixed(4)}, Lon: {location.lon.toFixed(4)}</p>
                                    <button type="button" onClick={onSetPickerMode} className="text-sm text-blue-400 hover:underline" disabled={isIdentifying}>Change</button>
                                </div>
                            ) : (
                                <button type="button" onClick={onSetPickerMode} className="w-full text-center text-sm text-blue-400 p-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20" disabled={isIdentifying}>
                                    Click to set location on globe...
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {error && <p className="mt-1 text-sm text-red-400">{error}</p>}

                    <div className="pt-4 flex justify-end">
                        <button type="button" onClick={onClose} className="bg-transparent py-2 px-4 border border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 mr-3 disabled:opacity-50" disabled={isIdentifying}>Cancel</button>
                        <button 
                            type="button" 
                            onClick={handleSubmit} 
                            className="bg-green-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center"
                            disabled={isIdentifying}
                        >
                            {isIdentifying && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            {isIdentifying ? 'Identifying...' : 'Identify'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TreeSubmissionModal;
