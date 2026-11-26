import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, ChatModelId, ChatRoleId, InfoPanelData, RadioStation } from '../types';

export type ChatWindowSize = 'standard' | 'large' | 'wide';

interface ChatPanelProps {
    messages: ChatMessage[];
    role: ChatRoleId;
    model: ChatModelId;
    isStreaming: boolean;
    error: string | null;
    currentStation: RadioStation | null;
    pinnedData: InfoPanelData | null;
    chatSize: ChatWindowSize;
    onChatSizeChange: (size: ChatWindowSize) => void;
    onRoleChange: (role: ChatRoleId) => void;
    onModelChange: (model: ChatModelId) => void;
    useMapsGrounding?: boolean;
    onToggleMapsGrounding?: () => void;
    onSendMessage: (message: string) => void;
    onClearChat: () => void;
    onDismissError: () => void;
}

const CHAT_ROLES: { id: ChatRoleId; label: string; subtitle: string; starters: string[] }[] = [
    {
        id: 'guide',
        label: 'Guide',
        subtitle: 'Earth, Birds, Radio & Space',
        starters: [
            'What can I explore across Earth and the Solar System here?',
            'Recommend a region to listen to live radio and spot birds.',
        ],
    },
    {
        id: 'ornithologist',
        label: 'Birds',
        subtitle: 'Avian Bioacoustics Specialist',
        starters: [
            'How does BirdNET identify birds from live audio?',
            'Which migratory songbirds are active right now?',
        ],
    },
    {
        id: 'astronomer',
        label: 'Space',
        subtitle: 'Astrometry & Solar System',
        starters: [
            'What do O, B, A, F, G, K, M stellar classes tell us?',
            'Which bright stars in Orion or Sirius should I visit next?',
        ],
    },
    {
        id: 'radio-curator',
        label: 'Radio',
        subtitle: 'Global Broadcast Curator',
        starters: [
            'Tell me about Israeli stations like Radius 100FM and Eco99fm.',
            'Suggest genres or countries to tune into on the globe.',
        ],
    },
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
    messages,
    role,
    model,
    isStreaming,
    error,
    currentStation,
    pinnedData,
    chatSize,
    onChatSizeChange,
    onRoleChange,
    onModelChange,
    useMapsGrounding = true,
    onToggleMapsGrounding,
    onSendMessage,
    onClearChat,
    onDismissError,
}) => {
    const [input, setInput] = useState('');
    const threadEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isStreaming]);

    const activeRoleMeta = CHAT_ROLES.find(r => r.id === role) || CHAT_ROLES[0];

    const contextPrompt = (() => {
        if (pinnedData?.type === 'bird') {
            return `Tell me about the ${pinnedData.common} (${pinnedData.scientific}) and its call.`;
        }
        if (pinnedData?.type === 'tree' || pinnedData?.type === 'inaturalist') {
            return `Tell me interesting ecological facts about ${pinnedData.common} (${pinnedData.scientific}).`;
        }
        if (pinnedData && (pinnedData.type === 'celestial-star' || pinnedData.type === 'planet' || pinnedData.type === 'sun' || pinnedData.type === 'moon')) {
            return `Tell me key astronomy facts about ${pinnedData.name}.`;
        }
        if (currentStation) {
            return `Tell me about the radio culture around ${currentStation.name} in ${currentStation.country}.`;
        }
        return null;
    })();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || isStreaming) return;
        setInput('');
        onSendMessage(trimmed);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const containerHeightClass =
        chatSize === 'wide'
            ? 'h-[74vh] md:h-[calc(100vh-11.5rem)]'
            : chatSize === 'large'
            ? 'h-[64vh] md:h-[600px] max-h-[calc(82vh-5rem)] md:max-h-[calc(100vh-14rem)]'
            : 'h-[460px] max-h-[calc(75vh-5rem)] md:max-h-[calc(100vh-19rem)]';

    return (
        <div className={`flex flex-col transition-all duration-300 ${containerHeightClass}`}>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Gemini Field Assistant</p>
                    <p className="text-[10px] text-slate-400 truncate">{activeRoleMeta.subtitle} &bull; Free Key</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="flex items-center rounded-lg bg-white/5 border border-white/10 p-0.5" title="Adjust chat window size">
                        {(
                            [
                                { id: 'standard', label: 'S', title: 'Standard chat size' },
                                { id: 'large', label: 'L', title: 'Large chat size' },
                                { id: 'wide', label: 'XL', title: 'Expanded theater chat size' },
                            ] as { id: ChatWindowSize; label: string; title: string }[]
                        ).map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => onChatSizeChange(opt.id)}
                                title={opt.title}
                                className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors ${
                                    chatSize === opt.id
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {onToggleMapsGrounding && (
                        <button
                            type="button"
                            onClick={onToggleMapsGrounding}
                            className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-colors ${
                                useMapsGrounding
                                    ? 'bg-emerald-600/25 border-emerald-400/50 text-emerald-200'
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                            }`}
                            title="Ground geographic answers with Google Maps via gemini-4-hydrogen"
                        >
                            Maps {useMapsGrounding ? 'On' : 'Off'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onModelChange(model === 'gemini-4-hydrogen' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen')}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-wider text-slate-300 transition-colors"
                        title="Switch between Gemini 4 Hydrogen (balanced) and Gemini 3.1 Flash Lite (fast)"
                    >
                        {model === 'gemini-4-hydrogen' ? 'Hydrogen' : 'Fast Lite'}
                    </button>
                    {messages.length > 0 && (
                        <button
                            type="button"
                            onClick={onClearChat}
                            disabled={isStreaming}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-red-300 transition-colors disabled:opacity-40"
                            title="Clear conversation history"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-4 gap-1 py-2.5 border-b border-white/5">
                {CHAT_ROLES.map(item => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onRoleChange(item.id)}
                        className={`py-1.5 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                            role === item.id
                                ? 'bg-blue-600/25 border-blue-500/40 text-blue-300'
                                : 'bg-white/5 border-transparent text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 no-scrollbar">
                {messages.length === 0 ? (
                    <div className="space-y-3 py-2">
                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                            <p className="text-xs text-slate-200 leading-relaxed">
                                Ask anything about the birds, flora, global radio stations, or stars in view. Switch roles above to tailor my expertise.
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            {contextPrompt && (
                                <button
                                    type="button"
                                    onClick={() => onSendMessage(contextPrompt)}
                                    disabled={isStreaming}
                                    className="w-full text-left p-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-[11px] text-blue-200 transition-colors"
                                >
                                    {contextPrompt}
                                </button>
                            )}
                            {activeRoleMeta.starters.map(prompt => (
                                <button
                                    key={prompt}
                                    type="button"
                                    onClick={() => onSendMessage(prompt)}
                                    disabled={isStreaming}
                                    className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 transition-colors"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map(msg => (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            <div
                                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                                    msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-sm shadow-lg shadow-blue-900/30'
                                        : msg.isError
                                        ? 'bg-red-950/80 border border-red-500/40 text-red-200 rounded-bl-sm'
                                        : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-sm'
                                }`}
                            >
                                {msg.text || (isStreaming ? '...' : '')}
                            </div>
                            {msg.role === 'model' && msg.mapsLinks && msg.mapsLinks.length > 0 && (
                                <div className="max-w-[88%] mt-1.5 flex flex-wrap gap-1.5">
                                    {msg.mapsLinks.map((link) => (
                                        <a
                                            key={link.uri}
                                            href={link.uri}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={link.snippets?.[0] || link.title}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-400/30 text-[10px] font-bold text-emerald-200 transition-colors"
                                        >
                                            <span>{link.title}</span>
                                            <span>&nearr;</span>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
                <div ref={threadEndRef} />
            </div>

            {error && (
                <div className="mb-2 px-3 py-2 rounded-xl bg-red-950/90 border border-red-500/40 text-[11px] text-red-200 flex items-center justify-between gap-2">
                    <span className="truncate">{error}</span>
                    <button type="button" onClick={onDismissError} className="text-red-300 hover:text-white font-bold">
                        &times;
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="pt-2 border-t border-white/10 flex items-end gap-2">
                <textarea
                    rows={1}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask ${activeRoleMeta.label}...`}
                    disabled={isStreaming}
                    className="flex-1 bg-slate-800/80 rounded-2xl px-3.5 py-2.5 text-xs text-white border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/50 resize-none max-h-24 disabled:opacity-60"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || isStreaming}
                    className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center flex-shrink-0"
                    title="Send message"
                >
                    {isStreaming ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    )}
                </button>
            </form>
        </div>
    );
};
