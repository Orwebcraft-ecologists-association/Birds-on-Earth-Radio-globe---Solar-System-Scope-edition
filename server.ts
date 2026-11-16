import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, ThinkingLevel } from '@google/genai';
import type { Content, GenerateContentResponse } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.NODE_ENV === 'production' ? Number(process.env.PORT) || 3000 : 3000;
const ALLOWED_CHAT_MODELS = new Set(['gemini-4-hydrogen', 'gemini-3.1-flash-lite']);
const FALLBACK_CHAT_MODELS = [
    'gemini-4-hydrogen',
    'gemini-3.8-flash',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
];
const FALLBACK_INTERACTION_VIDEO_MODELS = [
    'gemini-omni-1.2-flash',
    'gemini-omni-flash-preview',
    'gemini-omni-1.1-flash',
];
const FALLBACK_VEO_VIDEO_MODELS = [
    'veo-3.1-generate-001',
    'veo-3.1-fast-generate-001',
    'veo-3.0-generate-001',
    'veo-3.0-fast-generate-001',
    'veo-3.1-generate-preview',
    'veo-3.1-fast-generate-preview',
    'veo-3.1-lite-generate-preview',
    'veo-2.0-generate-001',
];
const FALLBACK_LIVE_MODELS = [
    'gemini-3.8-live',
    'gemini-2.5-flash-native-audio-preview-12-2025',
    'gemini-2.5-flash-native-audio-preview-09-2025',
];
const ALLOWED_VIDEO_RATIOS = new Set(['16:9', '9:16']);
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_LIVE_VOICES = new Set(['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede']);

interface VideoCandidate {
    kind: 'interaction' | 'veo';
    model: string;
}

interface DiscoveredModelsCacheEntry {
    fetchedAt: number;
    omniVideoModels: string[];
    veoModels: string[];
    liveModels: string[];
    textModels: string[];
}

const DISCOVERY_TTL_MS = 5 * 60 * 1000;
const discoveredModelsByKey = new Map<string, DiscoveredModelsCacheEntry>();
const workingVideoTargetByKey = new Map<string, VideoCandidate>();
const workingChatModelByKey = new Map<string, string>();
const workingLiveModelByKey = new Map<string, string>();

const ROLE_INSTRUCTIONS: Record<string, string> = {
    guide:
        'You are the Solar Scope Field Guide inside "Birds on Earth Radio - Solar System Scope Edition". ' +
        'You help users explore live global radio stations, real-time BirdNET bird sound detections, iNaturalist flora/fauna observations, and 3D heliocentric astrometry (planets, stars, constellations, and Timescape). ' +
        'Keep responses clear, accurate, engaging, and concise (around 2-4 short paragraphs unless the user asks for deep detail).',
    ornithologist:
        'You are a specialist Ornithologist & Avian Bioacoustics Researcher inside "Birds on Earth Radio". ' +
        'Focus on bird species identification, vocalization traits, BirdNET acoustic confidence interpretation, habitats, and seasonal migration patterns. ' +
        'Provide practical, scientifically grounded insights in clear, accessible language.',
    astronomer:
        'You are an Astrophysicist & Astrometry Specialist inside "Birds on Earth Radio - Solar System Scope Edition". ' +
        'Focus on stellar spectral classes (O, B, A, F, G, K, M), apparent magnitude, right ascension/declination, constellations, planetary dynamics, and orbital mechanics in the Solar System Scope. ' +
        'Give accurate astronomical context in a vivid, concise style.',
    'radio-curator':
        'You are a Global Radio & Cultural Geography Curator inside "Birds on Earth Radio". ' +
        'Help listeners discover regional radio traditions, genres, languages, and cultural context behind stations around the globe (including local scenes in Israel, Europe, the Americas, Asia, and beyond). ' +
        'Keep recommendations concise and evocative.'
};

const LIVE_VOICE_INSTRUCTIONS: Record<string, string> = {
    guide:
        'You are the live voice Solar Scope Field Guide inside Birds on Earth Radio. Speak naturally, warmly, and concisely in short conversational turns as users explore Earth radio stations, birdsong detections, flora, and stars.',
    ornithologist:
        'You are a live voice Avian Bioacoustics Specialist inside Birds on Earth Radio. Answer conversationally and succinctly about birdsong, migration, habitats, and species.',
    astronomer:
        'You are a live voice Astrophysicist inside Solar System Scope. Discuss stars, constellations, planets, orbital mechanics, and spectral types clearly in crisp conversational turns.',
    'radio-curator':
        'You are a live voice Global Radio Curator. Discuss music cultures, local radio broadcasts across Israel and the world, and broadcast traditions in lively short spoken responses.'
};

interface IncomingHistoryItem {
    role: 'user' | 'model';
    text: string;
}

interface ChatRequestBody {
    message?: string;
    history?: IncomingHistoryItem[];
    role?: string;
    model?: string;
    context?: string;
}

interface VideoGenerateRequestBody {
    mode?: string;
    prompt?: string;
    aspectRatio?: string;
    imageBase64?: string;
    mimeType?: string;
}

function getApiKey(): string | null {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
        return null;
    }
    return apiKey;
}

function hashKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 16);
}

function getAiClient(): GoogleGenAI | null {
    const apiKey = getApiKey();
    if (!apiKey) {
        return null;
    }
    return new GoogleGenAI({
        apiKey,
        httpOptions: {
            headers: {
                'User-Agent': 'aistudio-build',
            },
        },
    });
}

function extractErrorStatus(err: unknown): number | undefined {
    if (!err || typeof err !== 'object') return undefined;
    const e = err as Record<string, any>;
    const candidates = [
        e.status,
        e.statusCode,
        e.cause?.status,
        e.cause?.statusCode,
        e.httpMeta?.response?.status,
        e.cause?.httpMeta?.response?.status,
    ];
    for (const c of candidates) {
        if (typeof c === 'number' && Number.isFinite(c) && c >= 100) {
            return c;
        }
    }
    return undefined;
}

function getErrorText(err: unknown): string {
    if (!err) return '';
    if (err instanceof Error) {
        const extra = err as Error & { body?: unknown; status?: unknown; statusCode?: unknown; cause?: unknown };
        const causeErr = extra.cause instanceof Error ? (extra.cause as Error & { body?: unknown }) : null;
        const causeText = causeErr
            ? `${causeErr.message} ${typeof causeErr.body === 'string' ? causeErr.body : ''}`
            : '';
        const statusNum = extractErrorStatus(err);
        return `${statusNum ?? ''} ${err.message} ${typeof extra.body === 'string' ? extra.body : ''} ${causeText}`.trim();
    }
    if (typeof err === 'object') {
        try {
            return JSON.stringify(err);
        } catch {
            return String(err);
        }
    }
    return String(err);
}

function isModelNotFoundError(err: unknown): boolean {
    const status = extractErrorStatus(err);
    const lower = getErrorText(err).toLowerCase();
    if (status === 404) return true;
    return (
        lower.includes('not_found') ||
        lower.includes('404') ||
        lower.includes('is not found') ||
        lower.includes('not supported for generate') ||
        lower.includes('not supported for predict') ||
        lower.includes('unknown model') ||
        lower.includes('unsupported model')
    );
}

async function discoverModelsForKey(
    ai: GoogleGenAI,
    keyHash: string,
    forceRefresh = false
): Promise<DiscoveredModelsCacheEntry> {
    const existing = discoveredModelsByKey.get(keyHash);
    if (!forceRefresh && existing && Date.now() - existing.fetchedAt < DISCOVERY_TTL_MS) {
        return existing;
    }

    const omniVideoModels: string[] = [];
    const veoModels: string[] = [];
    const liveModels: string[] = [];
    const textModels: string[] = [];

    try {
        const pager = await ai.models.list({ config: { pageSize: 100 } });
        let count = 0;
        for await (const modelInfo of pager) {
            count++;
            const rawName = typeof modelInfo?.name === 'string' ? modelInfo.name : '';
            const id = rawName.replace(/^models\//, '').trim();
            if (!id) continue;

            const lower = id.toLowerCase();
            // Skip strictly deprecated families
            if (lower.startsWith('gemini-1.5-') || lower.startsWith('gemini-2.0-') || lower === 'gemini-pro') {
                continue;
            }

            const actions = Array.isArray((modelInfo as { supportedActions?: unknown }).supportedActions)
                ? ((modelInfo as { supportedActions: string[] }).supportedActions.map((a) => String(a).toLowerCase()))
                : [];

            if (lower.includes('omni')) {
                omniVideoModels.push(id);
            }
            if (
                lower.startsWith('veo') ||
                actions.includes('predictlongrunning') ||
                actions.includes('generatevideos')
            ) {
                veoModels.push(id);
            }
            if (
                lower.includes('live') ||
                lower.includes('native-audio') ||
                actions.includes('bidigeneratecontent')
            ) {
                liveModels.push(id);
            }
            if (
                lower.startsWith('gemini-') &&
                !lower.includes('omni') &&
                !lower.includes('-image') &&
                !lower.includes('-tts') &&
                !lower.includes('transcribe') &&
                !lower.includes('embedding') &&
                !lower.includes('robotics') &&
                !lower.includes('native-audio') &&
                (actions.length === 0 || actions.includes('generatecontent'))
            ) {
                textModels.push(id);
            }

            if (count >= 200) break;
        }
    } catch (err) {
        console.warn('Model discovery failed (continuing with curated model candidates):', getErrorText(err).slice(0, 200));
    }

    const entry: DiscoveredModelsCacheEntry = {
        fetchedAt: Date.now(),
        omniVideoModels,
        veoModels,
        liveModels,
        textModels,
    };
    discoveredModelsByKey.set(keyHash, entry);
    return entry;
}

function buildVideoCandidates(keyHash: string, discovered: DiscoveredModelsCacheEntry): VideoCandidate[] {
    const candidates: VideoCandidate[] = [];
    const seen = new Set<string>();

    const push = (kind: 'interaction' | 'veo', model: string) => {
        const clean = model.trim();
        if (!clean) return;
        const key = `${kind}:${clean}`;
        if (seen.has(key)) return;
        seen.add(key);
        candidates.push({ kind, model: clean });
    };

    const cachedWinner = workingVideoTargetByKey.get(keyHash);
    if (cachedWinner) {
        push(cachedWinner.kind, cachedWinner.model);
    }

    // Prioritize discovered Omni models, then curated Omni models
    for (const m of discovered.omniVideoModels) push('interaction', m);
    for (const m of FALLBACK_INTERACTION_VIDEO_MODELS) push('interaction', m);

    // Next prioritize discovered Veo models (newest / fast first), then curated Veo models
    const sortedDiscoveredVeo = [...discovered.veoModels].sort((a, b) => b.localeCompare(a));
    for (const m of sortedDiscoveredVeo) push('veo', m);
    for (const m of FALLBACK_VEO_VIDEO_MODELS) push('veo', m);

    return candidates;
}

function sanitizeHistory(rawHistory: unknown): Content[] {
    if (!Array.isArray(rawHistory)) return [];
    const cleaned: Content[] = [];
    for (const item of rawHistory.slice(-30)) {
        if (!item || typeof item !== 'object') continue;
        const role = (item as IncomingHistoryItem).role;
        const text = typeof (item as IncomingHistoryItem).text === 'string'
            ? (item as IncomingHistoryItem).text.trim()
            : '';
        if ((role !== 'user' && role !== 'model') || !text) continue;

        if (cleaned.length === 0 && role !== 'user') {
            continue;
        }
        const prev = cleaned[cleaned.length - 1];
        if (prev && prev.role === role) {
            const prevText = prev.parts?.[0]?.text || '';
            prev.parts = [{ text: `${prevText}\n\n${text}` }];
        } else {
            cleaned.push({ role, parts: [{ text }] });
        }
    }
    if (cleaned.length > 0 && cleaned[cleaned.length - 1].role === 'user') {
        cleaned.pop();
    }
    return cleaned;
}

function formatGeminiError(err: unknown): { status: number; message: string } {
    const statusCode = extractErrorStatus(err);
    const raw = getErrorText(err) || 'Unknown error';
    const lower = raw.toLowerCase();

    if (
        statusCode === 402 ||
        lower.includes('402') ||
        lower.includes('payment_required') ||
        lower.includes('prepay') ||
        lower.includes('credit balance')
    ) {
        return {
            status: 402,
            message: 'Video generation requires an active paid Gemini API key with billing / prepay credits available (HTTP 402). Please verify your Google AI Studio billing balance or Settings > Secrets.',
        };
    }
    if (
        statusCode === 401 ||
        statusCode === 403 ||
        lower.includes('api_key_invalid') ||
        lower.includes('permission_denied') ||
        lower.includes('403') ||
        lower.includes('401') ||
        lower.includes('billing') ||
        lower.includes('paid')
    ) {
        return {
            status: 403,
            message: 'Gemini API key is invalid, unauthorized, or requires a paid key for this feature. Please verify your GEMINI_API_KEY configuration.',
        };
    }
    if (statusCode === 429 || lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
        return {
            status: 429,
            message: 'Rate limit or quota exceeded. Please wait a moment and try again, or check your API key quota.',
        };
    }
    if (lower.includes('safety') || lower.includes('filtered') || lower.includes('rai')) {
        return {
            status: 400,
            message: 'The prompt or image was filtered by safety policies. Please try a different prompt or photo.',
        };
    }
    if (statusCode === 404 || lower.includes('not_found') || lower.includes('404') || lower.includes('is not found')) {
        return {
            status: 404,
            message: 'Video generation models are not enabled for this API key or region yet. Please verify your paid Google AI Studio key permissions.',
        };
    }
    if (statusCode === 504 || lower.includes('timeout') || lower.includes('aborted')) {
        return {
            status: 504,
            message: 'Generation timed out. Please try a shorter prompt or retry in a moment.',
        };
    }
    if (statusCode === 400) {
        return {
            status: 400,
            message: 'The request could not be processed with those parameters. Please try adjusting your prompt or image.',
        };
    }
    return {
        status: 500,
        message: 'Unable to reach Gemini right now. Please try again in a moment.',
    };
}

function supportsThinkingLevel(model: string): boolean {
    return model.startsWith('gemini-3') || model.startsWith('gemini-4');
}

async function createStreamWithRetry(
    ai: GoogleGenAI,
    model: string,
    systemInstruction: string,
    history: Content[],
    message: string
) {
    const maxAttempts = 2;
    let lastErr: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const chat = ai.chats.create({
                model,
                history,
                config: {
                    systemInstruction,
                    ...(supportsThinkingLevel(model)
                        ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
                        : {}),
                },
            });
            return await chat.sendMessageStream({ message });
        } catch (err) {
            lastErr = err;
            const status = (err as { status?: number })?.status;
            const isTransient = !status || status >= 500;
            if (!isTransient || attempt === maxAttempts) {
                throw err;
            }
            await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        }
    }
    throw lastErr;
}

async function resolveVideoPayload(
    interaction: any,
    apiKey: string
): Promise<{ videoBase64: string; mimeType: string } | null> {
    let videoContent = interaction?.output_video;

    if (!videoContent && Array.isArray(interaction?.outputs)) {
        for (let i = interaction.outputs.length - 1; i >= 0; i--) {
            const item = interaction.outputs[i];
            if (item?.type === 'video') {
                videoContent = item;
                break;
            }
        }
    }

    if (!videoContent) return null;

    const mimeType = typeof videoContent.mime_type === 'string' && videoContent.mime_type.trim()
        ? videoContent.mime_type.trim()
        : 'video/mp4';

    if (typeof videoContent.data === 'string' && videoContent.data.length > 0) {
        return { videoBase64: videoContent.data, mimeType };
    }

    if (typeof videoContent.uri === 'string' && videoContent.uri.startsWith('http')) {
        const dlRes = await fetch(videoContent.uri, {
            headers: { 'x-goog-api-key': apiKey },
            redirect: 'follow',
        });
        if (!dlRes.ok) {
            throw new Error(`Failed to fetch generated video asset (${dlRes.status})`);
        }
        const buf = Buffer.from(await dlRes.arrayBuffer());
        return { videoBase64: buf.toString('base64'), mimeType };
    }

    return null;
}

async function runVeoGeneration(
    ai: GoogleGenAI,
    apiKey: string,
    model: string,
    mode: 'text' | 'image',
    prompt: string,
    aspectRatio: string,
    cleanedImageData: string,
    imageMime: string
): Promise<{ videoBase64: string; mimeType: string } | null> {
    const startVeo = async (includeResolution: boolean) => {
        return ai.models.generateVideos({
            model,
            prompt,
            ...(mode === 'image'
                ? {
                      image: {
                          imageBytes: cleanedImageData,
                          mimeType: imageMime,
                      },
                  }
                : {}),
            config: {
                aspectRatio,
                numberOfVideos: 1,
                ...(includeResolution && model.startsWith('veo-3') ? { resolution: '720p' } : {}),
            },
        });
    };

    let operation;
    try {
        operation = await startVeo(true);
    } catch (err) {
        const msg = getErrorText(err).toLowerCase();
        if (msg.includes('resolution') && !isModelNotFoundError(err)) {
            operation = await startVeo(false);
        } else {
            throw err;
        }
    }

    const deadline = Date.now() + 260000;
    while (!operation.done) {
        if (Date.now() > deadline) {
            throw new Error('Video generation timed out while waiting for Veo operation completion.');
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation });
    }

    if (operation.error) {
        const opErr = operation.error as { message?: unknown };
        throw new Error(typeof opErr.message === 'string' ? opErr.message : JSON.stringify(operation.error));
    }

    const genVideo = operation.response?.generatedVideos?.[0]?.video;
    if (!genVideo) return null;

    const mimeType = typeof genVideo.mimeType === 'string' && genVideo.mimeType.trim()
        ? genVideo.mimeType.trim()
        : 'video/mp4';

    if (typeof genVideo.videoBytes === 'string' && genVideo.videoBytes.length > 0) {
        return { videoBase64: genVideo.videoBytes, mimeType };
    }

    if (typeof genVideo.uri === 'string' && genVideo.uri.startsWith('http')) {
        const dlRes = await fetch(genVideo.uri, {
            headers: { 'x-goog-api-key': apiKey },
            redirect: 'follow',
        });
        if (!dlRes.ok) {
            throw new Error(`Failed to download generated Veo video (${dlRes.status})`);
        }
        const buf = Buffer.from(await dlRes.arrayBuffer());
        return { videoBase64: buf.toString('base64'), mimeType };
    }

    return null;
}

async function startServer() {
    const app = express();
    app.use(express.json({ limit: '25mb' }));

    app.get('/api/gemini/capabilities', async (_req: Request, res: Response) => {
        const apiKey = getApiKey();
        const ai = getAiClient();
        if (!apiKey || !ai) {
            res.json({
                configured: false,
                omniVideoModels: [],
                veoModels: [],
                liveModels: [],
                chatModels: [],
            });
            return;
        }
        const keyHash = hashKey(apiKey);
        const discovered = await discoverModelsForKey(ai, keyHash);
        res.json({
            configured: true,
            omniVideoModels: discovered.omniVideoModels,
            veoModels: discovered.veoModels,
            liveModels: discovered.liveModels,
            chatModels: discovered.textModels.slice(0, 15),
            activeVideoWinner: workingVideoTargetByKey.get(keyHash) || null,
        });
    });

    app.post('/api/chat', async (req: Request, res: Response) => {
        const body = (req.body || {}) as ChatRequestBody;
        const message = typeof body.message === 'string' ? body.message.trim() : '';

        if (!message) {
            res.status(400).json({ error: 'Message is required.' });
            return;
        }
        if (message.length > 4000) {
            res.status(400).json({ error: 'Message is too long (max 4000 characters).' });
            return;
        }

        const apiKey = getApiKey();
        const ai = getAiClient();
        if (!ai || !apiKey) {
            res.status(503).json({
                error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in the Settings > Secrets panel.',
            });
            return;
        }

        const keyHash = hashKey(apiKey);
        const requestedModel = body.model && ALLOWED_CHAT_MODELS.has(body.model) ? body.model : 'gemini-4-hydrogen';
        const baseInstruction = ROLE_INSTRUCTIONS[body.role || 'guide'] || ROLE_INSTRUCTIONS.guide;
        const contextNote =
            typeof body.context === 'string' && body.context.trim()
                ? `\n\nCurrent live viewer context from the app:\n${body.context.trim().slice(0, 800)}`
                : '';
        const systemInstruction = `${baseInstruction}${contextNote}`;
        const history = sanitizeHistory(body.history);

        const cachedChat = workingChatModelByKey.get(keyHash);
        const candidateModels = Array.from(
            new Set([
                requestedModel,
                ...(cachedChat ? [cachedChat] : []),
                ...FALLBACK_CHAT_MODELS,
            ])
        );

        try {
            let stream: Awaited<ReturnType<typeof createStreamWithRetry>> | null = null;
            let lastErr: unknown;

            for (const candidateModel of candidateModels) {
                try {
                    stream = await createStreamWithRetry(ai, candidateModel, systemInstruction, history, message);
                    workingChatModelByKey.set(keyHash, candidateModel);
                    break;
                } catch (err) {
                    lastErr = err;
                    if (!isModelNotFoundError(err)) {
                        throw err;
                    }
                    console.warn(`Chat model '${candidateModel}' unavailable (404), trying next fallback...`);
                }
            }

            if (!stream) {
                throw lastErr || new Error('No supported Gemini chat model responded.');
            }

            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders?.();

            for await (const chunk of stream) {
                const c = chunk as GenerateContentResponse;
                const text = c.text || '';
                if (text) {
                    res.write(`data: ${JSON.stringify({ text })}\n\n`);
                }
            }

            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        } catch (err) {
            console.error('Gemini /api/chat error:', err);
            const formatted = formatGeminiError(err);
            if (!res.headersSent) {
                res.status(formatted.status).json({ error: formatted.message });
            } else {
                res.write(`data: ${JSON.stringify({ error: formatted.message })}\n\n`);
                res.end();
            }
        }
    });

    app.post('/api/video/generate', async (req: Request, res: Response) => {
        const body = (req.body || {}) as VideoGenerateRequestBody;
        const mode = body.mode === 'image' ? 'image' : 'text';
        const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
        const aspectRatio = body.aspectRatio && ALLOWED_VIDEO_RATIOS.has(body.aspectRatio)
            ? body.aspectRatio
            : '16:9';

        if (!prompt) {
            res.status(400).json({ error: 'A video prompt is required.' });
            return;
        }
        if (prompt.length > 2000) {
            res.status(400).json({ error: 'Prompt is too long (max 2000 characters).' });
            return;
        }

        let cleanedImageData = '';
        let imageMime = 'image/jpeg';
        if (mode === 'image') {
            imageMime = typeof body.mimeType === 'string' ? body.mimeType.trim() : '';
            if (!ALLOWED_IMAGE_MIMES.has(imageMime)) {
                res.status(400).json({ error: 'Please upload a valid JPEG, PNG, or WebP photo.' });
                return;
            }
            const rawBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
            cleanedImageData = rawBase64.replace(/^data:[^;]+;base64,/, '');
            if (!cleanedImageData || cleanedImageData.length < 32) {
                res.status(400).json({ error: 'Uploaded image data is empty or invalid.' });
                return;
            }
            if (cleanedImageData.length > 20 * 1024 * 1024) {
                res.status(400).json({ error: 'Uploaded photo is too large (max ~15MB).' });
                return;
            }
        }

        const apiKey = getApiKey();
        const ai = getAiClient();
        if (!ai || !apiKey) {
            res.status(503).json({
                error: 'Gemini API key is not configured. Please confirm a paid API key in AI Studio.',
            });
            return;
        }

        const keyHash = hashKey(apiKey);
        const discovered = await discoverModelsForKey(ai, keyHash);
        const candidates = buildVideoCandidates(keyHash, discovered);

        const inputPayload =
            mode === 'image'
                ? [
                      {
                          type: 'image' as const,
                          mime_type: imageMime,
                          data: cleanedImageData,
                      },
                      {
                          type: 'text' as const,
                          text: prompt,
                      },
                  ]
                : prompt;

        let lastErr: unknown = null;

        for (const candidate of candidates) {
            try {
                let resolved: { videoBase64: string; mimeType: string } | null = null;

                if (candidate.kind === 'interaction') {
                    const runOmni = async (includeExtras: boolean) =>
                        ai.interactions.create(
                            {
                                model: candidate.model,
                                input: inputPayload as any,
                                background: false,
                                store: false,
                                stream: false,
                                response_format: {
                                    type: 'video',
                                    aspect_ratio: aspectRatio,
                                    ...(includeExtras ? { duration: '5s', resolution: '720p' } : {}),
                                } as any,
                            },
                            { timeout: 300000 }
                        );

                    let interaction;
                    try {
                        interaction = await runOmni(true);
                    } catch (omniErr) {
                        const omniMsg = getErrorText(omniErr).toLowerCase();
                        if (
                            !isModelNotFoundError(omniErr) &&
                            (omniMsg.includes('duration') || omniMsg.includes('resolution'))
                        ) {
                            interaction = await runOmni(false);
                        } else {
                            throw omniErr;
                        }
                    }
                    resolved = await resolveVideoPayload(interaction, apiKey);
                } else {
                    resolved = await runVeoGeneration(
                        ai,
                        apiKey,
                        candidate.model,
                        mode,
                        prompt,
                        aspectRatio,
                        cleanedImageData,
                        imageMime
                    );
                }

                if (!resolved) {
                    lastErr = new Error(`Model '${candidate.model}' returned no video output.`);
                    continue;
                }

                workingVideoTargetByKey.set(keyHash, candidate);
                res.json({
                    videoBase64: resolved.videoBase64,
                    mimeType: resolved.mimeType,
                    aspectRatio,
                    mode,
                    model: candidate.model,
                });
                return;
            } catch (err) {
                lastErr = err;
                if (isModelNotFoundError(err)) {
                    console.warn(
                        `Video candidate '${candidate.model}' (${candidate.kind}) unavailable (404), trying next model...`
                    );
                    if (workingVideoTargetByKey.get(keyHash)?.model === candidate.model) {
                        workingVideoTargetByKey.delete(keyHash);
                    }
                    continue;
                }

                const formatted = formatGeminiError(err);
                if (formatted.status >= 500) {
                    console.error(`Gemini /api/video/generate error (${candidate.model}):`, err);
                } else {
                    console.warn(`Gemini /api/video/generate (${candidate.model}) status ${formatted.status}: ${formatted.message}`);
                }
                res.status(formatted.status).json({ error: formatted.message });
                return;
            }
        }

        console.error('Gemini /api/video/generate error: all video candidates failed.', lastErr);
        const formatted = formatGeminiError(lastErr);
        res.status(formatted.status).json({ error: formatted.message });
    });

    if (process.env.NODE_ENV !== 'production') {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    } else {
        const distDir = path.resolve(__dirname, 'dist');
        app.use(express.static(distDir));
        app.get('/{*splat}', (_req: Request, res: Response) => {
            res.sendFile(path.join(distDir, 'index.html'));
        });
    }

    const httpServer = http.createServer(app);
    const wss = new WebSocketServer({ server: httpServer, path: '/live' });

    wss.on('connection', async (clientWs: WebSocket, req: http.IncomingMessage) => {
        const apiKey = getApiKey();
        const ai = getAiClient();
        if (!ai || !apiKey) {
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(
                    JSON.stringify({
                        type: 'error',
                        error: 'Gemini API key is not configured for live voice conversations.',
                    })
                );
                clientWs.close(1008, 'Missing API key');
            }
            return;
        }

        const keyHash = hashKey(apiKey);
        let role = 'guide';
        let voiceName = 'Zephyr';
        let contextText = '';
        try {
            const reqUrl = new URL(req.url || '/live', 'http://localhost');
            const qRole = reqUrl.searchParams.get('role') || 'guide';
            const qVoice = reqUrl.searchParams.get('voice') || 'Zephyr';
            const qContext = reqUrl.searchParams.get('context') || '';
            if (LIVE_VOICE_INSTRUCTIONS[qRole]) role = qRole;
            if (ALLOWED_LIVE_VOICES.has(qVoice)) voiceName = qVoice;
            if (qContext) contextText = qContext.slice(0, 600);
        } catch {
            // Keep safe defaults
        }

        const systemInstruction = contextText
            ? `${LIVE_VOICE_INSTRUCTIONS[role]}\n\nCurrent viewer context:\n${contextText}`
            : LIVE_VOICE_INSTRUCTIONS[role];

        const discovered = await discoverModelsForKey(ai, keyHash);
        const cachedLive = workingLiveModelByKey.get(keyHash);
        const liveCandidates = Array.from(
            new Set([
                ...(cachedLive ? [cachedLive] : []),
                ...FALLBACK_LIVE_MODELS,
                ...discovered.liveModels,
            ])
        );

        let session: Awaited<ReturnType<typeof ai.live.connect>> | null = null;
        let isClosed = false;
        let candidateIndex = 0;

        const connectLiveCandidate = async () => {
            if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;
            if (session) {
                try {
                    session.close();
                } catch {
                    // ignore old session cleanup error
                }
                session = null;
            }
            const liveModel = liveCandidates[candidateIndex];
            if (!liveModel) {
                clientWs.send(
                    JSON.stringify({
                        type: 'error',
                        error: 'No Gemini Live audio model is available for this API key.',
                    })
                );
                clientWs.close(1011, 'No live model available');
                return;
            }

            let sawLiveActivity = false;
            let didFallback = false;

            try {
                session = await ai.live.connect({
                    model: liveModel,
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName,
                                },
                            },
                        },
                        inputAudioTranscription: {},
                        outputAudioTranscription: {},
                        systemInstruction,
                    },
                    callbacks: {
                        onopen: () => {
                            if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
                                clientWs.send(JSON.stringify({ type: 'ready', voiceName, role, model: liveModel }));
                            }
                        },
                        onmessage: (msg: any) => {
                            if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;
                            sawLiveActivity = true;
                            workingLiveModelByKey.set(keyHash, liveModel);

                            const content = msg?.serverContent;
                            if (content?.interrupted) {
                                clientWs.send(JSON.stringify({ type: 'interrupted' }));
                            }

                            if (content?.inputTranscription?.text) {
                                clientWs.send(
                                    JSON.stringify({
                                        type: 'input_transcript',
                                        text: content.inputTranscription.text,
                                    })
                                );
                            }

                            if (content?.outputTranscription?.text) {
                                clientWs.send(
                                    JSON.stringify({
                                        type: 'output_transcript',
                                        text: content.outputTranscription.text,
                                    })
                                );
                            }

                            const parts = content?.modelTurn?.parts;
                            if (Array.isArray(parts)) {
                                for (const part of parts) {
                                    const audioData = part?.inlineData?.data;
                                    if (audioData) {
                                        clientWs.send(
                                            JSON.stringify({
                                                type: 'audio',
                                                data: audioData,
                                                mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                                            })
                                        );
                                    }
                                }
                            }

                            if (content?.turnComplete) {
                                clientWs.send(JSON.stringify({ type: 'turn_complete' }));
                            }
                        },
                        onerror: (err: unknown) => {
                            console.error(`Gemini Live session error (${liveModel}):`, err);
                            if (!sawLiveActivity && isModelNotFoundError(err) && candidateIndex + 1 < liveCandidates.length) {
                                didFallback = true;
                                candidateIndex++;
                                void connectLiveCandidate();
                                return;
                            }
                            if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
                                const formatted = formatGeminiError(err);
                                clientWs.send(JSON.stringify({ type: 'error', error: formatted.message }));
                            }
                        },
                        onclose: (closeEvt: any) => {
                            if (didFallback || isClosed) return;
                            const reason = String(closeEvt?.reason || '').toLowerCase();
                            if (
                                !sawLiveActivity &&
                                (reason.includes('not found') || reason.includes('not supported') || reason.includes('404')) &&
                                candidateIndex + 1 < liveCandidates.length
                            ) {
                                didFallback = true;
                                candidateIndex++;
                                void connectLiveCandidate();
                                return;
                            }
                            if (clientWs.readyState === WebSocket.OPEN) {
                                clientWs.send(JSON.stringify({ type: 'closed' }));
                                clientWs.close();
                            }
                        },
                    },
                });
            } catch (err) {
                console.error(`Failed to open Gemini Live session (${liveModel}):`, err);
                if (isModelNotFoundError(err) && candidateIndex + 1 < liveCandidates.length) {
                    candidateIndex++;
                    await connectLiveCandidate();
                    return;
                }
                if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
                    const formatted = formatGeminiError(err);
                    clientWs.send(JSON.stringify({ type: 'error', error: formatted.message }));
                    clientWs.close(1011, 'Live connection failed');
                }
            }
        };

        await connectLiveCandidate();

        clientWs.on('message', (raw: Buffer | string) => {
            if (!session || isClosed) return;
            try {
                const textStr = typeof raw === 'string' ? raw : raw.toString('utf8');
                const parsed = JSON.parse(textStr) as { type?: string; data?: string; text?: string };

                if (parsed.type === 'audio' && typeof parsed.data === 'string' && parsed.data.length > 0) {
                    session.sendRealtimeInput({
                        audio: {
                            data: parsed.data,
                            mimeType: 'audio/pcm;rate=16000',
                        },
                    });
                } else if (parsed.type === 'text' && typeof parsed.text === 'string' && parsed.text.trim()) {
                    session.sendClientContent({
                        turns: [{ role: 'user', parts: [{ text: parsed.text.trim().slice(0, 1200) }] }],
                        turnComplete: true,
                    });
                }
            } catch {
                // Ignore malformed client frames cleanly
            }
        });

        clientWs.on('close', () => {
            isClosed = true;
            try {
                session?.close();
            } catch {
                // Ignore close cleanup errors
            }
            session = null;
        });

        clientWs.on('error', () => {
            isClosed = true;
            try {
                session?.close();
            } catch {
                // Ignore close cleanup errors
            }
            session = null;
        });
    });

    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
}

startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
