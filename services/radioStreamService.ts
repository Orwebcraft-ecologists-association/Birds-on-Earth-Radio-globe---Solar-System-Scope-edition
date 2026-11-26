import type { Request, Response } from 'express';
import dns from 'node:dns/promises';
import net from 'node:net';
import { Readable } from 'node:stream';

const RADIO_BROWSER_SERVERS = [
    'de1.api.radio-browser.info',
    'nl1.api.radio-browser.info',
    'fr1.api.radio-browser.info',
    'at1.api.radio-browser.info',
];

const USER_AGENT = 'BirdsOnEarthRadio/1.0 (+https://radio-browser.info)';
const RESOLVE_CACHE_TTL_MS = 20 * 60 * 1000;
const MAX_PLAYLIST_BYTES = 512 * 1024;
const PROBE_TIMEOUT_MS = 4500;

export interface ResolvedStreamResult {
    candidates: string[];
    repairedUrl: string | null;
    source: 'direct' | 'proxy' | 'repaired' | 'relay' | 'none';
    relayName?: string;
}

interface CacheEntry {
    expiresAt: number;
    result: ResolvedStreamResult;
}

const resolvedStreamCache = new Map<string, CacheEntry>();

function isPrivateOrReservedIpv4(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
        return true;
    }
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true; // 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 0 && parts[2] === 0) return true; // 192.0.0.0/24
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
    if (a >= 224) return true; // Multicast & reserved
    return false;
}

function isPrivateOrReservedIp(rawIp: string): boolean {
    const ip = rawIp.trim().toLowerCase().split('%')[0];
    if (net.isIPv4(ip)) {
        return isPrivateOrReservedIpv4(ip);
    }
    if (!net.isIPv6(ip)) {
        return true;
    }
    if (ip === '::' || ip === '::1') return true;
    if (ip.startsWith('::ffff:')) {
        const mapped = ip.slice('::ffff:'.length);
        if (net.isIPv4(mapped)) {
            return isPrivateOrReservedIpv4(mapped);
        }
    }
    // fc00::/7 (ULA), fe80::/10 (link-local), ff00::/8 (multicast)
    if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb') || ip.startsWith('ff')) {
        return true;
    }
    return false;
}

export async function validatePublicStreamUrl(rawUrl: string): Promise<URL> {
    if (typeof rawUrl !== 'string' || !rawUrl.trim() || rawUrl.length > 2048) {
        throw new Error('Invalid stream URL');
    }
    let parsed: URL;
    try {
        parsed = new URL(rawUrl.trim());
    } catch {
        throw new Error('Malformed stream URL');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Unsupported URL scheme');
    }
    if (parsed.username || parsed.password) {
        throw new Error('URL credentials are not allowed');
    }

    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
        !hostname ||
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.localdomain') ||
        hostname === 'metadata.google.internal'
    ) {
        throw new Error('Blocked internal hostname');
    }

    if (net.isIP(hostname)) {
        if (isPrivateOrReservedIp(hostname)) {
            throw new Error('Blocked private IP target');
        }
        return parsed;
    }

    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
        throw new Error('Host resolution returned no records');
    }
    for (const rec of records) {
        if (isPrivateOrReservedIp(rec.address)) {
            throw new Error('Blocked private resolved IP');
        }
    }

    return parsed;
}

async function safeFetch(
    rawUrl: string,
    init: RequestInit = {},
    maxRedirects = 5
): Promise<{ response: globalThis.Response; finalUrl: string }> {
    let currentUrl = rawUrl;
    for (let hop = 0; hop <= maxRedirects; hop++) {
        const validated = await validatePublicStreamUrl(currentUrl);
        const headers = new Headers(init.headers || {});
        if (!headers.has('User-Agent')) headers.set('User-Agent', USER_AGENT);

        const res = await fetch(validated.toString(), {
            ...init,
            headers,
            redirect: 'manual',
        });

        if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get('location');
            try {
                await res.body?.cancel();
            } catch {
                // ignore body cancel error
            }
            if (!loc) {
                throw new Error(`Redirect (${res.status}) missing location`);
            }
            currentUrl = new URL(loc, validated).toString();
            continue;
        }

        return { response: res, finalUrl: validated.toString() };
    }
    throw new Error('Too many redirects');
}

function isWrapperPlaylistUrl(url: string, contentType: string): boolean {
    const lowerUrl = url.split('?')[0].toLowerCase();
    const lowerCt = contentType.toLowerCase();
    if (lowerUrl.endsWith('.pls') || lowerUrl.endsWith('.m3u') || lowerUrl.endsWith('.xspf') || lowerUrl.endsWith('.asx')) {
        return true;
    }
    if (
        lowerCt.includes('scpls') ||
        lowerCt.includes('pls+xml') ||
        lowerCt.includes('xspf') ||
        lowerCt.includes('ms-asf')
    ) {
        return true;
    }
    return false;
}

function isHlsMimeOrUrl(url: string, contentType: string): boolean {
    const lowerUrl = url.toLowerCase();
    const lowerCt = contentType.toLowerCase();
    return (
        /\.m3u8(\?|$)/i.test(lowerUrl) ||
        lowerUrl.includes('/playlist.m3u8') ||
        lowerCt.includes('mpegurl') ||
        lowerCt.includes('vnd.apple.mpegurl')
    );
}

function extractUrlsFromPlaylistText(text: string, baseUrl: string): string[] {
    const urls: string[] = [];
    const seen = new Set<string>();
    const add = (candidate: string) => {
        const cleaned = candidate.trim().replace(/^["']|["']$/g, '');
        if (!cleaned || cleaned.startsWith('#')) return;
        try {
            const resolved = new URL(cleaned, baseUrl);
            if ((resolved.protocol === 'http:' || resolved.protocol === 'https:') && !seen.has(resolved.toString())) {
                seen.add(resolved.toString());
                urls.push(resolved.toString());
            }
        } catch {
            // ignore invalid line
        }
    };

    // PLS FileN=...
    const plsMatches = text.matchAll(/^File\d+\s*=\s*(.+)$/gim);
    for (const m of plsMatches) {
        if (m[1]) add(m[1]);
    }
    // XSPF <location>...</location> or ASX href="..."
    const tagMatches = text.matchAll(/(?:<location>([^<]+)<\/location>|href\s*=\s*["']([^"']+)["'])/gim);
    for (const m of tagMatches) {
        add(m[1] || m[2] || '');
    }
    // Line-by-line URLs (M3U / plain list)
    for (const line of text.split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith('#') || t.startsWith('<') || t.startsWith('[')) continue;
        if (/^https?:\/\//i.test(t) || /\.(mp3|aac|aacp|ogg|opus|m3u8)(\?|$)/i.test(t)) {
            add(t);
        }
    }
    return urls;
}

async function readLimitedText(res: globalThis.Response, maxBytes = MAX_PLAYLIST_BYTES): Promise<string> {
    if (!res.body) return '';
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
                total += value.byteLength;
                if (total > maxBytes) {
                    chunks.push(value.subarray(0, value.byteLength - (total - maxBytes)));
                    break;
                }
                chunks.push(value);
            }
        }
    } finally {
        try {
            await reader.cancel();
        } catch {
            // ignore
        }
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

interface ProbeOutcome {
    ok: boolean;
    directUrl?: string;
    proxyTargetUrl?: string;
    isHls: boolean;
    requiresProxy: boolean;
}

async function probeStreamCandidate(rawUrl: string, depth = 0): Promise<ProbeOutcome> {
    if (depth > 2) return { ok: false, isHls: false, requiresProxy: false };

    const lowerPath = rawUrl.split('?')[0].toLowerCase();
    // HTML5 <audio> cannot decode RTMP or Flash FLV streams directly
    if (lowerPath.endsWith('.flv') || rawUrl.toLowerCase().startsWith('rtmp')) {
        return { ok: false, isHls: false, requiresProxy: false };
    }

    try {
        const { response, finalUrl } = await safeFetch(rawUrl, {
            method: 'GET',
            headers: {
                'Icy-MetaData': '0',
                Accept: '*/*',
            },
            signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        });

        if (!response.ok) {
            await response.body?.cancel().catch(() => {});
            return { ok: false, isHls: false, requiresProxy: false };
        }

        const ct = (response.headers.get('content-type') || '').toLowerCase();
        const acao = (response.headers.get('access-control-allow-origin') || '').trim();
        const isHttpOnly = finalUrl.startsWith('http://');

        if (ct.includes('text/html') || ct.includes('application/json') || ct.includes('image/')) {
            await response.body?.cancel().catch(() => {});
            return { ok: false, isHls: false, requiresProxy: false };
        }

        const maybePlaylist =
            isWrapperPlaylistUrl(finalUrl, ct) ||
            isHlsMimeOrUrl(finalUrl, ct) ||
            ct.includes('text/plain');

        if (maybePlaylist) {
            const text = await readLimitedText(response, MAX_PLAYLIST_BYTES);
            const trimmed = text.trim();
            if (trimmed.includes('#EXTM3U') && (trimmed.includes('#EXT-X-') || trimmed.toLowerCase().includes('.ts') || trimmed.toLowerCase().includes('.aac') || trimmed.toLowerCase().includes('.m4s'))) {
                const corsOk = acao === '*';
                return {
                    ok: true,
                    directUrl: !isHttpOnly && corsOk ? finalUrl : undefined,
                    proxyTargetUrl: finalUrl,
                    isHls: true,
                    requiresProxy: isHttpOnly || !corsOk,
                };
            }

            const innerUrls = extractUrlsFromPlaylistText(trimmed, finalUrl);
            for (const inner of innerUrls.slice(0, 3)) {
                const sub = await probeStreamCandidate(inner, depth + 1);
                if (sub.ok) return sub;
            }
            return { ok: false, isHls: false, requiresProxy: false };
        }

        // Verify at least 1 audio byte arrives so stalled sockets aren't marked healthy
        let gotBytes = false;
        if (response.body) {
            const reader = response.body.getReader();
            try {
                const chunk = await reader.read();
                gotBytes = !chunk.done && Boolean(chunk.value && chunk.value.byteLength > 0);
            } finally {
                await reader.cancel().catch(() => {});
            }
        }

        const looksAudio =
            ct.startsWith('audio/') ||
            ct.includes('ogg') ||
            ct.includes('opus') ||
            ct.includes('aac') ||
            ct.includes('mpeg') ||
            ct.includes('mp4') ||
            ct.includes('octet-stream') ||
            ct.includes('mp2t') ||
            ct === '';

        if (!looksAudio || !gotBytes) {
            return { ok: false, isHls: false, requiresProxy: false };
        }

        return {
            ok: true,
            directUrl: isHttpOnly ? undefined : finalUrl,
            proxyTargetUrl: finalUrl,
            isHls: false,
            requiresProxy: isHttpOnly,
        };
    } catch {
        return { ok: false, isHls: false, requiresProxy: false };
    }
}

function buildProxyUrl(targetUrl: string): string {
    return `/api/radio/proxy?url=${encodeURIComponent(targetUrl)}`;
}

function expandKnownPatterns(url: string): string[] {
    const out: string[] = [];
    const trimmed = url.trim();
    if (!trimmed) return out;
    // Radio Paradise FLAC-in-Ogg isn't natively supported across all mobile/Chromium builds; add AAC/MP3 mirrors
    if (trimmed.includes('stream.radioparadise.com/flacm')) {
        out.push('https://stream.radioparadise.com/aac-320');
        out.push('https://stream.radioparadise.com/mp3-192');
    }
    // SomaFM rotates across ice1..ice6 mirrors
    const somaMatch = trimmed.match(/^https?:\/\/ice\d+\.somafm\.com\/(.+)$/i);
    if (somaMatch && somaMatch[1]) {
        for (const host of ['ice4.somafm.com', 'ice6.somafm.com', 'ice1.somafm.com', 'ice5.somafm.com']) {
            out.push(`https://${host}/${somaMatch[1]}`);
        }
    }
    if (trimmed.startsWith('http://')) {
        out.push('https://' + trimmed.slice('http://'.length));
    }
    out.push(trimmed);
    return out;
}

interface RadioBrowserStation {
    stationuuid?: string;
    name?: string;
    url_resolved?: string;
    url?: string;
    country?: string;
    votes?: number;
    lastcheckok?: number;
}

async function queryRadioBrowser(pathAndQuery: string): Promise<RadioBrowserStation[]> {
    for (const host of RADIO_BROWSER_SERVERS) {
        try {
            const res = await fetch(`https://${host}${pathAndQuery}`, {
                headers: { 'User-Agent': USER_AGENT },
                signal: AbortSignal.timeout(2500),
            });
            if (!res.ok) continue;
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return data as RadioBrowserStation[];
            }
        } catch {
            // Try next Radio-Browser mirror
        }
    }
    return [];
}

function normalizeStationName(name: string): string {
    return name
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function fetchFreshUrlsForStation(stationuuid?: string, name?: string, country?: string): Promise<string[]> {
    const urls: string[] = [];
    const add = (u?: string) => {
        if (typeof u === 'string' && /^https?:\/\//i.test(u.trim()) && !urls.includes(u.trim())) {
            urls.push(u.trim());
        }
    };

    if (stationuuid && /^[a-z0-9-]{8,64}$/i.test(stationuuid)) {
        const byUuid = await queryRadioBrowser(`/json/stations/byuuid/${encodeURIComponent(stationuuid)}`);
        for (const s of byUuid) {
            add(s.url_resolved);
            add(s.url);
        }
    }

    const cleanName = normalizeStationName(name || '');
    const searchTerms = [cleanName];
    if (name && name.includes(':')) {
        const afterColon = normalizeStationName(name.split(':').slice(1).join(' '));
        if (afterColon.length >= 3 && !searchTerms.includes(afterColon)) {
            searchTerms.push(afterColon);
        }
    }

    for (const term of searchTerms) {
        if (term.length < 2) continue;
        const byName = await queryRadioBrowser(
            `/json/stations/byname/${encodeURIComponent(term)}?limit=12&order=votes&reverse=true&hidebroken=true`
        );
        const sorted = [...byName].sort((a, b) => {
            const aCountry = country && a.country?.toLowerCase() === country.toLowerCase() ? 1 : 0;
            const bCountry = country && b.country?.toLowerCase() === country.toLowerCase() ? 1 : 0;
            if (aCountry !== bCountry) return bCountry - aCountry;
            const aOk = a.lastcheckok === 1 ? 1 : 0;
            const bOk = b.lastcheckok === 1 ? 1 : 0;
            if (aOk !== bOk) return bOk - aOk;
            return (b.votes || 0) - (a.votes || 0);
        });
        for (const s of sorted.slice(0, 8)) {
            add(s.url_resolved);
            add(s.url);
        }
        if (urls.length > 0) break;
    }

    return urls;
}

async function fetchLiveRelayFallback(country?: string): Promise<{ name: string; urls: string[] } | null> {
    const queries: string[] = [];
    if (country && country.trim()) {
        queries.push(
            `/json/stations/bycountryexact/${encodeURIComponent(country.trim())}?limit=12&order=votes&reverse=true&hidebroken=true`
        );
    }
    queries.push('/json/stations/topvote/12?hidebroken=true');

    for (const q of queries) {
        const list = await queryRadioBrowser(q);
        const healthy = list.filter((s) => s.lastcheckok === 1 && (s.url_resolved || s.url));
        for (const station of healthy.slice(0, 5)) {
            const raw = (station.url_resolved || station.url || '').trim();
            if (!raw) continue;
            const probe = await probeStreamCandidate(raw);
            if (probe.ok) {
                const candidates: string[] = [];
                if (probe.directUrl) candidates.push(probe.directUrl);
                if (probe.proxyTargetUrl) candidates.push(buildProxyUrl(probe.proxyTargetUrl));
                if (candidates.length > 0) {
                    return {
                        name: station.name || `${country || 'Global'} Live Relay`,
                        urls: candidates,
                    };
                }
            }
        }
    }
    return null;
}

function collectProbeResults(outcomes: ProbeOutcome[]): { candidates: string[]; repairedUrl: string | null; usesProxyOnly: boolean } {
    const direct: string[] = [];
    const proxied: string[] = [];
    for (const o of outcomes) {
        if (!o.ok) continue;
        if (o.directUrl && !o.requiresProxy && !direct.includes(o.directUrl)) {
            direct.push(o.directUrl);
        }
        if (o.proxyTargetUrl) {
            const px = buildProxyUrl(o.proxyTargetUrl);
            if (!proxied.includes(px)) proxied.push(px);
        }
    }
    const candidates = [...direct, ...proxied];
    return {
        candidates,
        repairedUrl: direct[0] || proxied[0] || null,
        usesProxyOnly: direct.length === 0 && proxied.length > 0,
    };
}

export async function resolveStationStreams(params: {
    stationuuid?: string;
    name?: string;
    country?: string;
    candidateUrls?: string[];
    forceRefresh?: boolean;
}): Promise<ResolvedStreamResult> {
    const cacheKey = `${params.stationuuid || ''}|${(params.candidateUrls || [])[0] || ''}`;
    if (!params.forceRefresh) {
        const cached = resolvedStreamCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.result;
        }
    }

    const rawInputs = Array.isArray(params.candidateUrls) ? params.candidateUrls : [];
    const expandedInitial = Array.from(new Set(rawInputs.flatMap(expandKnownPatterns))).slice(0, 8);

    // Phase 1: Probe supplied candidate URLs (parallel, fast)
    const initialProbes = await Promise.all(expandedInitial.map((u) => probeStreamCandidate(u)));
    const initialCollected = collectProbeResults(initialProbes);
    if (initialCollected.candidates.length > 0) {
        const result: ResolvedStreamResult = {
            candidates: initialCollected.candidates,
            repairedUrl: initialCollected.repairedUrl,
            source: initialCollected.usesProxyOnly ? 'proxy' : 'direct',
        };
        resolvedStreamCache.set(cacheKey, { expiresAt: Date.now() + RESOLVE_CACHE_TTL_MS, result });
        return result;
    }

    // Phase 2: Query live radio-browser.info mirrors by UUID & station name to repair stale URLs
    const discoveredRaw = await fetchFreshUrlsForStation(params.stationuuid, params.name, params.country);
    const seenInitial = new Set(expandedInitial);
    const freshToProbe = Array.from(new Set(discoveredRaw.flatMap(expandKnownPatterns)))
        .filter((u) => !seenInitial.has(u))
        .slice(0, 8);

    if (freshToProbe.length > 0) {
        const freshProbes = await Promise.all(freshToProbe.map((u) => probeStreamCandidate(u)));
        const freshCollected = collectProbeResults(freshProbes);
        if (freshCollected.candidates.length > 0) {
            const result: ResolvedStreamResult = {
                candidates: freshCollected.candidates,
                repairedUrl: freshCollected.repairedUrl,
                source: 'repaired',
            };
            resolvedStreamCache.set(cacheKey, { expiresAt: Date.now() + RESOLVE_CACHE_TTL_MS, result });
            return result;
        }
    }

    // Phase 3: Verified live backup relay so playback autonomously succeeds immediately instead of waiting on dead URLs
    const relay = await fetchLiveRelayFallback(params.country);
    if (relay) {
        const result: ResolvedStreamResult = {
            candidates: relay.urls,
            repairedUrl: relay.urls[0],
            source: 'relay',
            relayName: relay.name,
        };
        resolvedStreamCache.set(cacheKey, { expiresAt: Date.now() + RESOLVE_CACHE_TTL_MS, result });
        return result;
    }

    // Phase 4: Only if even live relay discovery fails (e.g. offline mirror), proxy original HTML5-compatible URLs
    const emergencyProxyCandidates: string[] = [];
    for (const raw of rawInputs) {
        try {
            const valid = await validatePublicStreamUrl(raw);
            const pathOnly = valid.pathname.toLowerCase();
            if (!isWrapperPlaylistUrl(valid.toString(), '') && !pathOnly.endsWith('.flv')) {
                emergencyProxyCandidates.push(buildProxyUrl(valid.toString()));
            }
        } catch {
            // ignore invalid URL
        }
    }

    if (emergencyProxyCandidates.length > 0) {
        return {
            candidates: emergencyProxyCandidates,
            repairedUrl: emergencyProxyCandidates[0],
            source: 'proxy',
        };
    }

    return { candidates: [], repairedUrl: null, source: 'none' };
}

function rewriteHlsManifest(manifest: string, manifestUrl: string): string {
    const rewriteUri = (raw: string): string => {
        try {
            const abs = new URL(raw.trim(), manifestUrl);
            if (abs.protocol === 'http:' || abs.protocol === 'https:') {
                return buildProxyUrl(abs.toString());
            }
        } catch {
            // keep original if unparseable
        }
        return raw;
    };

    return manifest
        .split(/\r?\n/)
        .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            if (trimmed.startsWith('#')) {
                return line.replace(/URI="([^"]+)"/gi, (_m, uri) => `URI="${rewriteUri(uri)}"`);
            }
            return rewriteUri(trimmed);
        })
        .join('\n');
}

export async function handleRadioProxy(req: Request, res: Response): Promise<void> {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!rawUrl) {
        res.status(400).json({ error: 'Missing url parameter' });
        return;
    }

    const abortController = new AbortController();
    const onClientClose = () => abortController.abort();
    req.on('close', onClientClose);

    try {
        const headers: Record<string, string> = {
            'User-Agent': USER_AGENT,
            'Icy-MetaData': '0',
            Accept: '*/*',
        };

        const { response, finalUrl } = await safeFetch(rawUrl, {
            method: 'GET',
            headers,
            signal: abortController.signal,
        });

        if (!response.ok) {
            await response.body?.cancel().catch(() => {});
            res.status(response.status).end();
            return;
        }

        const ct = (response.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('text/html') || ct.includes('application/javascript') || ct.includes('image/') || ct.includes('application/json')) {
            await response.body?.cancel().catch(() => {});
            res.status(415).json({ error: 'Upstream URL did not serve audio or playlist media' });
            return;
        }

        if (isHlsMimeOrUrl(finalUrl, ct)) {
            const manifestText = await readLimitedText(response, MAX_PLAYLIST_BYTES);
            const rewritten = rewriteHlsManifest(manifestText, finalUrl);
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.status(200).send(rewritten);
            return;
        }

        const outContentType =
            ct && !ct.includes('text/plain')
                ? response.headers.get('content-type')!
                : /\.aac/i.test(finalUrl)
                ? 'audio/aac'
                : /\.ogg|\.opus/i.test(finalUrl)
                ? 'audio/ogg'
                : /\.ts(\?|$)/i.test(finalUrl)
                ? 'video/mp2t'
                : /\.m4s(\?|$)/i.test(finalUrl)
                ? 'video/iso.segment'
                : 'audio/mpeg';

        res.status(response.status);
        res.setHeader('Content-Type', outContentType);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Accept-Ranges', 'none');

        if (!response.body) {
            res.end();
            return;
        }

        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.on('error', () => {
            if (!res.headersSent) res.status(502);
            res.end();
        });
        req.on('close', () => {
            nodeStream.destroy();
        });
        nodeStream.pipe(res);
    } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : 'Stream proxy error';
        const status = msg.startsWith('Blocked') || msg.startsWith('Invalid') || msg.startsWith('Malformed') || msg.startsWith('Unsupported')
            ? 400
            : 502;
        if (!res.headersSent) {
            res.status(status).json({ error: msg });
        } else {
            res.end();
        }
    } finally {
        req.off('close', onClientClose);
    }
}
