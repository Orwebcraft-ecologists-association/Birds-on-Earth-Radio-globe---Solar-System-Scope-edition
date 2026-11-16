import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatRoleId, VoiceTranscriptEntry } from '../types';

interface LiveVoicePanelProps {
    activeRole: ChatRoleId;
    viewerContext: string;
}

const VOICE_OPTIONS = [
    { id: 'Zephyr', label: 'Zephyr (Warm)' },
    { id: 'Aoede', label: 'Aoede (Clear)' },
    { id: 'Puck', label: 'Puck (Bright)' },
    { id: 'Charon', label: 'Charon (Deep)' },
];

const ROLE_LABELS: { id: ChatRoleId; label: string }[] = [
    { id: 'guide', label: 'Field Guide' },
    { id: 'ornithologist', label: 'Birds' },
    { id: 'astronomer', label: 'Space' },
    { id: 'radio-curator', label: 'Radio' },
];

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export const LiveVoicePanel: React.FC<LiveVoicePanelProps> = ({ activeRole, viewerContext }) => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [role, setRole] = useState<ChatRoleId>(activeRole);
    const [voice, setVoice] = useState('Zephyr');
    const [isMuted, setIsMuted] = useState(false);
    const [isModelSpeaking, setIsModelSpeaking] = useState(false);
    const [micLevel, setMicLevel] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [transcripts, setTranscripts] = useState<VoiceTranscriptEntry[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const captureCtxRef = useRef<AudioContext | null>(null);
    const playbackCtxRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);
    const isMutedRef = useRef(false);
    const threadEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    useEffect(() => {
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);

    const stopPlaybackQueue = useCallback(() => {
        activeSourcesRef.current.forEach((src) => {
            try {
                src.stop();
            } catch {
                // Ignore already stopped sources
            }
        });
        activeSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        setIsModelSpeaking(false);
    }, []);

    const cleanupSession = useCallback(() => {
        if (processorRef.current) {
            try {
                processorRef.current.disconnect();
            } catch {
                // ignore
            }
            processorRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            mediaStreamRef.current = null;
        }
        if (captureCtxRef.current) {
            captureCtxRef.current.close().catch(() => {});
            captureCtxRef.current = null;
        }
        stopPlaybackQueue();
        if (playbackCtxRef.current) {
            playbackCtxRef.current.close().catch(() => {});
            playbackCtxRef.current = null;
        }
        if (wsRef.current) {
            try {
                wsRef.current.close();
            } catch {
                // ignore
            }
            wsRef.current = null;
        }
        setMicLevel(0);
        setIsModelSpeaking(false);
    }, [stopPlaybackQueue]);

    useEffect(() => {
        return () => cleanupSession();
    }, [cleanupSession]);

    const schedulePcmPlayback = useCallback((base64Data: string) => {
        const ctx = playbackCtxRef.current;
        if (!ctx) return;

        const bytes = base64ToUint8Array(base64Data);
        const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
        if (int16.length === 0) return;

        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768;
        }

        const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
        audioBuffer.copyToChannel(float32, 0);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        const startAt = Math.max(ctx.currentTime, nextStartTimeRef.current);
        source.start(startAt);
        nextStartTimeRef.current = startAt + audioBuffer.duration;
        setIsModelSpeaking(true);

        activeSourcesRef.current.add(source);
        source.onended = () => {
            activeSourcesRef.current.delete(source);
            if (activeSourcesRef.current.size === 0) {
                setIsModelSpeaking(false);
            }
        };
    }, []);

    const appendTranscript = useCallback((speaker: 'user' | 'model', chunk: string) => {
        if (!chunk) return;
        setTranscripts((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.speaker === speaker && Date.now() - last.timestamp < 5000) {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    ...last,
                    text: `${last.text}${chunk}`,
                    timestamp: Date.now(),
                };
                return updated;
            }
            return [
                ...prev.slice(-30),
                {
                    id: `${speaker}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    speaker,
                    text: chunk,
                    timestamp: Date.now(),
                },
            ];
        });
    }, []);

    const handleStartVoice = async () => {
        if (status === 'connecting' || status === 'connected') return;
        setErrorMsg(null);
        setStatus('connecting');

        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Microphone access is not supported in this browser.');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
            mediaStreamRef.current = stream;

            const captureCtx = new AudioContext({ sampleRate: 16000 });
            captureCtxRef.current = captureCtx;
            const playbackCtx = new AudioContext({ sampleRate: 24000 });
            playbackCtxRef.current = playbackCtx;

            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const params = new URLSearchParams({
                role,
                voice,
                context: viewerContext.slice(0, 500),
            });
            const ws = new WebSocket(`${proto}//${window.location.host}/live?${params.toString()}`);
            wsRef.current = ws;

            ws.onopen = () => {
                const source = captureCtx.createMediaStreamSource(stream);
                const processor = captureCtx.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;

                processor.onaudioprocess = (event) => {
                    if (isMutedRef.current || ws.readyState !== WebSocket.OPEN) {
                        setMicLevel(0);
                        return;
                    }
                    const inputData = event.inputBuffer.getChannelData(0);
                    let sumSq = 0;
                    const pcm16 = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        const clamped = Math.max(-1, Math.min(1, inputData[i]));
                        sumSq += clamped * clamped;
                        pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
                    }
                    const rms = Math.sqrt(sumSq / inputData.length);
                    setMicLevel(Math.min(1, rms * 4.5));

                    const base64 = uint8ArrayToBase64(new Uint8Array(pcm16.buffer));
                    ws.send(JSON.stringify({ type: 'audio', data: base64 }));
                };

                source.connect(processor);
                processor.connect(captureCtx.destination);
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data as string);
                    if (msg.type === 'ready') {
                        setStatus('connected');
                    } else if (msg.type === 'audio' && msg.data) {
                        schedulePcmPlayback(msg.data);
                    } else if (msg.type === 'input_transcript' && msg.text) {
                        appendTranscript('user', msg.text);
                    } else if (msg.type === 'output_transcript' && msg.text) {
                        appendTranscript('model', msg.text);
                    } else if (msg.type === 'interrupted') {
                        stopPlaybackQueue();
                    } else if (msg.type === 'error') {
                        setErrorMsg(msg.error || 'Voice connection encountered an error.');
                        setStatus('error');
                    } else if (msg.type === 'closed') {
                        cleanupSession();
                        setStatus('idle');
                    }
                } catch {
                    // ignore unparseable server frame
                }
            };

            ws.onerror = () => {
                setErrorMsg('WebSocket voice connection failed. Please try again.');
                setStatus('error');
                cleanupSession();
            };

            ws.onclose = () => {
                setStatus((prev) => (prev === 'error' ? 'error' : 'idle'));
                cleanupSession();
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unable to start voice session.';
            setErrorMsg(msg);
            setStatus('error');
            cleanupSession();
        }
    };

    const handleStopVoice = () => {
        cleanupSession();
        setStatus('idle');
    };

    const handleSendSceneBrief = () => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const prompt = viewerContext
            ? `Here is what I am currently looking at:\n${viewerContext}\nGive me a brief spoken insight about this.`
            : 'Tell me what is exciting to listen to or look for right now on Earth and in the Solar System.';
        ws.send(JSON.stringify({ type: 'text', text: prompt }));
    };

    return (
        <div className="flex flex-col h-[460px] max-h-[calc(78vh-6rem)] space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Voice Conversation</p>
                    <p className="text-[10px] text-slate-400">Gemini Live &bull; Bidirectional Audio</p>
                </div>
                <span
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                        status === 'connected'
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : status === 'connecting'
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                            : status === 'error'
                            ? 'bg-red-500/20 border-red-500/40 text-red-300'
                            : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                >
                    {status === 'connected' ? (isModelSpeaking ? 'Speaking' : 'Listening') : status}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Persona</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as ChatRoleId)}
                        disabled={status === 'connected' || status === 'connecting'}
                        className="w-full bg-slate-800 rounded-xl px-3 py-2 text-xs text-white border border-white/10 outline-none disabled:opacity-60"
                    >
                        {ROLE_LABELS.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Voice</label>
                    <select
                        value={voice}
                        onChange={(e) => setVoice(e.target.value)}
                        disabled={status === 'connected' || status === 'connecting'}
                        className="w-full bg-slate-800 rounded-xl px-3 py-2 text-xs text-white border border-white/10 outline-none disabled:opacity-60"
                    >
                        {VOICE_OPTIONS.map((v) => (
                            <option key={v.id} value={v.id}>
                                {v.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Mic Level Visualizer Bar */}
            <div className="bg-slate-950 rounded-xl p-3 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>{isMuted ? 'Microphone Muted' : 'Input Level'}</span>
                    <span>{status === 'connected' ? `${Math.round(micLevel * 100)}%` : 'Standby'}</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-75 ${isMuted ? 'bg-slate-600' : 'bg-emerald-400'}`}
                        style={{ width: `${status === 'connected' ? Math.max(4, micLevel * 100) : 0}%` }}
                    />
                </div>
            </div>

            {/* Live Transcript Thread */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar bg-slate-950/60 rounded-2xl p-3 border border-white/5">
                {transcripts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-3">
                        <p className="text-xs text-slate-300 font-semibold mb-1">Start a real-time voice session</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            Ask out loud about birdsong detections, stars, or local radio broadcasts. Speak naturally—interrupt anytime.
                        </p>
                    </div>
                ) : (
                    transcripts.map((entry) => (
                        <div key={entry.id} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                                    entry.speaker === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-sm'
                                        : 'bg-slate-800 text-slate-100 border border-white/10 rounded-bl-sm'
                                }`}
                            >
                                <span className="block text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">
                                    {entry.speaker === 'user' ? 'You' : 'Gemini'}
                                </span>
                                {entry.text}
                            </div>
                        </div>
                    ))
                )}
                <div ref={threadEndRef} />
            </div>

            {errorMsg && (
                <div className="px-3 py-2 rounded-xl bg-red-950 border border-red-500/40 text-[11px] text-red-200 flex items-center justify-between gap-2">
                    <span className="truncate">{errorMsg}</span>
                    <button type="button" onClick={() => setErrorMsg(null)} className="text-red-300 hover:text-white font-bold">
                        &times;
                    </button>
                </div>
            )}

            <div className="flex items-center gap-2 pt-1">
                {status !== 'connected' && status !== 'connecting' ? (
                    <button
                        type="button"
                        onClick={handleStartVoice}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg"
                    >
                        Start Voice Chat
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => setIsMuted((m) => !m)}
                            className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                                isMuted
                                    ? 'bg-amber-600/20 border-amber-500/40 text-amber-300'
                                    : 'bg-slate-800 border-white/10 text-white hover:bg-slate-700'
                            }`}
                        >
                            {isMuted ? 'Unmute' : 'Mute'}
                        </button>
                        <button
                            type="button"
                            onClick={handleSendSceneBrief}
                            className="px-3.5 py-3 rounded-2xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-300 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all"
                            title="Ask voice guide about what is currently selected in the scene"
                        >
                            Describe View
                        </button>
                        <button
                            type="button"
                            onClick={handleStopVoice}
                            className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            End
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
