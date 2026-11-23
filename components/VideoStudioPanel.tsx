import React, { useState, useRef } from 'react';
import type { VideoAspectRatio, VideoCreationRecord, VideoMode } from '../types';

interface VideoStudioPanelProps {
    videoHistory: VideoCreationRecord[];
    isSignedIn: boolean;
    onSignIn: () => void;
    onVideoGenerated: (record: { mode: VideoMode; prompt: string; aspectRatio: VideoAspectRatio }) => Promise<void> | void;
    onDeleteHistoryItem: (creationId: string) => void;
}

const TEXT_SUGGESTIONS = [
    'Slow orbital flyover above Earth terminator city lights, gleaming solar arrays in golden sunlight, cinematic deep space.',
    'A flock of migratory swallows banking over coastal Mediterranean cliffs at golden hour, sunlit ocean waves below.',
    'Voyager-style close pass of Saturn rings casting crisp shadows onto amber banded clouds.',
];

const IMAGE_SUGGESTIONS = [
    'Animate with gentle natural wind motion, soft atmospheric sunlight, and smooth cinematic camera drift.',
    'Bring this scene to life with subtle wing movement, shimmering light reflections, and slow cinematic parallax.',
];

export const VideoStudioPanel: React.FC<VideoStudioPanelProps> = ({
    videoHistory,
    isSignedIn,
    onSignIn,
    onVideoGenerated,
    onDeleteHistoryItem,
}) => {
    const [mode, setMode] = useState<VideoMode>('text');
    const [outputEngine, setOutputEngine] = useState<'storyboard' | 'mp4'>('storyboard');
    const [prompt, setPrompt] = useState(TEXT_SUGGESTIONS[0]);
    const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [generatedStoryboard, setGeneratedStoryboard] = useState<string | null>(null);
    const [generatedModel, setGeneratedModel] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleModeChange = (nextMode: VideoMode) => {
        setMode(nextMode);
        setError(null);
        if (nextMode === 'image' && TEXT_SUGGESTIONS.includes(prompt)) {
            setPrompt(IMAGE_SUGGESTIONS[0]);
        } else if (nextMode === 'text' && IMAGE_SUGGESTIONS.includes(prompt)) {
            setPrompt(TEXT_SUGGESTIONS[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(null);

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setError('Please choose a JPEG, PNG, or WebP photo.');
            return;
        }
        if (file.size > 12 * 1024 * 1024) {
            setError('Photo is too large. Please select an image under 12MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === 'string' ? reader.result : '';
            const base64Part = dataUrl.split(',')[1] || '';
            setImagePreviewUrl(dataUrl);
            setImageBase64(base64Part);
            setImageMimeType(file.type || 'image/jpeg');
        };
        reader.readAsDataURL(file);
    };

    const runGeneration = async (engine: 'storyboard' | 'mp4') => {
        const trimmed = prompt.trim();
        if (!trimmed) {
            setError('Please enter a prompt describing your scene.');
            return;
        }
        if (mode === 'image' && !imageBase64) {
            setError('Please upload a photo to analyze or animate.');
            return;
        }

        setError(null);
        setIsGenerating(true);

        try {
            const endpoint = engine === 'storyboard' ? '/api/video/storyboard' : '/api/video/generate';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode,
                    prompt: trimmed,
                    aspectRatio,
                    ...(mode === 'image' ? { imageBase64, mimeType: imageMimeType } : {}),
                }),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json?.error || `Generation failed (${res.status})`);
            }

            if (engine === 'storyboard') {
                if (!json?.storyboard) {
                    throw new Error('No storyboard returned by the server.');
                }
                setGeneratedStoryboard(json.storyboard);
                setGeneratedVideoUrl(null);
                setGeneratedModel(typeof json.model === 'string' ? json.model : 'gemini-4-hydrogen');
            } else {
                if (!json?.videoBase64) {
                    throw new Error('No video payload returned by the server.');
                }
                const mime = json.mimeType || 'video/mp4';
                const dataUri = `data:${mime};base64,${json.videoBase64}`;
                setGeneratedVideoUrl(dataUri);
                setGeneratedStoryboard(null);
                setGeneratedModel(typeof json.model === 'string' ? json.model : null);
            }

            await onVideoGenerated({
                mode,
                prompt: trimmed.slice(0, 1000),
                aspectRatio,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to generate right now.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        await runGeneration(outputEngine);
    };

    const suggestions = mode === 'image' ? IMAGE_SUGGESTIONS : TEXT_SUGGESTIONS;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 gap-2">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-300">Scene &amp; Video Studio</p>
                    <p className="text-[10px] text-slate-400">
                        {outputEngine === 'storyboard' ? 'AI Storyboard • Unpaid Key' : 'MP4 Synthesis • Billed Key'}
                    </p>
                </div>
                <div className="flex items-center rounded-lg bg-slate-950 border border-white/10 p-0.5">
                    <button
                        type="button"
                        onClick={() => { setOutputEngine('storyboard'); setError(null); }}
                        className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors ${
                            outputEngine === 'storyboard' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Runs on unpaid/free-tier Gemini 4 Hydrogen"
                    >
                        Storyboard
                    </button>
                    <button
                        type="button"
                        onClick={() => { setOutputEngine('mp4'); setError(null); }}
                        className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors ${
                            outputEngine === 'mp4' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                        title="MP4 Video Synthesis (requires billing on key)"
                    >
                        MP4
                    </button>
                </div>
            </div>

            {/* Mode Selector */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-white/10">
                <button
                    type="button"
                    onClick={() => handleModeChange('text')}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        mode === 'text' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    Text Scene
                </button>
                <button
                    type="button"
                    onClick={() => handleModeChange('image')}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        mode === 'image' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    From Photo
                </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3">
                {mode === 'image' && (
                    <div className="space-y-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        {imagePreviewUrl ? (
                            <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-slate-950">
                                <img src={imagePreviewUrl} alt="Source frame" className="w-full h-36 object-cover" />
                                <div className="absolute top-2 right-2 flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-2.5 py-1 rounded-lg bg-slate-950/90 text-[9px] font-black uppercase text-white border border-white/20"
                                    >
                                        Replace
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImagePreviewUrl(null);
                                            setImageBase64(null);
                                        }}
                                        className="px-2 py-1 rounded-lg bg-red-950/90 text-[9px] font-black uppercase text-red-200 border border-red-500/30"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-6 border border-dashed border-purple-500/40 rounded-2xl bg-purple-500/5 hover:bg-purple-500/10 transition-colors flex flex-col items-center gap-1.5 text-center"
                            >
                                <span className="text-[11px] font-black uppercase tracking-wider text-purple-300">
                                    Upload Photo
                                </span>
                                <span className="text-[10px] text-slate-400">JPEG, PNG, or WebP up to 12MB</span>
                            </button>
                        )}
                    </div>
                )}

                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Motion Prompt</label>
                        <div className="flex items-center gap-1">
                            {(['16:9', '9:16'] as VideoAspectRatio[]).map((ratio) => (
                                <button
                                    key={ratio}
                                    type="button"
                                    onClick={() => setAspectRatio(ratio)}
                                    className={`px-2 py-0.5 rounded-lg text-[9px] font-black border transition-colors ${
                                        aspectRatio === ratio
                                            ? 'bg-purple-600 border-purple-400 text-white'
                                            : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {ratio}
                                </button>
                            ))}
                        </div>
                    </div>
                    <textarea
                        rows={3}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        maxLength={1000}
                        placeholder={mode === 'image' ? 'Describe how this photo should animate...' : 'Describe the cosmic or wildlife video scene...'}
                        className="w-full bg-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-white border border-white/10 outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                    />
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s, idx) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setPrompt(s)}
                            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] text-slate-300 transition-colors"
                        >
                            Preset {idx + 1}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="px-3 py-2 rounded-xl bg-red-950 border border-red-500/40 text-[11px] text-red-200 space-y-2">
                        <p>{error}</p>
                        {outputEngine === 'mp4' && (
                            <button
                                type="button"
                                onClick={() => {
                                    setOutputEngine('storyboard');
                                    void runGeneration('storyboard');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider"
                            >
                                Run Storyboard on Unpaid Key
                            </button>
                        )}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isGenerating}
                    className={`w-full py-3 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        outputEngine === 'storyboard' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-purple-600 hover:bg-purple-500'
                    }`}
                >
                    {isGenerating ? (
                        <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {outputEngine === 'storyboard' ? 'Directing Storyboard...' : 'Generating Video...'}
                        </>
                    ) : outputEngine === 'storyboard' ? (
                        'Generate Scene Storyboard'
                    ) : mode === 'image' ? (
                        'Animate Photo into Video'
                    ) : (
                        'Generate Video from Text'
                    )}
                </button>
            </form>

            {generatedStoryboard && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Director Storyboard</span>
                        {generatedModel && (
                            <span className="text-[9px] font-mono text-slate-400 truncate">{generatedModel}</span>
                        )}
                    </div>
                    <div className="max-h-56 overflow-y-auto no-scrollbar rounded-2xl border border-white/10 bg-slate-950/90 p-3 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {generatedStoryboard}
                    </div>
                </div>
            )}

            {generatedVideoUrl && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Generated Video</span>
                            {generatedModel && (
                                <span className="text-[9px] font-mono text-slate-400 truncate">{generatedModel}</span>
                            )}
                        </div>
                        <a
                            href={generatedVideoUrl}
                            download={`solar-scope-${Date.now()}.mp4`}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-[9px] font-black uppercase text-emerald-300 hover:text-white transition-colors shrink-0"
                        >
                            Download MP4
                        </a>
                    </div>
                    <video
                        src={generatedVideoUrl}
                        controls
                        autoPlay
                        loop
                        playsInline
                        className="w-full rounded-2xl border border-white/15 bg-black"
                    />
                </div>
            )}

            {/* Persistent Firestore Prompt History */}
            <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Saved Prompt Log</span>
                    {!isSignedIn && (
                        <button
                            type="button"
                            onClick={onSignIn}
                            className="text-[9px] font-black uppercase tracking-wider text-blue-400 hover:text-blue-300"
                        >
                            Sign In to Sync
                        </button>
                    )}
                </div>
                {videoHistory.length > 0 ? (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                        {videoHistory.map((item) => (
                            <div
                                key={item.creationId}
                                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/5 border border-white/5"
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode(item.mode);
                                        setPrompt(item.prompt);
                                        setAspectRatio(item.aspectRatio);
                                    }}
                                    className="text-left min-w-0 flex-1"
                                >
                                    <p className="text-[10px] text-slate-200 truncate">{item.prompt}</p>
                                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                        {item.mode === 'image' ? 'Photo' : 'Text'} • {item.aspectRatio}
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDeleteHistoryItem(item.creationId)}
                                    className="text-slate-500 hover:text-red-400 text-xs px-1.5"
                                    title="Delete prompt record"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[10px] text-slate-500">
                        {isSignedIn ? 'Generated video prompts are saved here.' : 'Sign in with Google to save your prompt history.'}
                    </p>
                )}
            </div>
        </div>
    );
};
