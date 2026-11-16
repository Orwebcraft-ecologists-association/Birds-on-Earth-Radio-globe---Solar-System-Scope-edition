import type { User } from 'firebase/auth';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type { RadioStation, StationSubmission, TreeSighting, VideoAspectRatio, VideoCreationRecord, VideoMode } from '../types';

const ID_PATTERN = /^[a-zA-Z0-9_\-]+$/;
const URL_PATTERN = /^https?:\/\/.+/;

const sanitizeId = (raw: string, fallbackPrefix = 'id'): string => {
    const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
    if (cleaned.length > 0 && ID_PATTERN.test(cleaned)) {
        return cleaned;
    }
    return `${fallbackPrefix}_${Date.now()}`;
};

const clampStr = (val: string | undefined | null, maxLen: number, fallback = ''): string => {
    const trimmed = (val ?? '').trim();
    if (!trimmed) return fallback;
    return trimmed.slice(0, maxLen);
};

const clampUrl = (val: string | undefined | null, fallback: string): string => {
    const trimmed = (val ?? '').trim().slice(0, 500);
    return URL_PATTERN.test(trimmed) ? trimmed : fallback;
};

const clampCoord = (val: number, min: number, max: number): number => {
    if (typeof val !== 'number' || Number.isNaN(val)) return 0;
    return Math.max(min, Math.min(max, val));
};

export const syncUserProfile = async (user: User): Promise<void> => {
    if (!user.emailVerified || !user.email) return;
    const uid = sanitizeId(user.uid, 'user');
    const path = `users/${uid}/private/profile`;
    const profileRef = doc(db, 'users', uid, 'private', 'profile');

    try {
        const existingSnap = await getDoc(profileRef);
        const displayName = clampStr(user.displayName || user.email.split('@')[0], 120, 'Explorer');
        const email = clampStr(user.email, 254);
        const photoURL = user.photoURL && URL_PATTERN.test(user.photoURL) ? user.photoURL.slice(0, 500) : undefined;

        const payload: Record<string, unknown> = {
            uid,
            email,
            displayName,
            updatedAt: serverTimestamp(),
        };
        if (photoURL) {
            payload.photoURL = photoURL;
        }

        if (existingSnap.exists()) {
            const existingData = existingSnap.data();
            payload.createdAt = existingData.createdAt;
            await setDoc(profileRef, payload);
        } else {
            payload.createdAt = serverTimestamp();
            await setDoc(profileRef, payload);
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
    }
};

export const subscribeUserFavorites = (
    uid: string,
    onUpdate: (stations: RadioStation[]) => void
): (() => void) => {
    const safeUid = sanitizeId(uid, 'user');
    const path = `users/${safeUid}/favorites`;
    const q = query(collection(db, 'users', safeUid, 'favorites'), where('ownerId', '==', safeUid));

    return onSnapshot(
        q,
        (snapshot) => {
            const stations: RadioStation[] = snapshot.docs.map((docSnap) => {
                const d = docSnap.data();
                return {
                    stationuuid: String(d.stationuuid || docSnap.id),
                    name: String(d.name || 'Saved Station'),
                    url_resolved: String(d.url_resolved || ''),
                    country: String(d.country || 'Unknown'),
                    state: String(d.state || ''),
                    tags: String(d.tags || 'various'),
                    geo_lat: Number(d.geo_lat ?? 0),
                    geo_long: Number(d.geo_long ?? 0),
                    bitrate: Number(d.bitrate ?? 128),
                };
            });
            onUpdate(stations);
        },
        (error) => {
            handleFirestoreError(error, OperationType.LIST, path);
        }
    );
};

export const addFavoriteStationToFirestore = async (uid: string, station: RadioStation): Promise<void> => {
    const safeUid = sanitizeId(uid, 'user');
    const stationId = sanitizeId(station.stationuuid, 'station');
    const path = `users/${safeUid}/favorites/${stationId}`;

    try {
        await setDoc(doc(db, 'users', safeUid, 'favorites', stationId), {
            stationuuid: stationId,
            ownerId: safeUid,
            name: clampStr(station.name, 120, 'Radio Station'),
            url_resolved: clampUrl(station.url_resolved, 'https://example.com/stream'),
            country: clampStr(station.country, 100, 'Global'),
            state: clampStr(station.state, 100, ''),
            tags: clampStr(station.tags, 200, 'radio'),
            geo_lat: clampCoord(station.geo_lat, -90, 90),
            geo_long: clampCoord(station.geo_long, -180, 180),
            bitrate: Math.max(0, Math.min(10000, Number(station.bitrate) || 128)),
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
};

export const removeFavoriteStationFromFirestore = async (uid: string, stationuuid: string): Promise<void> => {
    const safeUid = sanitizeId(uid, 'user');
    const stationId = sanitizeId(stationuuid, 'station');
    const path = `users/${safeUid}/favorites/${stationId}`;

    try {
        await deleteDoc(doc(db, 'users', safeUid, 'favorites', stationId));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
};

export const submitStationToFirestore = async (uid: string, submission: StationSubmission): Promise<void> => {
    const safeUid = sanitizeId(uid, 'user');
    const stationId = sanitizeId(`sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, 'station');
    const path = `submittedStations/${stationId}`;

    try {
        await setDoc(doc(db, 'submittedStations', stationId), {
            stationId,
            ownerId: safeUid,
            name: clampStr(submission.name, 120, 'Submitted Station'),
            url_resolved: clampUrl(submission.url_resolved, 'https://example.com/stream'),
            country: clampStr(submission.country, 100, 'Global'),
            state: clampStr(submission.state, 100, ''),
            tags: clampStr(submission.tags, 200, 'community'),
            geo_lat: clampCoord(submission.geo_lat ?? 0, -90, 90),
            geo_long: clampCoord(submission.geo_long ?? 0, -180, 180),
            bitrate: 128,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
};

export const subscribeSubmittedStations = (
    uid: string | null,
    onUpdate: (stations: RadioStation[]) => void
): (() => void) => {
    const approvedMap = new Map<string, RadioStation>();
    const ownMap = new Map<string, RadioStation>();

    const emitMerged = () => {
        const combined = new Map<string, RadioStation>(approvedMap);
        ownMap.forEach((v, k) => combined.set(k, v));
        onUpdate(Array.from(combined.values()));
    };

    const mapDocToStation = (docSnap: any): RadioStation => {
        const d = docSnap.data();
        return {
            stationuuid: String(d.stationId || docSnap.id),
            name: String(d.name || 'Community Station'),
            url_resolved: String(d.url_resolved || ''),
            country: String(d.country || 'Global'),
            state: String(d.state || ''),
            tags: String(d.tags || 'community'),
            geo_lat: Number(d.geo_lat ?? 0),
            geo_long: Number(d.geo_long ?? 0),
            bitrate: Number(d.bitrate ?? 128),
        };
    };

    const approvedQuery = query(collection(db, 'submittedStations'), where('status', '==', 'approved'));
    const unsubApproved = onSnapshot(
        approvedQuery,
        (snapshot) => {
            approvedMap.clear();
            snapshot.docs.forEach((docSnap) => {
                approvedMap.set(docSnap.id, mapDocToStation(docSnap));
            });
            emitMerged();
        },
        (error) => {
            handleFirestoreError(error, OperationType.LIST, 'submittedStations');
        }
    );

    let unsubOwn: (() => void) | null = null;
    if (uid) {
        const safeUid = sanitizeId(uid, 'user');
        const ownQuery = query(collection(db, 'submittedStations'), where('ownerId', '==', safeUid));
        unsubOwn = onSnapshot(
            ownQuery,
            (snapshot) => {
                ownMap.clear();
                snapshot.docs.forEach((docSnap) => {
                    ownMap.set(docSnap.id, mapDocToStation(docSnap));
                });
                emitMerged();
            },
            (error) => {
                handleFirestoreError(error, OperationType.LIST, 'submittedStations');
            }
        );
    }

    return () => {
        unsubApproved();
        if (unsubOwn) unsubOwn();
    };
};

export const submitTreeObservationToFirestore = async (
    uid: string,
    data: { common_name: string; scientific_name: string; imageUrl: string; lat: number; lon: number }
): Promise<void> => {
    const safeUid = sanitizeId(uid, 'user');
    const observationId = sanitizeId(`tree_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, 'tree');
    const path = `treeObservations/${observationId}`;

    try {
        await setDoc(doc(db, 'treeObservations', observationId), {
            observationId,
            ownerId: safeUid,
            common_name: clampStr(data.common_name, 120, 'Observed Tree Specimen'),
            scientific_name: clampStr(data.scientific_name, 120, 'Plantae'),
            imageUrl: clampUrl(data.imageUrl, 'https://placehold.co/80x80/065f46/FFFFFF?text=Tree'),
            lat: clampCoord(data.lat, -90, 90),
            lon: clampCoord(data.lon, -180, 180),
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
};

export const subscribeTreeObservations = (
    uid: string | null,
    onUpdate: (trees: TreeSighting[]) => void
): (() => void) => {
    const approvedMap = new Map<string, TreeSighting>();
    const ownMap = new Map<string, TreeSighting>();

    const emitMerged = () => {
        const combined = new Map<string, TreeSighting>(approvedMap);
        ownMap.forEach((v, k) => combined.set(k, v));
        onUpdate(Array.from(combined.values()));
    };

    const mapDocToTree = (docSnap: any, idx: number): TreeSighting => {
        const d = docSnap.data();
        const createdMillis = d.createdAt?.toMillis ? d.createdAt.toMillis() : Date.now() - idx;
        return {
            id: createdMillis,
            lat: Number(d.lat ?? 0),
            lon: Number(d.lon ?? 0),
            common_name: String(d.common_name || 'Observed Tree'),
            scientific_name: String(d.scientific_name || 'Plantae'),
            imageUrl: String(d.imageUrl || 'https://placehold.co/80x80/065f46/FFFFFF?text=Tree'),
            createdAt: createdMillis,
        };
    };

    const approvedQuery = query(collection(db, 'treeObservations'), where('status', '==', 'approved'));
    const unsubApproved = onSnapshot(
        approvedQuery,
        (snapshot) => {
            approvedMap.clear();
            snapshot.docs.forEach((docSnap, idx) => {
                approvedMap.set(docSnap.id, mapDocToTree(docSnap, idx));
            });
            emitMerged();
        },
        (error) => {
            handleFirestoreError(error, OperationType.LIST, 'treeObservations');
        }
    );

    let unsubOwn: (() => void) | null = null;
    if (uid) {
        const safeUid = sanitizeId(uid, 'user');
        const ownQuery = query(collection(db, 'treeObservations'), where('ownerId', '==', safeUid));
        unsubOwn = onSnapshot(
            ownQuery,
            (snapshot) => {
                ownMap.clear();
                snapshot.docs.forEach((docSnap, idx) => {
                    ownMap.set(docSnap.id, mapDocToTree(docSnap, idx));
                });
                emitMerged();
            },
            (error) => {
                handleFirestoreError(error, OperationType.LIST, 'treeObservations');
            }
        );
    }

    return () => {
        unsubApproved();
        if (unsubOwn) unsubOwn();
    };
};

export const saveVideoCreationMetadata = async (
    uid: string,
    data: { mode: VideoMode; prompt: string; aspectRatio: VideoAspectRatio }
): Promise<void> => {
    const safeUid = sanitizeId(uid, 'user');
    const creationId = sanitizeId(`vid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, 'vid');
    const path = `users/${safeUid}/videoCreations/${creationId}`;

    try {
        await setDoc(doc(db, 'users', safeUid, 'videoCreations', creationId), {
            creationId,
            ownerId: safeUid,
            mode: data.mode === 'image' ? 'image' : 'text',
            prompt: clampStr(data.prompt, 1000, 'Cosmic Earth scene'),
            aspectRatio: data.aspectRatio === '9:16' ? '9:16' : '16:9',
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
};

export const subscribeUserVideoCreations = (
    uid: string,
    onUpdate: (items: VideoCreationRecord[]) => void
): (() => void) => {
    const safeUid = sanitizeId(uid, 'user');
    const path = `users/${safeUid}/videoCreations`;
    const q = query(collection(db, 'users', safeUid, 'videoCreations'), where('ownerId', '==', safeUid));

    return onSnapshot(
        q,
        (snapshot) => {
            const items: VideoCreationRecord[] = snapshot.docs.map((docSnap, idx) => {
                const d = docSnap.data();
                return {
                    creationId: String(d.creationId || docSnap.id),
                    mode: d.mode === 'image' ? 'image' : 'text',
                    prompt: String(d.prompt || ''),
                    aspectRatio: d.aspectRatio === '9:16' ? '9:16' : '16:9',
                    createdAtMs: d.createdAt?.toMillis ? d.createdAt.toMillis() : Date.now() - idx,
                };
            });
            items.sort((a, b) => b.createdAtMs - a.createdAtMs);
            onUpdate(items);
        },
        (error) => {
            handleFirestoreError(error, OperationType.LIST, path);
        }
    );
};

export const deleteVideoCreationMetadata = async (uid: string, creationId: string): Promise<void> => {
    const safeUid = sanitizeId(uid, 'user');
    const safeId = sanitizeId(creationId, 'vid');
    const path = `users/${safeUid}/videoCreations/${safeId}`;
    try {
        await deleteDoc(doc(db, 'users', safeUid, 'videoCreations', safeId));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
};
