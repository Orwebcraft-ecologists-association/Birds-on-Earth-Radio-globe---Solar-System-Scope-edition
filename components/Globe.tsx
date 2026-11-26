import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { allNamedStars } from '../services/constellationData';
import {
    createEarthTextures,
    createOrbitalObservatorySatellite,
    createPlanetTextures,
    createSaturnRingTexture,
    createStarSpriteTexture,
    createSurfaceMarkerGroup,
} from '../services/threeProcedural';
import type {
    PointData,
    InfoPanelData,
    WeatherPreset,
    CelestialTarget,
    RadioPointData,
    CelestialPointData,
    TimescapeConfig,
    CameraViewPreset,
} from '../types';

export const planetsMetadata = [
    {
        name: 'Mercury',
        ra: 1.5,
        dec: 7,
        color: 0xa6a39e,
        orbitRadius: 150,
        speed: 4.1,
        radius: 4.5,
        info: 'Smallest inner world, scorched cratered silicate crust.',
    },
    {
        name: 'Venus',
        ra: 3.2,
        dec: 18,
        color: 0xe3bb76,
        orbitRadius: 250,
        speed: 1.6,
        radius: 6.2,
        info: 'Dense sulfuric cloud deck with runaway greenhouse heat.',
    },
    {
        name: 'Mars',
        ra: 5.8,
        dec: 24,
        color: 0xd95b38,
        orbitRadius: 500,
        speed: 0.53,
        radius: 5.2,
        info: 'Iron-oxide desert world with polar ice caps and shield volcanoes.',
    },
    {
        name: 'Jupiter',
        ra: 10.4,
        dec: 12,
        color: 0xe2be8e,
        orbitRadius: 750,
        speed: 0.08,
        radius: 13.5,
        info: 'Gas giant sculpted by counter-flowing equatorial cloud belts.',
    },
    {
        name: 'Saturn',
        ra: 14.1,
        dec: -10,
        color: 0xead6b8,
        orbitRadius: 1000,
        speed: 0.03,
        radius: 11.2,
        info: 'Ringed gas giant encircled by Cassini-divided ice bands.',
    },
    {
        name: 'Uranus',
        ra: 18.7,
        dec: -23,
        color: 0x99d9e6,
        orbitRadius: 1250,
        speed: 0.01,
        radius: 8.2,
        info: 'Ice giant rotating on an extreme axial tilt.',
    },
    {
        name: 'Neptune',
        ra: 22.3,
        dec: -12,
        color: 0x4573e6,
        orbitRadius: 1500,
        speed: 0.006,
        radius: 8.0,
        info: 'Deep-blue ice world swept by supersonic methane winds.',
    },
];

const EARTH_ORBIT_RADIUS = 375;
const EARTH_ORBITAL_SPEED = 1.0;
const MOON_ORBIT_RADIUS = 13.5;
const SATELLITE_ORBIT_RADIUS = 7.4;

const SPECTRAL_COLORS: { [key: string]: string } = {
    O: '#9bb0ff',
    B: '#aabfff',
    A: '#cad7ff',
    F: '#f8f7ff',
    G: '#fff4ea',
    K: '#ffd2a1',
    M: '#ffcc6f',
    Unknown: '#ffffff',
};

interface GlobeProps {
    radioPoints: PointData[];
    birdPoints: PointData[];
    treePoints: PointData[];
    inatPoints: PointData[];
    userLocationPoint: PointData | null;
    onHover: (data: InfoPanelData | null, position?: { x: number; y: number }) => void;
    onExpiredBirdIds: (ids: number[]) => void;
    onStationClick: (station: RadioPointData) => void;
    onPointClick?: (point: PointData) => void;
    currentStation: any;
    isSoundscapeMode: boolean;
    weatherPreset: WeatherPreset;
    sunIntensity: number;
    sunOrbitSpeed: number;
    starRotationSpeed: number;
    flyToTarget: { lat: number; lon: number; ts?: number } | null;
    celestialFlyToTarget?: CelestialTarget | null;
    cameraViewPreset?: CameraViewPreset;
    brokenStationIds: Set<string>;
    onGlobeBackgroundClick: () => void;
    isLocationPickerMode: boolean;
    onLocationPick: (coords: { lat: number; lon: number }) => void;
    isTreeLocationPickerMode: boolean;
    onTreeLocationPick: (coords: { lat: number; lon: number }) => void;
    timescape: TimescapeConfig;
}

interface ThreeObjectRef {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    globeGroup: THREE.Group;
    clouds: THREE.Mesh;
    satellite: THREE.Group;
    starfield: THREE.Group;
    asteroidBelt: THREE.InstancedMesh;
    sun: THREE.Group;
    moon: THREE.Mesh;
    sunLight: THREE.PointLight;
    keyDirLight: THREE.DirectionalLight;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    pointMeshes: Map<string | number, THREE.Group>;
    celestialMeshes: { group: THREE.Group; metadata: (typeof planetsMetadata)[number]; initialAngle: number }[];
    interactiveStars: THREE.Group[];
    activePointers: Map<number, PointerEvent>;
    isDragging: boolean;
    pointerDownPos: { x: number; y: number };
    previousMouse: { x: number; y: number };
    dragVelocity: { x: number; y: number };
    lastPinchDistance: number | null;
    animationFrameId?: number;
    targetZoom: number;
    currentZoom: number;
    cameraElevation: number;
    targetElevation: number;
    moonOrbitGroup: THREE.Group;
    orbitPaths: THREE.Group;
    isSoftwareGl: boolean;
    viewPreset: CameraViewPreset;
}

const GLOBE_RADIUS = 5;
const CELESTIAL_RADIUS = 250000;
const MIN_ZOOM = 9.5;
const MAX_ZOOM = 220000;

// Module-level pre-allocated scratch vectors (zero allocations inside rAF)
const _scratchOrigin = new THREE.Vector3(0, 0, 0);
const _scratchEarthPos = new THREE.Vector3();
const _scratchViewTarget = new THREE.Vector3();
const _scratchCameraOffset = new THREE.Vector3();
const _scratchSunDir = new THREE.Vector3();
const _scratchSatPos = new THREE.Vector3();
const _scratchUp = new THREE.Vector3(0, 1, 0);
const _scratchNormal = new THREE.Vector3();
const _scratchSurfacePos = new THREE.Vector3();
const _scratchQuat = new THREE.Quaternion();

const latLonToVector3 = (lat: number, lon: number, r: number, h: number, out = new THREE.Vector3()): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 90) * (Math.PI / 180);
    return out.set(
        -((r + h) * Math.sin(phi) * Math.cos(theta)),
        (r + h) * Math.cos(phi),
        (r + h) * Math.sin(phi) * Math.sin(theta)
    );
};

const raDecToVector3 = (ra: number, dec: number, r: number): THREE.Vector3 => {
    const phi = ra * 15 * (Math.PI / 180);
    const theta = (90 - dec) * (Math.PI / 180);
    return new THREE.Vector3(
        r * Math.sin(theta) * Math.cos(phi),
        r * Math.cos(theta),
        r * Math.sin(theta) * Math.sin(phi)
    );
};

function createSafeWebGLRenderer(): THREE.WebGLRenderer | null {
    const canvas = document.createElement('canvas');

    const attempts: THREE.WebGLRendererParameters[] = [
        { canvas, antialias: true, powerPreference: 'default', failIfMajorPerformanceCaveat: false },
        { canvas, antialias: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false },
    ];

    for (const opts of attempts) {
        try {
            const renderer = new THREE.WebGLRenderer(opts);
            if (renderer.getContext()) {
                return renderer;
            }
            renderer.dispose();
        } catch {
            // Try next safe fallback
        }
    }

    try {
        const legacyCtx =
            canvas.getContext('webgl2', { antialias: false, failIfMajorPerformanceCaveat: false }) ||
            canvas.getContext('webgl', { antialias: false, failIfMajorPerformanceCaveat: false });
        if (legacyCtx) {
            return new THREE.WebGLRenderer({ canvas, context: legacyCtx, antialias: false });
        }
    } catch {
        // Browser has blocked WebGL for this session
    }

    return null;
}

const Fallback2DGlobe: React.FC<{
    radioPoints: PointData[];
    birdPoints: PointData[];
    treePoints: PointData[];
    inatPoints: PointData[];
    onHover: (data: InfoPanelData | null, position?: { x: number; y: number }) => void;
    onStationClick: (station: RadioPointData) => void;
    onPointClick?: (point: PointData) => void;
    flyToTarget: { lat: number; lon: number; ts?: number } | null;
    webglReason: 'blocked' | 'lost';
}> = ({
    radioPoints,
    birdPoints,
    treePoints,
    inatPoints,
    onHover,
    onStationClick,
    onPointClick,
    flyToTarget,
    webglReason,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rotRef = useRef({ lat: 24, lon: 15, zoom: 1 });
    const dragRef = useRef<{ active: boolean; x: number; y: number; downX: number; downY: number }>({
        active: false,
        x: 0,
        y: 0,
        downX: 0,
        downY: 0,
    });
    const projectedRef = useRef<{ x: number; y: number; point: PointData }[]>([]);

    useEffect(() => {
        if (flyToTarget) {
            rotRef.current.lat = flyToTarget.lat;
            rotRef.current.lon = flyToTarget.lon;
        }
    }, [flyToTarget]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId = 0;
        let lastTime = performance.now();

        const draw = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = Math.max(1, Math.floor(rect.width * dpr));
            const h = Math.max(1, Math.floor(rect.height * dpr));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }

            const now = performance.now();
            const dt = Math.min(0.1, (now - lastTime) * 0.001);
            lastTime = now;
            if (!dragRef.current.active) {
                rotRef.current.lon += dt * 4.2;
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const vw = rect.width;
            const vh = rect.height;

            // Deep space background
            ctx.fillStyle = '#040711';
            ctx.fillRect(0, 0, vw, vh);

            const cx = vw * 0.5;
            const cy = vh * 0.5;
            const r = Math.min(vw, vh) * 0.31 * rotRef.current.zoom;

            // Atmospheric halo
            const halo = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.25);
            halo.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
            halo.addColorStop(1, 'rgba(4, 7, 17, 0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 1.25, 0, Math.PI * 2);
            ctx.fill();

            // Lit Earth disc
            const sphereGrad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.3, r * 0.12, cx, cy, r);
            sphereGrad.addColorStop(0, '#2563eb');
            sphereGrad.addColorStop(0.55, '#0f2d64');
            sphereGrad.addColorStop(1, '#061129');
            ctx.fillStyle = sphereGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(96, 165, 250, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Graticule meridians / parallels
            const lat0 = (rotRef.current.lat * Math.PI) / 180;
            const lon0 = (rotRef.current.lon * Math.PI) / 180;
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
            ctx.lineWidth = 1;
            for (let latDeg = -60; latDeg <= 60; latDeg += 30) {
                const phi = (latDeg * Math.PI) / 180;
                ctx.beginPath();
                let started = false;
                for (let lonDeg = -180; lonDeg <= 180; lonDeg += 10) {
                    const lam = (lonDeg * Math.PI) / 180;
                    const cosC = Math.sin(lat0) * Math.sin(phi) + Math.cos(lat0) * Math.cos(phi) * Math.cos(lam - lon0);
                    if (cosC > 0) {
                        const px = cx + r * Math.cos(phi) * Math.sin(lam - lon0);
                        const py = cy - r * (Math.cos(lat0) * Math.sin(phi) - Math.sin(lat0) * Math.cos(phi) * Math.cos(lam - lon0));
                        if (!started) {
                            ctx.moveTo(px, py);
                            started = true;
                        } else {
                            ctx.lineTo(px, py);
                        }
                    } else {
                        started = false;
                    }
                }
                ctx.stroke();
            }

            // Projected surface markers
            const allPts = [...radioPoints, ...birdPoints, ...treePoints, ...inatPoints];
            const projected: { x: number; y: number; point: PointData }[] = [];
            for (const p of allPts) {
                const phi = (p.lat * Math.PI) / 180;
                const lam = (p.lon * Math.PI) / 180;
                const cosC = Math.sin(lat0) * Math.sin(phi) + Math.cos(lat0) * Math.cos(phi) * Math.cos(lam - lon0);
                if (cosC <= 0) continue;

                const px = cx + r * Math.cos(phi) * Math.sin(lam - lon0);
                const py = cy - r * (Math.cos(lat0) * Math.sin(phi) - Math.sin(lat0) * Math.cos(phi) * Math.cos(lam - lon0));
                projected.push({ x: px, y: py, point: p });

                ctx.fillStyle =
                    p.type === 'radio'
                        ? '#60a5fa'
                        : p.type === 'bird'
                        ? '#f87171'
                        : p.type === 'tree'
                        ? '#34d399'
                        : '#22d3ee';
                ctx.beginPath();
                ctx.arc(px, py, p.type === 'radio' ? 4 : 3.2, 0, Math.PI * 2);
                ctx.fill();
            }
            projectedRef.current = projected;

            animId = window.setTimeout(() => requestAnimationFrame(draw), 40);
        };

        animId = window.setTimeout(() => requestAnimationFrame(draw), 0);
        return () => clearTimeout(animId);
    }, [radioPoints, birdPoints, treePoints, inatPoints]);

    const findNearest = (clientX: number, clientY: number) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        let best: PointData | null = null;
        let bestDist = 144;
        for (const item of projectedRef.current) {
            const dx = item.x - x;
            const dy = item.y - y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestDist) {
                bestDist = d2;
                best = item.point;
            }
        }
        return best;
    };

    return (
        <div className="absolute inset-0 bg-[#040711]">
            <canvas
                ref={canvasRef}
                className="w-full h-full block cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                    dragRef.current = {
                        active: true,
                        x: e.clientX,
                        y: e.clientY,
                        downX: e.clientX,
                        downY: e.clientY,
                    };
                }}
                onPointerMove={(e) => {
                    if (dragRef.current.active) {
                        const dx = e.clientX - dragRef.current.x;
                        const dy = e.clientY - dragRef.current.y;
                        rotRef.current.lon -= dx * 0.35;
                        rotRef.current.lat = Math.max(-80, Math.min(80, rotRef.current.lat + dy * 0.35));
                        dragRef.current.x = e.clientX;
                        dragRef.current.y = e.clientY;
                        return;
                    }
                    const hit = findNearest(e.clientX, e.clientY);
                    onHover(hit as InfoPanelData | null, hit ? { x: e.clientX, y: e.clientY } : undefined);
                }}
                onPointerUp={(e) => {
                    const dist = Math.hypot(e.clientX - dragRef.current.downX, e.clientY - dragRef.current.downY);
                    dragRef.current.active = false;
                    if (dist < 6) {
                        const hit = findNearest(e.clientX, e.clientY);
                        if (hit?.type === 'radio') {
                            onStationClick(hit as RadioPointData);
                        } else if (hit) {
                            onPointClick?.(hit);
                        }
                    }
                }}
                onWheel={(e) => {
                    rotRef.current.zoom = Math.max(0.55, Math.min(2.4, rotRef.current.zoom * (e.deltaY > 0 ? 0.92 : 1.08)));
                }}
            />
            <div className="fixed top-24 left-5 z-[75] max-w-[calc(100vw-2.5rem)] px-3.5 py-2 rounded-xl bg-slate-950/95 border border-amber-500/40 text-[10px] font-bold text-amber-200 flex flex-wrap items-center gap-2.5 shadow-2xl pointer-events-auto">
                <span>
                    {webglReason === 'lost'
                        ? 'WebGL context paused • 2D Projection active'
                        : '2D Tactical Globe active (browser paused 3D WebGL)'}
                </span>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/45 text-amber-100 uppercase text-[9px] font-black cursor-pointer transition-colors"
                >
                    Restore 3D
                </button>
            </div>
        </div>
    );
};

export const Globe: React.FC<GlobeProps> = (props) => {
    const {
        radioPoints,
        birdPoints,
        treePoints,
        inatPoints,
        onHover,
        sunIntensity,
        starRotationSpeed,
        flyToTarget,
        celestialFlyToTarget,
        cameraViewPreset = 'earth',
        onStationClick,
        onPointClick,
        isLocationPickerMode,
        onLocationPick,
        isTreeLocationPickerMode,
        onTreeLocationPick,
        timescape,
    } = props;

    const canvasMountRef = useRef<HTMLDivElement>(null);
    const threeObjectsRef = useRef<ThreeObjectRef | null>(null);
    const timescapeRef = useRef(timescape);
    const starRotationSpeedRef = useRef(starRotationSpeed);
    const sunIntensityRef = useRef(sunIntensity);
    const onHoverRef = useRef(onHover);
    const onStationClickRef = useRef(onStationClick);
    const onPointClickRef = useRef(onPointClick);
    const locationPickerRef = useRef({ isLocationPickerMode, onLocationPick, isTreeLocationPickerMode, onTreeLocationPick });
    const [astrometryTarget, setAstrometryTarget] = useState<CelestialPointData | null>(null);
    const [webglStatus, setWebglStatus] = useState<'ready' | 'lost' | 'unavailable'>('ready');

    useEffect(() => { timescapeRef.current = timescape; }, [timescape]);
    useEffect(() => { starRotationSpeedRef.current = starRotationSpeed; }, [starRotationSpeed]);
    useEffect(() => { sunIntensityRef.current = sunIntensity; }, [sunIntensity]);
    useEffect(() => { onHoverRef.current = onHover; }, [onHover]);
    useEffect(() => { onStationClickRef.current = onStationClick; }, [onStationClick]);
    useEffect(() => { onPointClickRef.current = onPointClick; }, [onPointClick]);
    useEffect(() => {
        locationPickerRef.current = { isLocationPickerMode, onLocationPick, isTreeLocationPickerMode, onTreeLocationPick };
    }, [isLocationPickerMode, onLocationPick, isTreeLocationPickerMode, onTreeLocationPick]);

    useEffect(() => {
        if (!canvasMountRef.current || threeObjectsRef.current) return;
        const container = canvasMountRef.current;

        const renderer = createSafeWebGLRenderer();
        if (!renderer) {
            console.warn('WebGL context could not be created; activating interactive 2D Globe fallback.');
            setWebglStatus('unavailable');
            return;
        }

        setWebglStatus('ready');
        const width = Math.max(1, container.clientWidth);
        const height = Math.max(1, container.clientHeight);

        const scene = new THREE.Scene();
        const spaceBg = new THREE.Color(0x040711);
        scene.background = spaceBg;
        scene.fog = new THREE.FogExp2(0x040711, 0.000018);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1500000);
        camera.position.set(0, 0, 26);

        // Probe software WebGL directly from the active context (no extra throwaway probe contexts)
        const gl = renderer.getContext();
        const dbg = gl.getExtension('WEBGL_DEBUG_RENDERER_INFO');
        const gpuRenderer = dbg
            ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
            : String(gl.getParameter(gl.RENDERER) || '');
        const isSoftwareGl = /swiftshader|llvmpipe|softpipe|mesa|software|basic render/i.test(gpuRenderer);

        renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = !isSoftwareGl;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Track disposable scene-owned resources cleanly on unmount
        const ownedTextures: THREE.Texture[] = [];
        const ownedGeometries: THREE.BufferGeometry[] = [];
        const ownedMaterials: THREE.Material[] = [];

        // Procedural Studio / Cosmic IBL reflection environment (zero external HDR URL)
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        const roomEnv = new RoomEnvironment();
        const envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
        scene.environment = envRenderTarget.texture;
        scene.environmentIntensity = 0.45;
        roomEnv.dispose();
        pmremGenerator.dispose();

        // 3-point Solar + Cosmic Hemisphere lighting rig
        const hemiFill = new THREE.HemisphereLight(0x88b4ff, 0x0b1120, 0.65);
        scene.add(hemiFill);

        const sunLight = new THREE.PointLight(0xffe7bd, sunIntensity, 0, 0);
        sunLight.position.set(0, 0, 0);
        scene.add(sunLight);

        const keyDirLight = new THREE.DirectionalLight(0xfff4df, Math.max(1.2, sunIntensity * 0.72));
        keyDirLight.castShadow = !isSoftwareGl;
        if (!isSoftwareGl) {
            keyDirLight.shadow.mapSize.set(1024, 1024);
            keyDirLight.shadow.camera.left = -12;
            keyDirLight.shadow.camera.right = 12;
            keyDirLight.shadow.camera.top = 12;
            keyDirLight.shadow.camera.bottom = -12;
            keyDirLight.shadow.camera.near = 2;
            keyDirLight.shadow.camera.far = 70;
            keyDirLight.shadow.bias = -0.0004;
            keyDirLight.shadow.normalBias = 0.02;
        }
        scene.add(keyDirLight);
        scene.add(keyDirLight.target);

        const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

        // Multi-part Earth Assembly
        const globeGroup = new THREE.Group();
        scene.add(globeGroup);

        const earthTextures = createEarthTextures(maxAnisotropy);
        ownedTextures.push(
            earthTextures.albedo,
            earthTextures.roughness,
            earthTextures.bump,
            earthTextures.nightLights,
            earthTextures.clouds
        );

        const globeMaterial = new THREE.MeshStandardMaterial({
            map: earthTextures.albedo,
            roughnessMap: earthTextures.roughness,
            bumpMap: earthTextures.bump,
            bumpScale: 0.075,
            emissiveMap: earthTextures.nightLights,
            emissive: new THREE.Color(0xffcf88),
            emissiveIntensity: 0.75,
            roughness: 0.85,
            metalness: 0.08,
        });
        const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, isSoftwareGl ? 56 : 72, isSoftwareGl ? 40 : 56);
        ownedGeometries.push(globeGeo);
        ownedMaterials.push(globeMaterial);

        const globe = new THREE.Mesh(globeGeo, globeMaterial);
        globe.receiveShadow = !isSoftwareGl;
        globe.castShadow = !isSoftwareGl;
        globeGroup.add(globe);

        const cloudGeo = new THREE.SphereGeometry(GLOBE_RADIUS + 0.085, 48, 36);
        const cloudMat = new THREE.MeshStandardMaterial({
            map: earthTextures.clouds,
            transparent: true,
            opacity: 0.42,
            depthWrite: false,
            roughness: 0.9,
            metalness: 0.0,
        });
        ownedGeometries.push(cloudGeo);
        ownedMaterials.push(cloudMat);
        const clouds = new THREE.Mesh(cloudGeo, cloudMat);
        globeGroup.add(clouds);

        // Fresnel Atmospheric Rim Shell
        const atmoMat = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vViewPos;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                    vViewPos = -mvPos.xyz;
                    gl_Position = projectionMatrix * mvPos;
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                varying vec3 vViewPos;
                void main() {
                    vec3 viewDir = normalize(vViewPos);
                    float fresnel = pow(1.0 - max(0.0, dot(viewDir, vNormal)), 3.2);
                    gl_FragColor = vec4(0.28, 0.64, 1.0, fresnel * 0.48);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
        });
        const atmoGeo = new THREE.SphereGeometry(GLOBE_RADIUS + 0.34, 48, 36);
        ownedGeometries.push(atmoGeo);
        ownedMaterials.push(atmoMat);
        globeGroup.add(new THREE.Mesh(atmoGeo, atmoMat));

        // Equatorial telemetry ring
        const equatGeo = new THREE.TorusGeometry(GLOBE_RADIUS + 0.68, 0.014, 8, 72);
        const equatMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.22 });
        ownedGeometries.push(equatGeo);
        ownedMaterials.push(equatMat);
        const equatRing = new THREE.Mesh(equatGeo, equatMat);
        equatRing.rotation.x = Math.PI / 2;
        globeGroup.add(equatRing);

        // Composite Orbital Observatory Satellite
        const satellite = createOrbitalObservatorySatellite(maxAnisotropy, !isSoftwareGl);
        satellite.position.set(SATELLITE_ORBIT_RADIUS, 1.4, 0);
        scene.add(satellite);

        // Balanced Starfield & Nebula Clouds (GPU-friendly density to avoid TDR context loss)
        const starfieldGroup = new THREE.Group();
        scene.add(starfieldGroup);

        const starTex = createStarSpriteTexture(64, false);
        const nebulaTex = createStarSpriteTexture(64, true);
        ownedTextures.push(starTex, nebulaTex);

        const addStars = (count: number, rMin: number, rMax: number, size: number, opacity: number, color: THREE.Color) => {
            const posArr = new Float32Array(count * 3);
            const colorArr = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                const r = rMin + Math.random() * (rMax - rMin);
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                posArr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
                posArr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                posArr[i * 3 + 2] = r * Math.cos(phi);
                const mul = 0.78 + Math.random() * 0.42;
                colorArr[i * 3] = Math.min(1, color.r * mul);
                colorArr[i * 3 + 1] = Math.min(1, color.g * mul);
                colorArr[i * 3 + 2] = Math.min(1, color.b * mul);
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
            const mat = new THREE.PointsMaterial({
                size,
                map: starTex,
                transparent: true,
                opacity,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                vertexColors: true,
                fog: false,
            });
            ownedGeometries.push(geo);
            ownedMaterials.push(mat);
            starfieldGroup.add(new THREE.Points(geo, mat));
        };

        const starDensityScale = isSoftwareGl ? 0.35 : 1.0;
        addStars(Math.floor(6000 * starDensityScale), 60000, CELESTIAL_RADIUS, 26, 0.85, new THREE.Color(0.9, 0.94, 1.0));
        addStars(Math.floor(2500 * starDensityScale), 40000, CELESTIAL_RADIUS * 0.8, 42, 0.55, new THREE.Color(1.0, 0.84, 0.76));
        addStars(Math.floor(1500 * starDensityScale), 80000, CELESTIAL_RADIUS * 1.15, 58, 0.36, new THREE.Color(0.75, 0.95, 1.0));

        // Nebula cloud points
        const nebCount = 16;
        const nebPos = new Float32Array(nebCount * 3);
        const nebCol = new Float32Array(nebCount * 3);
        const nebPalette = [new THREE.Color(0.18, 0.42, 0.98), new THREE.Color(0.72, 0.22, 0.85), new THREE.Color(0.12, 0.68, 0.82)];
        for (let i = 0; i < nebCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = CELESTIAL_RADIUS * 0.9;
            nebPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            nebPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            nebPos[i * 3 + 2] = r * Math.cos(phi);
            const c = nebPalette[i % nebPalette.length];
            nebCol[i * 3] = c.r;
            nebCol[i * 3 + 1] = c.g;
            nebCol[i * 3 + 2] = c.b;
        }
        const nebGeo = new THREE.BufferGeometry();
        nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));
        nebGeo.setAttribute('color', new THREE.BufferAttribute(nebCol, 3));
        const nebMat = new THREE.PointsMaterial({
            size: 11000,
            map: nebulaTex,
            transparent: true,
            opacity: 0.14,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            fog: false,
        });
        ownedGeometries.push(nebGeo);
        ownedMaterials.push(nebMat);
        starfieldGroup.add(new THREE.Points(nebGeo, nebMat));

        // Named Interactive Astrometry Stars (sharing spectral materials)
        const interactiveStars: THREE.Group[] = [];
        const starMeshGeo = new THREE.SphereGeometry(420, 10, 10);
        ownedGeometries.push(starMeshGeo);
        const starMaterialsByHex = new Map<string, THREE.MeshBasicMaterial>();
        allNamedStars.forEach((s) => {
            const pos = raDecToVector3(s.ra, s.dec, CELESTIAL_RADIUS * 0.95);
            const starGroup = new THREE.Group();
            starGroup.position.copy(pos);
            starGroup.userData = {
                type: 'celestial-star',
                name: s.name,
                ra: s.ra,
                dec: s.dec,
                magnitude: s.mag,
                spectralType: s.spectralType,
                constellation: s.constellation,
            };
            const specHex = s.spectralType ? SPECTRAL_COLORS[s.spectralType[0]] || '#ffffff' : '#ffffff';
            let starMat = starMaterialsByHex.get(specHex);
            if (!starMat) {
                starMat = new THREE.MeshBasicMaterial({ color: specHex, fog: false });
                starMaterialsByHex.set(specHex, starMat);
                ownedMaterials.push(starMat);
            }
            const starMesh = new THREE.Mesh(starMeshGeo, starMat);
            starGroup.add(starMesh);
            scene.add(starGroup);
            interactiveStars.push(starGroup);
        });

        // Multi-part Sun Assembly at Heliocentric Origin (0,0,0)
        const sun = new THREE.Group();
        const sunCoreGeo = new THREE.SphereGeometry(34, 36, 36);
        const sunCoreMat = new THREE.MeshBasicMaterial({ color: 0xfff0c2, fog: false });
        const sunCoronaGeo = new THREE.SphereGeometry(39, 28, 28);
        const sunCoronaMat = new THREE.MeshBasicMaterial({
            color: 0xffa73b,
            transparent: true,
            opacity: 0.24,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false,
        });
        ownedGeometries.push(sunCoreGeo, sunCoronaGeo);
        ownedMaterials.push(sunCoreMat, sunCoronaMat);
        sun.add(new THREE.Mesh(sunCoreGeo, sunCoreMat), new THREE.Mesh(sunCoronaGeo, sunCoronaMat));
        sun.userData = { type: 'sun', name: 'Sol (The Sun)', info: 'G2V main-sequence yellow dwarf anchoring the Solar System.' };
        scene.add(sun);

        // Procedural Moon with Crater Texture
        const moonOrbitGroup = new THREE.Group();
        scene.add(moonOrbitGroup);
        const moonTextures = createPlanetTextures('Moon', 0xbdbdbd, maxAnisotropy);
        ownedTextures.push(moonTextures.map, moonTextures.bumpMap);
        const moonGeo = new THREE.SphereGeometry(0.68, 24, 18);
        const moonMat = new THREE.MeshStandardMaterial({
            map: moonTextures.map,
            bumpMap: moonTextures.bumpMap,
            bumpScale: 0.04,
            roughness: 0.92,
            metalness: 0.04,
        });
        ownedGeometries.push(moonGeo);
        ownedMaterials.push(moonMat);
        const moon = new THREE.Mesh(moonGeo, moonMat);
        moon.castShadow = !isSoftwareGl;
        moon.receiveShadow = !isSoftwareGl;
        moon.userData = { type: 'moon', name: 'Luna (The Moon)', info: 'Tidally locked natural satellite stabilizing Earth\'s axial tilt.' };
        moonOrbitGroup.add(moon);

        // InstancedMesh Asteroid Belt between Mars & Jupiter
        const asteroidCount = isSoftwareGl ? 100 : 180;
        const asteroidGeo = new THREE.DodecahedronGeometry(1.15, 0);
        const asteroidMat = new THREE.MeshStandardMaterial({
            color: 0xc2b9ae,
            roughness: 0.88,
            metalness: 0.14,
        });
        ownedGeometries.push(asteroidGeo);
        ownedMaterials.push(asteroidMat);
        const asteroidBelt = new THREE.InstancedMesh(asteroidGeo, asteroidMat, asteroidCount);
        const dummy = new THREE.Object3D();
        const rockColor = new THREE.Color();
        for (let i = 0; i < asteroidCount; i++) {
            const angle = (i / asteroidCount) * Math.PI * 2 + Math.random() * 0.2;
            const radius = 590 + Math.random() * 95;
            dummy.position.set(
                Math.sin(angle) * radius,
                (Math.random() - 0.5) * 26,
                Math.cos(angle) * radius
            );
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            const scale = 0.45 + Math.random() * 1.45;
            dummy.scale.set(scale, scale * (0.65 + Math.random() * 0.6), scale);
            dummy.updateMatrix();
            asteroidBelt.setMatrixAt(i, dummy.matrix);
            const shade = 0.5 + Math.random() * 0.4;
            rockColor.setRGB(shade, shade * 0.94, shade * 0.88);
            asteroidBelt.setColorAt(i, rockColor);
        }
        asteroidBelt.instanceMatrix.needsUpdate = true;
        if (asteroidBelt.instanceColor) asteroidBelt.instanceColor.needsUpdate = true;
        asteroidBelt.computeBoundingSphere();
        scene.add(asteroidBelt);

        // Orbit Paths
        const orbitPaths = new THREE.Group();
        scene.add(orbitPaths);

        const createOrbitPath = (radius: number, color: number) => {
            const segments = 96;
            const geometry = new THREE.BufferGeometry();
            const vertices: number[] = [];
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                vertices.push(Math.sin(theta) * radius, 0, Math.cos(theta) * radius);
            }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            const material = new THREE.LineBasicMaterial({
                color,
                transparent: true,
                opacity: 0.12,
                blending: THREE.AdditiveBlending,
            });
            ownedGeometries.push(geometry);
            ownedMaterials.push(material);
            orbitPaths.add(new THREE.LineLoop(geometry, material));
        };

        planetsMetadata.forEach((p) => createOrbitPath(p.orbitRadius, p.color));
        createOrbitPath(EARTH_ORBIT_RADIUS, 0x3b82f6);

        // Composite Planets with Procedural Surface Maps & Saturn Rings
        const celestialMeshes: { group: THREE.Group; metadata: (typeof planetsMetadata)[number]; initialAngle: number }[] = [];
        const saturnRingTex = createSaturnRingTexture(maxAnisotropy);
        ownedTextures.push(saturnRingTex);
        const planetGeoCache = new THREE.SphereGeometry(1, 28, 22);
        ownedGeometries.push(planetGeoCache);

        planetsMetadata.forEach((p) => {
            const planetGroup = new THREE.Group();
            const textures = createPlanetTextures(p.name, p.color, maxAnisotropy);
            ownedTextures.push(textures.map, textures.bumpMap);
            const planetMat = new THREE.MeshStandardMaterial({
                map: textures.map,
                bumpMap: textures.bumpMap,
                bumpScale: 0.05,
                roughness: p.name === 'Venus' || p.name === 'Jupiter' || p.name === 'Saturn' ? 0.65 : 0.88,
                metalness: 0.05,
            });
            ownedMaterials.push(planetMat);
            const planetBody = new THREE.Mesh(planetGeoCache, planetMat);
            planetBody.scale.setScalar(p.radius);
            planetBody.userData = {
                type: 'planet',
                name: p.name,
                info: p.info,
                ra: p.ra,
                dec: p.dec,
                color: `#${p.color.toString(16).padStart(6, '0')}`,
            };
            planetGroup.add(planetBody);

            if (p.name === 'Saturn') {
                const ringGeo = new THREE.RingGeometry(p.radius * 1.38, p.radius * 2.38, 48);
                const posAttr = ringGeo.attributes.position;
                const uvAttr = ringGeo.attributes.uv;
                const innerR = p.radius * 1.38;
                const outerR = p.radius * 2.38;
                for (let i = 0; i < posAttr.count; i++) {
                    const rx = posAttr.getX(i);
                    const ry = posAttr.getY(i);
                    const rad = Math.sqrt(rx * rx + ry * ry);
                    const u = THREE.MathUtils.clamp((rad - innerR) / (outerR - innerR), 0, 1);
                    uvAttr.setXY(i, u, 0.5);
                }
                const ringMat = new THREE.MeshStandardMaterial({
                    map: saturnRingTex,
                    transparent: true,
                    side: THREE.DoubleSide,
                    roughness: 0.72,
                    metalness: 0.08,
                    depthWrite: false,
                });
                ownedGeometries.push(ringGeo);
                ownedMaterials.push(ringMat);
                const ringMesh = new THREE.Mesh(ringGeo, ringMat);
                ringMesh.rotation.x = Math.PI / 2 - 0.38;
                ringMesh.userData = planetBody.userData;
                planetGroup.add(ringMesh);
            }

            planetGroup.userData = planetBody.userData;
            scene.add(planetGroup);
            celestialMeshes.push({ group: planetGroup, metadata: p, initialAngle: Math.random() * Math.PI * 2 });
        });

        const threeObjects: ThreeObjectRef = {
            scene,
            camera,
            renderer,
            globeGroup,
            clouds,
            satellite,
            starfield: starfieldGroup,
            asteroidBelt,
            sun,
            moon,
            sunLight,
            keyDirLight,
            raycaster: new THREE.Raycaster(),
            mouse: new THREE.Vector2(),
            pointMeshes: new Map(),
            celestialMeshes,
            interactiveStars,
            activePointers: new Map(),
            isDragging: false,
            pointerDownPos: { x: 0, y: 0 },
            previousMouse: { x: 0, y: 0 },
            dragVelocity: { x: 0, y: 0 },
            lastPinchDistance: null,
            targetZoom: 24,
            currentZoom: 24,
            cameraElevation: 4.5,
            targetElevation: 4.5,
            moonOrbitGroup,
            orbitPaths,
            isSoftwareGl,
            viewPreset: cameraViewPreset,
        };
        threeObjectsRef.current = threeObjects;

        const updatePointerCoords = (e: PointerEvent) => {
            const rect = container.getBoundingClientRect();
            threeObjects.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            threeObjects.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        };

        const onPointerDown = (e: PointerEvent) => {
            updatePointerCoords(e);
            threeObjects.activePointers.set(e.pointerId, e);
            if (threeObjects.activePointers.size === 1) {
                threeObjects.isDragging = true;
                threeObjects.pointerDownPos = { x: e.clientX, y: e.clientY };
                threeObjects.previousMouse = { x: e.clientX, y: e.clientY };
                threeObjects.dragVelocity = { x: 0, y: 0 };
            } else if (threeObjects.activePointers.size === 2) {
                const pointers = Array.from(threeObjects.activePointers.values());
                const dx = pointers[0].clientX - pointers[1].clientX;
                const dy = pointers[0].clientY - pointers[1].clientY;
                threeObjects.lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
            }
        };

        let lastHoverCheckMs = 0;
        const onPointerMove = (e: PointerEvent) => {
            updatePointerCoords(e);
            if (threeObjects.activePointers.has(e.pointerId)) {
                threeObjects.activePointers.set(e.pointerId, e);
            }
            if (threeObjects.activePointers.size === 1 && threeObjects.isDragging) {
                const deltaX = e.clientX - threeObjects.previousMouse.x;
                const deltaY = e.clientY - threeObjects.previousMouse.y;
                const vy = deltaX * 0.0055;
                const vx = deltaY * 0.0055;
                globeGroup.rotation.y += vy;
                globeGroup.rotation.x = THREE.MathUtils.clamp(globeGroup.rotation.x + vx, -Math.PI * 0.48, Math.PI * 0.48);
                threeObjects.dragVelocity = { x: vx, y: vy };
                threeObjects.previousMouse = { x: e.clientX, y: e.clientY };
                return;
            } else if (threeObjects.activePointers.size === 2) {
                const pointers = Array.from(threeObjects.activePointers.values());
                const dx = pointers[0].clientX - pointers[1].clientX;
                const dy = pointers[0].clientY - pointers[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (threeObjects.lastPinchDistance !== null && threeObjects.lastPinchDistance > 0) {
                    const zoomFactor = threeObjects.lastPinchDistance / dist;
                    threeObjects.targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, threeObjects.targetZoom * zoomFactor));
                }
                threeObjects.lastPinchDistance = dist;
                return;
            }

            const now = performance.now();
            if (now - lastHoverCheckMs < 45) return;
            lastHoverCheckMs = now;

            threeObjects.raycaster.setFromCamera(threeObjects.mouse, camera);
            const pointIntersects = threeObjects.raycaster.intersectObjects(Array.from(threeObjects.pointMeshes.values()), true);
            if (pointIntersects.length > 0) {
                let obj: THREE.Object3D | null = pointIntersects[0].object;
                while (obj && !obj.userData?.type) obj = obj.parent;
                if (obj?.userData?.type) {
                    onHoverRef.current(obj.userData as InfoPanelData, { x: e.clientX, y: e.clientY });
                    setAstrometryTarget(null);
                    container.style.cursor = 'pointer';
                    return;
                }
            }

            const planetGroups = celestialMeshes.map((m) => m.group);
            const celestialIntersects = threeObjects.raycaster.intersectObjects([...interactiveStars, ...planetGroups], true);
            if (celestialIntersects.length > 0) {
                let obj: THREE.Object3D | null = celestialIntersects[0].object;
                while (obj && !obj.userData?.type) obj = obj.parent;
                if (obj?.userData?.type) {
                    onHoverRef.current(obj.userData as InfoPanelData, { x: e.clientX, y: e.clientY });
                    if (obj.userData.type === 'celestial-star' || obj.userData.type === 'planet') {
                        setAstrometryTarget(obj.userData as CelestialPointData);
                    } else {
                        setAstrometryTarget(null);
                    }
                    container.style.cursor = 'pointer';
                    return;
                }
            }

            container.style.cursor = 'grab';
            onHoverRef.current(null);
            setAstrometryTarget(null);
        };

        const onPointerUp = (e: PointerEvent) => {
            updatePointerCoords(e);
            if (threeObjects.activePointers.size === 1 && threeObjects.isDragging) {
                const dx = Math.abs(e.clientX - threeObjects.pointerDownPos.x);
                const dy = Math.abs(e.clientY - threeObjects.pointerDownPos.y);
                if (dx < 6 && dy < 6) {
                    threeObjects.raycaster.setFromCamera(threeObjects.mouse, camera);
                    const picker = locationPickerRef.current;
                    if (picker.isLocationPickerMode || picker.isTreeLocationPickerMode) {
                        const globeHits = threeObjects.raycaster.intersectObject(globe, false);
                        if (globeHits.length > 0) {
                            const localPoint = globeGroup.worldToLocal(globeHits[0].point.clone()).normalize();
                            const lat = 90 - Math.acos(Math.max(-1, Math.min(1, localPoint.y))) * (180 / Math.PI);
                            const theta = Math.atan2(localPoint.z, -localPoint.x);
                            let lon = theta * (180 / Math.PI) - 90;
                            if (lon < -180) lon += 360;
                            if (lon > 180) lon -= 360;
                            if (picker.isLocationPickerMode) picker.onLocationPick({ lat, lon });
                            else if (picker.isTreeLocationPickerMode) picker.onTreeLocationPick({ lat, lon });
                            threeObjects.activePointers.delete(e.pointerId);
                            threeObjects.isDragging = false;
                            return;
                        }
                    }

                    const intersects = threeObjects.raycaster.intersectObjects(Array.from(threeObjects.pointMeshes.values()), true);
                    if (intersects.length > 0) {
                        let obj: THREE.Object3D | null = intersects[0].object;
                        while (obj && !obj.userData?.type) obj = obj.parent;
                        if (obj?.userData?.type === 'radio') {
                            onStationClickRef.current(obj.userData as RadioPointData);
                        } else if (obj?.userData?.type) {
                            onPointClickRef.current?.(obj.userData as PointData);
                        }
                    }
                }
            }
            threeObjects.activePointers.delete(e.pointerId);
            if (threeObjects.activePointers.size < 2) threeObjects.lastPinchDistance = null;
            if (threeObjects.activePointers.size === 0) threeObjects.isDragging = false;
        };

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const zoomAmount = threeObjects.targetZoom * 0.22 * (e.deltaY > 0 ? 1 : -1);
            threeObjects.targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, threeObjects.targetZoom + zoomAmount));
        };

        container.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        container.addEventListener('wheel', onWheel, { passive: false });

        const handleResize = () => {
            const w = Math.max(1, container.clientWidth);
            const h = Math.max(1, container.clientHeight);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        let lastNow = performance.now();
        let softwareTimerId: number | null = null;
        let disposed = false;
        let pausedByContextLoss = false;

        // Fence-sync GPU pacing when running on software WebGL (SwiftShader/llvmpipe)
        const afterDraw = (cb: () => void) => {
            if (disposed || pausedByContextLoss) return;
            const webglCtx = renderer.getContext();
            if ('fenceSync' in webglCtx && typeof (webglCtx as WebGL2RenderingContext).fenceSync === 'function') {
                const gl2 = webglCtx as WebGL2RenderingContext;
                const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
                gl2.flush();
                const poll = () => {
                    if (disposed || pausedByContextLoss) {
                        if (sync) gl2.deleteSync(sync);
                        return;
                    }
                    const state = sync ? gl2.getSyncParameter(sync, gl2.SYNC_STATUS) : gl2.SIGNALED;
                    if (state === gl2.UNSIGNALED) {
                        softwareTimerId = window.setTimeout(poll, 5);
                    } else {
                        if (sync) gl2.deleteSync(sync);
                        softwareTimerId = window.setTimeout(cb, 80);
                    }
                };
                softwareTimerId = window.setTimeout(poll, 5);
            } else {
                softwareTimerId = window.setTimeout(cb, 80);
            }
        };

        const renderFrame = () => {
            if (disposed || pausedByContextLoss) return;
            const now = performance.now();
            const delta = Math.min(0.1, (now - lastNow) * 0.001);
            lastNow = now;

            const { speed, offset, isPaused } = timescapeRef.current;
            const simTimeSec = (Date.now() + offset) * 0.001;
            const celestialTime = simTimeSec * (isPaused ? 0 : speed);

            if (!threeObjects.isDragging) {
                globeGroup.rotation.y += threeObjects.dragVelocity.y + (isPaused ? 0 : 0.04 * delta);
                globeGroup.rotation.x = THREE.MathUtils.clamp(
                    globeGroup.rotation.x + threeObjects.dragVelocity.x,
                    -Math.PI * 0.48,
                    Math.PI * 0.48
                );
                const inertiaDecay = Math.exp(-5.5 * delta);
                threeObjects.dragVelocity.x *= inertiaDecay;
                threeObjects.dragVelocity.y *= inertiaDecay;
            }
            clouds.rotation.y += 0.065 * delta;
            starfieldGroup.rotation.y += starRotationSpeedRef.current * delta;
            asteroidBelt.rotation.y += 0.015 * delta;

            const earthAngle = celestialTime * EARTH_ORBITAL_SPEED * 0.01;
            _scratchEarthPos.set(Math.sin(earthAngle) * EARTH_ORBIT_RADIUS, 0, Math.cos(earthAngle) * EARTH_ORBIT_RADIUS);
            globeGroup.position.copy(_scratchEarthPos);
            moonOrbitGroup.position.copy(_scratchEarthPos);
            moon.position.set(
                Math.sin(simTimeSec * 0.42) * MOON_ORBIT_RADIUS,
                0.8 * Math.sin(simTimeSec * 0.42),
                Math.cos(simTimeSec * 0.42) * MOON_ORBIT_RADIUS
            );
            moon.rotation.y = simTimeSec * 0.25;

            const satAngle = simTimeSec * 0.38;
            _scratchSatPos.set(
                _scratchEarthPos.x + Math.cos(satAngle) * SATELLITE_ORBIT_RADIUS,
                _scratchEarthPos.y + Math.sin(satAngle * 1.2) * 2.1,
                _scratchEarthPos.z + Math.sin(satAngle) * SATELLITE_ORBIT_RADIUS
            );
            satellite.position.copy(_scratchSatPos);
            satellite.lookAt(_scratchEarthPos);

            _scratchSunDir.subVectors(_scratchOrigin, _scratchEarthPos).normalize();
            keyDirLight.position.copy(_scratchEarthPos).addScaledVector(_scratchSunDir, 32);
            keyDirLight.target.position.copy(_scratchEarthPos);
            keyDirLight.target.updateMatrixWorld();
            keyDirLight.intensity = Math.max(1.2, sunIntensityRef.current * 0.72);
            sunLight.intensity = sunIntensityRef.current;

            celestialMeshes.forEach((p) => {
                const angle = p.initialAngle + celestialTime * p.metadata.speed * 0.005;
                p.group.position.set(Math.sin(angle) * p.metadata.orbitRadius, 0, Math.cos(angle) * p.metadata.orbitRadius);
                p.group.rotation.y += 0.14 * delta;
            });

            const damp = 1 - Math.exp(-7.5 * delta);
            threeObjects.currentZoom += (threeObjects.targetZoom - threeObjects.currentZoom) * damp;
            threeObjects.cameraElevation += (threeObjects.targetElevation - threeObjects.cameraElevation) * damp;

            if (threeObjects.viewPreset === 'satellite') {
                _scratchViewTarget.copy(_scratchEarthPos);
                _scratchCameraOffset.subVectors(_scratchSatPos, _scratchEarthPos).normalize().multiplyScalar(14.5);
                _scratchCameraOffset.y += 4.2;
                _scratchCameraOffset.add(_scratchEarthPos);
                camera.position.lerp(_scratchCameraOffset, damp);
                camera.lookAt(_scratchSatPos);
            } else {
                const focusLerp = Math.max(0, Math.min(1, (threeObjects.currentZoom - 650) / 1400));
                _scratchViewTarget.copy(_scratchEarthPos).lerp(_scratchOrigin, focusLerp);
                _scratchCameraOffset.set(0, threeObjects.cameraElevation * (1 + focusLerp * 18), threeObjects.currentZoom);
                camera.position.copy(_scratchViewTarget).add(_scratchCameraOffset);
                camera.lookAt(_scratchViewTarget);
            }

            orbitPaths.visible = threeObjects.currentZoom > 90;
            const orbitOpacity = Math.max(0, Math.min(0.32, (threeObjects.currentZoom - 90) / 800));
            orbitPaths.children.forEach((child: any) => {
                if (child.material) child.material.opacity = orbitOpacity;
            });

            renderer.render(scene, camera);

            if (isSoftwareGl) {
                afterDraw(() => {
                    if (!disposed && !pausedByContextLoss) {
                        threeObjects.animationFrameId = requestAnimationFrame(renderFrame);
                    }
                });
            } else {
                threeObjects.animationFrameId = requestAnimationFrame(renderFrame);
            }
        };

        const handleContextLost = (e: Event) => {
            e.preventDefault();
            pausedByContextLoss = true;
            if (threeObjects.animationFrameId) cancelAnimationFrame(threeObjects.animationFrameId);
            if (softwareTimerId !== null) clearTimeout(softwareTimerId);
            setWebglStatus('lost');
        };

        const handleContextRestored = () => {
            pausedByContextLoss = false;
            setWebglStatus('ready');
            lastNow = performance.now();
            threeObjects.animationFrameId = requestAnimationFrame(renderFrame);
        };

        renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
        renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

        threeObjects.animationFrameId = requestAnimationFrame(renderFrame);

        return () => {
            disposed = true;
            if (threeObjects.animationFrameId) cancelAnimationFrame(threeObjects.animationFrameId);
            if (softwareTimerId !== null) clearTimeout(softwareTimerId);
            resizeObserver.disconnect();
            renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
            renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
            container.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            container.removeEventListener('wheel', onWheel);

            satellite.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.geometry?.dispose();
                    const mat = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
                    const mats = Array.isArray(mat) ? mat : [mat];
                    mats.forEach((m) => {
                        m?.map?.dispose();
                        m?.dispose();
                    });
                }
            });

            ownedTextures.forEach((t) => t.dispose());
            ownedGeometries.forEach((g) => g.dispose());
            ownedMaterials.forEach((m) => m.dispose());
            envRenderTarget.dispose();

            if (renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
            threeObjectsRef.current = null;
        };
    }, []);

    // Sync camera view preset cleanly
    useEffect(() => {
        const obj = threeObjectsRef.current;
        if (!obj) return;
        obj.viewPreset = cameraViewPreset;
        if (cameraViewPreset === 'earth') {
            obj.targetZoom = 22;
            obj.targetElevation = 4.2;
        } else if (cameraViewPreset === 'solar') {
            obj.targetZoom = 1550;
            obj.targetElevation = 28;
        } else if (cameraViewPreset === 'zenith') {
            obj.targetZoom = 28;
            obj.targetElevation = 22;
        } else if (cameraViewPreset === 'satellite') {
            obj.targetZoom = 18;
            obj.targetElevation = 5;
        }
    }, [cameraViewPreset]);

    // Sync composite multi-part markers oriented radially outward on Earth surface
    useEffect(() => {
        if (!threeObjectsRef.current) return;
        const { globeGroup, pointMeshes } = threeObjectsRef.current;
        const points = [...radioPoints, ...birdPoints, ...treePoints, ...inatPoints];
        const newIds = new Set(points.map((p) => p.id));

        pointMeshes.forEach((mesh, id) => {
            if (!newIds.has(id)) {
                globeGroup.remove(mesh);
                pointMeshes.delete(id);
            }
        });

        points.forEach((p) => {
            let group = pointMeshes.get(p.id);
            if (!group) {
                const markerType =
                    p.type === 'radio'
                        ? 'radio'
                        : p.type === 'bird'
                        ? 'bird'
                        : p.type === 'tree'
                        ? 'tree'
                        : 'inaturalist';
                group = createSurfaceMarkerGroup(markerType);
                group.userData = p;
                globeGroup.add(group);
                pointMeshes.set(p.id, group);
            } else {
                group.userData = p;
            }
            latLonToVector3(p.lat, p.lon, GLOBE_RADIUS, 0.0, _scratchSurfacePos);
            group.position.copy(_scratchSurfacePos);
            _scratchNormal.copy(_scratchSurfacePos).normalize();
            _scratchQuat.setFromUnitVectors(_scratchUp, _scratchNormal);
            group.quaternion.copy(_scratchQuat);
        });
    }, [radioPoints, birdPoints, treePoints, inatPoints]);

    // Rotate Earth cleanly to bring flyToTarget coordinates to face viewer
    useEffect(() => {
        const obj = threeObjectsRef.current;
        if (!flyToTarget || !obj) return;
        obj.viewPreset = 'earth';
        obj.targetZoom = 17.5;
        obj.targetElevation = 2.0;
        const targetPhi = -(flyToTarget.lon * Math.PI) / 180;
        const targetTheta = (flyToTarget.lat * Math.PI) / 180;
        obj.globeGroup.rotation.y = targetPhi;
        obj.globeGroup.rotation.x = THREE.MathUtils.clamp(targetTheta * 0.75, -Math.PI * 0.45, Math.PI * 0.45);
    }, [flyToTarget]);

    useEffect(() => {
        if (celestialFlyToTarget && threeObjectsRef.current) {
            threeObjectsRef.current.viewPreset = 'solar';
            threeObjectsRef.current.targetZoom = 1200;
            threeObjectsRef.current.targetElevation = 18;
        }
    }, [celestialFlyToTarget]);

    return (
        <div className="w-full h-full absolute top-0 left-0 overflow-hidden bg-[#040711] touch-none">
            {/* Dedicated isolated WebGL canvas mount node (outside sibling React HUD) */}
            <div ref={canvasMountRef} className="w-full h-full absolute inset-0" />

            {webglStatus !== 'ready' && (
                <Fallback2DGlobe
                    radioPoints={radioPoints}
                    birdPoints={birdPoints}
                    treePoints={treePoints}
                    inatPoints={inatPoints}
                    onHover={onHover}
                    onStationClick={onStationClick}
                    onPointClick={onPointClick}
                    flyToTarget={flyToTarget}
                    webglReason={webglStatus === 'lost' ? 'lost' : 'blocked'}
                />
            )}

            {astrometryTarget && (
                <div className="absolute top-20 right-5 w-64 bg-slate-950/92 rounded-2xl border border-white/15 p-5 shadow-2xl pointer-events-none transition-all duration-300 z-[80]">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="text-lg font-black text-white italic tracking-tighter leading-tight">{astrometryTarget.name}</h3>
                            <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mt-0.5">
                                {astrometryTarget.type === 'celestial-star' ? 'Astrometric Index' : 'Planetary Body'}
                            </p>
                        </div>
                        <div
                            className="w-3.5 h-3.5 rounded-full"
                            style={{
                                backgroundColor: astrometryTarget.spectralType
                                    ? SPECTRAL_COLORS[astrometryTarget.spectralType[0]] || '#fff'
                                    : astrometryTarget.color || '#fff',
                            }}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Magnitude</p>
                                <p className="text-sm font-mono text-white">{astrometryTarget.magnitude?.toFixed(2) || 'N/A'}</p>
                            </div>
                            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Spectral</p>
                                <p
                                    className="text-sm font-mono"
                                    style={{
                                        color: astrometryTarget.spectralType
                                            ? SPECTRAL_COLORS[astrometryTarget.spectralType[0]] || '#fff'
                                            : '#fff',
                                    }}
                                >
                                    {astrometryTarget.spectralType || '---'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-white/10">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">R.A. Index</span>
                                <span className="text-xs font-mono text-slate-200">{astrometryTarget.ra?.toFixed(3) ?? '---'}h</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Declination</span>
                                <span className="text-xs font-mono text-slate-200">{astrometryTarget.dec?.toFixed(3) ?? '---'}°</span>
                            </div>
                        </div>

                        {astrometryTarget.constellation && (
                            <div className="pt-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Sector Origin</p>
                                <p className="text-[10px] font-bold text-blue-400 italic">{astrometryTarget.constellation}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
