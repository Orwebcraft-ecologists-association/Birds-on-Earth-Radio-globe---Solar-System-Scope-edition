
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { allNamedStars, constellations } from '../services/constellationData';
import type { PointData, InfoPanelData, WeatherPreset, CelestialTarget, RadioPointData, CelestialPointData, TimescapeConfig, BirdPointData, TreePointData, INaturalistPointData } from '../types';

export const planetsMetadata = [
    { 
        name: 'Mercury', 
        ra: 1.5, 
        dec: 7, 
        color: 0xaaaaaa, 
        orbitRadius: 150, 
        speed: 4.1, 
        info: 'Smallest planet, closest to the Sun.',
        texture: 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/mercurymap.jpg'
    },
    { 
        name: 'Venus', 
        ra: 3.2, 
        dec: 18, 
        color: 0xe3bb76, 
        orbitRadius: 250, 
        speed: 1.6, 
        info: 'Hottest planet with a runaway greenhouse effect.',
        texture: 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/venusmap.jpg'
    },
    { 
        name: 'Mars', 
        ra: 5.8, 
        dec: 24, 
        color: 0xff4500, 
        orbitRadius: 500, 
        speed: 0.53, 
        info: 'The Red Planet, home to the solar system\'s tallest volcano.',
        texture: 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/marsmap1k.jpg'
    },
    { 
        name: 'Jupiter', 
        ra: 10.4, 
        dec: 12, 
        color: 0xffd39b, 
        orbitRadius: 750, 
        speed: 0.08, 
        info: 'Largest planet, a gas giant with a Great Red Spot.',
        texture: 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/jupitermap.jpg'
    },
    { 
        name: 'Saturn', 
        ra: 14.1, 
        dec: -10, 
        color: 0xead6b8, 
        orbitRadius: 1000, 
        speed: 0.03, 
        info: 'Famed for its spectacular and complex ring system.',
        texture: 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/saturnmap.jpg'
    },
    { 
        name: 'Uranus', 
        ra: 18.7, 
        dec: -23, 
        color: 0xace5ee, 
        orbitRadius: 1250, 
        speed: 0.01, 
        info: 'Ice giant that tilts so far it orbits on its side.',
        texture: 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/uranusmap.jpg'
    },
    { 
        name: 'Neptune', 
        ra: 22.3, 
        dec: -12, 
        color: 0x4169e1, 
        orbitRadius: 1500, 
        speed: 0.006, 
        info: 'The farthest planet, cold, dark, and whipped by supersonic winds.',
        texture: 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/neptunemap.jpg'
    }
];

const EARTH_ORBIT_RADIUS = 375;
const EARTH_ORBITAL_SPEED = 1.0; 
const MOON_ORBIT_RADIUS = 15;

const SPECTRAL_COLORS: { [key: string]: string } = {
    'O': '#9bb0ff',
    'B': '#aabfff',
    'A': '#cad7ff',
    'F': '#f8f7ff',
    'G': '#fff4ea',
    'K': '#ffd2a1',
    'M': '#ffcc6f',
    'Unknown': '#ffffff'
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
    currentStation: any;
    isSoundscapeMode: boolean;
    weatherPreset: WeatherPreset;
    sunIntensity: number;
    sunOrbitSpeed: number;
    starRotationSpeed: number;
    flyToTarget: { lat: number; lon: number } | null;
    celestialFlyToTarget?: CelestialTarget | null;
    brokenStationIds: Set<string>;
    onGlobeBackgroundClick: () => void;
    isLocationPickerMode: boolean;
    onLocationPick: (coords: { lat: number, lon: number }) => void;
    isTreeLocationPickerMode: boolean;
    onTreeLocationPick: (coords: { lat: number, lon: number }) => void;
    timescape: TimescapeConfig;
}

interface ThreeObjectRef {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    globeGroup: THREE.Group;
    clouds: THREE.Mesh;
    starfield: THREE.Group;
    sun: THREE.Mesh;
    moon: THREE.Mesh;
    sunLight: THREE.PointLight;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    pointMeshes: Map<string | number, THREE.Group>;
    celestialMeshes: { mesh: THREE.Mesh; metadata: any; initialAngle: number }[];
    interactiveStars: THREE.Group[];
    activePointers: Map<number, PointerEvent>;
    isDragging: boolean;
    previousMouse: { x: number; y: number };
    lastPinchDistance: number | null;
    composer: EffectComposer;
    animationFrameId?: number;
    targetZoom: number;
    currentZoom: number;
    moonOrbitGroup: THREE.Group;
    orbitPaths: THREE.Group;
}

const GLOBE_RADIUS = 5;
const CELESTIAL_RADIUS = 250000; 
const MIN_ZOOM = 10;
const MAX_ZOOM = 220000;

const latLonToVector3 = (lat: number, lon: number, r: number, h: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 90) * (Math.PI / 180);
    return new THREE.Vector3(
        -((r + h) * Math.sin(phi) * Math.cos(theta)),
        ((r + h) * Math.cos(phi)),
        ((r + h) * Math.sin(phi) * Math.sin(theta))
    );
};

const createStarTexture = (size: number = 128, soft: boolean = false) => {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    if (soft) {
        gradient.addColorStop(0, 'rgba(255,255,255,0.4)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.1)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
    } else {
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.7)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
};

const raDecToVector3 = (ra: number, dec: number, r: number): THREE.Vector3 => {
    const phi = (ra * 15) * (Math.PI / 180);
    const theta = (90 - dec) * (Math.PI / 180);
    return new THREE.Vector3(
        r * Math.sin(theta) * Math.cos(phi),
        r * Math.cos(theta),
        r * Math.sin(theta) * Math.sin(phi)
    );
};

export const Globe: React.FC<GlobeProps> = (props) => {
    const { radioPoints, birdPoints, treePoints, inatPoints, userLocationPoint, onHover, sunIntensity, sunOrbitSpeed, starRotationSpeed, flyToTarget, celestialFlyToTarget, brokenStationIds, timescape, onGlobeBackgroundClick, onStationClick, isLocationPickerMode, onLocationPick, isTreeLocationPickerMode, onTreeLocationPick } = props;
    const mountRef = useRef<HTMLDivElement>(null);
    const threeObjectsRef = useRef<ThreeObjectRef | null>(null);
    const lastFrameTimeRef = useRef(Date.now());
    const timescapeRef = useRef(timescape);
    const starRotationSpeedRef = useRef(starRotationSpeed);
    const locationPickerRef = useRef({ isLocationPickerMode, onLocationPick, isTreeLocationPickerMode, onTreeLocationPick });
    const [astrometryTarget, setAstrometryTarget] = useState<CelestialPointData | null>(null);

    useEffect(() => { timescapeRef.current = timescape; }, [timescape]);
    useEffect(() => { starRotationSpeedRef.current = starRotationSpeed; }, [starRotationSpeed]);
    useEffect(() => {
        locationPickerRef.current = { isLocationPickerMode, onLocationPick, isTreeLocationPickerMode, onTreeLocationPick };
    }, [isLocationPickerMode, onLocationPick, isTreeLocationPickerMode, onTreeLocationPick]);

    useEffect(() => {
        if (!mountRef.current || threeObjectsRef.current) return;
        const container = mountRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1500000);
        camera.position.set(0, 0, 35);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const sunLight = new THREE.PointLight(0xffffff, sunIntensity, 0);
        scene.add(sunLight);

        const globeGroup = new THREE.Group();
        scene.add(globeGroup);

        const loader = new THREE.TextureLoader();
        const globeMaterial = new THREE.MeshPhongMaterial({ color: 0x2233aa, shininess: 30 });
        loader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg', (t) => { globeMaterial.map = t; globeMaterial.needsUpdate = true; });
        loader.load('https://unpkg.com/three-globe/example/img/earth-night.jpg', (t) => { 
            globeMaterial.emissiveMap = t; globeMaterial.emissive = new THREE.Color(0xffffff); globeMaterial.emissiveIntensity = 0.5; globeMaterial.needsUpdate = true; 
        });

        const globe = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 128, 128), globeMaterial);
        globeGroup.add(globe);

        const clouds = new THREE.Mesh(
            new THREE.SphereGeometry(GLOBE_RADIUS + 0.1, 64, 64),
            new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.35, depthWrite: false })
        );
        globeGroup.add(clouds);
        loader.load('https://unpkg.com/three-globe/example/img/earth-clouds.png', (t) => { (clouds.material as THREE.MeshPhongMaterial).map = t; (clouds.material as THREE.MeshPhongMaterial).needsUpdate = true; });

        const starfieldGroup = new THREE.Group();
        scene.add(starfieldGroup);
        
        const addStars = (count: number, rMin: number, rMax: number, size: number, opacity: number, color: THREE.Color = new THREE.Color(1,1,1)) => {
            const posArr: number[] = [];
            const colorArr: number[] = [];
            const starTex = createStarTexture();
            for (let i = 0; i < count; i++) {
                const r = rMin + Math.random() * (rMax - rMin);
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                posArr.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
                
                const c = color.clone().multiplyScalar(0.8 + Math.random() * 0.4);
                colorArr.push(c.r, c.g, c.b);
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
            geo.setAttribute('color', new THREE.Float32BufferAttribute(colorArr, 3));
            const points = new THREE.Points(geo, new THREE.PointsMaterial({ 
                size, 
                map: starTex, 
                transparent: true, 
                opacity, 
                depthWrite: false, 
                blending: THREE.AdditiveBlending,
                vertexColors: true
            }));
            starfieldGroup.add(points);
        };

        const addNebulae = (count: number, r: number, size: number, opacity: number) => {
            const posArr: number[] = [];
            const colorArr: number[] = [];
            const nebulaTex = createStarTexture(256, true);
            const colors = [new THREE.Color(0.2, 0.4, 1.0), new THREE.Color(0.8, 0.2, 0.9), new THREE.Color(0.1, 0.7, 0.8)];
            
            for (let i = 0; i < count; i++) {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                posArr.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
                const c = colors[Math.floor(Math.random() * colors.length)];
                colorArr.push(c.r, c.g, c.b);
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
            geo.setAttribute('color', new THREE.Float32BufferAttribute(colorArr, 3));
            const points = new THREE.Points(geo, new THREE.PointsMaterial({ 
                size, 
                map: nebulaTex, 
                transparent: true, 
                opacity, 
                depthWrite: false, 
                blending: THREE.AdditiveBlending,
                vertexColors: true
            }));
            starfieldGroup.add(points);
        };

        addStars(80000, 60000, CELESTIAL_RADIUS, 25, 0.8, new THREE.Color(0.9, 0.9, 1.0));
        addStars(20000, 40000, CELESTIAL_RADIUS * 0.8, 40, 0.5, new THREE.Color(1.0, 0.8, 0.8));
        addStars(10000, 80000, CELESTIAL_RADIUS * 1.2, 60, 0.3, new THREE.Color(0.8, 1.0, 1.0));
        addNebulae(50, CELESTIAL_RADIUS * 0.9, 20000, 0.15);

        const interactiveStars: THREE.Group[] = [];
        allNamedStars.forEach(s => {
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
                constellation: s.constellation 
            };
            const starMesh = new THREE.Mesh(new THREE.SphereGeometry(400, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
            starGroup.add(starMesh);
            scene.add(starGroup);
            interactiveStars.push(starGroup);
        });

        const sun = new THREE.Mesh(new THREE.SphereGeometry(35, 64, 64), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        scene.add(sun);

        const moonOrbitGroup = new THREE.Group();
        scene.add(moonOrbitGroup);
        const moon = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 32), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
        moonOrbitGroup.add(moon);

        const orbitPaths = new THREE.Group();
        scene.add(orbitPaths);

        const createOrbitPath = (radius: number, color: number) => {
            const segments = 128;
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                vertices.push(Math.sin(theta) * radius, 0, Math.cos(theta) * radius);
            }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            const material = new THREE.LineBasicMaterial({ 
                color: color, 
                transparent: true, 
                opacity: 0.1, 
                blending: THREE.AdditiveBlending 
            });
            const line = new THREE.LineLoop(geometry, material);
            orbitPaths.add(line);
        };

        planetsMetadata.forEach(p => createOrbitPath(p.orbitRadius, p.color));
        createOrbitPath(EARTH_ORBIT_RADIUS, 0x3b82f6);

        const celestialMeshes: { mesh: THREE.Mesh; metadata: any; initialAngle: number }[] = [];
        planetsMetadata.forEach(p => {
            const planetMesh = new THREE.Mesh(new THREE.SphereGeometry(8, 32, 32), new THREE.MeshStandardMaterial({ color: p.color }));
            planetMesh.userData = { 
                type: 'planet', 
                name: p.name, 
                info: p.info,
                ra: p.ra,
                dec: p.dec,
                color: `#${p.color.toString(16).padStart(6, '0')}`
            };
            scene.add(planetMesh);
            celestialMeshes.push({ mesh: planetMesh, metadata: p, initialAngle: Math.random() * Math.PI * 2 });
        });

        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 1.8, 0.5, 0.7));

        const threeObjects: ThreeObjectRef = {
            scene, camera, renderer, globeGroup, clouds, starfield: starfieldGroup, raycaster: new THREE.Raycaster(), mouse: new THREE.Vector2(),
            sun, moon, sunLight, pointMeshes: new Map(), celestialMeshes, interactiveStars,
            activePointers: new Map(),
            isDragging: false, previousMouse: { x: 0, y: 0 },
            lastPinchDistance: null,
            composer, targetZoom: 35, currentZoom: 35, moonOrbitGroup, orbitPaths
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
                threeObjects.previousMouse = { x: e.clientX, y: e.clientY };
            } else if (threeObjects.activePointers.size === 2) {
                const pointers = Array.from(threeObjects.activePointers.values());
                const dx = pointers[0].clientX - pointers[1].clientX;
                const dy = pointers[0].clientY - pointers[1].clientY;
                threeObjects.lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
            }
        };

        const onPointerMove = (e: PointerEvent) => {
            updatePointerCoords(e);
            if (threeObjects.activePointers.has(e.pointerId)) {
                threeObjects.activePointers.set(e.pointerId, e);
            }
            if (threeObjects.activePointers.size === 1 && threeObjects.isDragging) {
                const deltaX = e.clientX - threeObjects.previousMouse.x;
                const deltaY = e.clientY - threeObjects.previousMouse.y;
                globeGroup.rotation.y += deltaX * 0.005;
                globeGroup.rotation.x += deltaY * 0.005;
                threeObjects.previousMouse = { x: e.clientX, y: e.clientY };
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

            threeObjects.raycaster.setFromCamera(threeObjects.mouse, camera);
            const pointIntersects = threeObjects.raycaster.intersectObjects(Array.from(threeObjects.pointMeshes.values()), true);
            if (pointIntersects.length > 0) {
                const target = pointIntersects[0].object.parent;
                if (target?.userData?.type) {
                    onHover(target.userData as InfoPanelData, { x: e.clientX, y: e.clientY });
                    setAstrometryTarget(null);
                    return;
                }
            }

            const celestialIntersects = threeObjects.raycaster.intersectObjects([...interactiveStars, ...celestialMeshes.map(m => m.mesh)], true);
            if (celestialIntersects.length > 0) {
                const target = celestialIntersects[0].object.parent || celestialIntersects[0].object;
                if (target.userData.type) {
                    onHover(target.userData as InfoPanelData, { x: e.clientX, y: e.clientY });
                    if (target.userData.type === 'celestial-star' || target.userData.type === 'planet') {
                        setAstrometryTarget(target.userData as CelestialPointData);
                    } else {
                        setAstrometryTarget(null);
                    }
                    return;
                }
            }

            onHover(null);
            setAstrometryTarget(null);
        };

        const onPointerUp = (e: PointerEvent) => {
            updatePointerCoords(e);
            if (threeObjects.activePointers.size === 1 && threeObjects.isDragging) {
                const dx = Math.abs(e.clientX - threeObjects.previousMouse.x);
                const dy = Math.abs(e.clientY - threeObjects.previousMouse.y);
                if (dx < 5 && dy < 5) {
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
                        const target = intersects[0].object.parent;
                        if (target?.userData.type === 'radio') onStationClick(target.userData as RadioPointData);
                    }
                }
            }
            threeObjects.activePointers.delete(e.pointerId);
            if (threeObjects.activePointers.size < 2) threeObjects.lastPinchDistance = null;
            if (threeObjects.activePointers.size === 0) threeObjects.isDragging = false;
        };

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const zoomAmount = threeObjects.targetZoom * 0.25 * (e.deltaY > 0 ? 1 : -1);
            threeObjects.targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, threeObjects.targetZoom + zoomAmount));
        };

        container.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        container.addEventListener('wheel', onWheel, { passive: false });

        const animate = () => {
            threeObjects.animationFrameId = requestAnimationFrame(animate);
            const { speed, offset, isPaused } = timescapeRef.current;
            const simTimeSec = (Date.now() + offset) * 0.001;
            const delta = Math.min(0.1, (Date.now() - lastFrameTimeRef.current) * 0.001);
            lastFrameTimeRef.current = Date.now();
            const celestialTime = simTimeSec * (isPaused ? 0 : speed);
            
            starfieldGroup.rotation.y += starRotationSpeedRef.current * delta;

            sun.position.set(0, 0, 0);
            sunLight.position.set(0, 0, 0);

            const earthAngle = celestialTime * EARTH_ORBITAL_SPEED * 0.01;
            const earthPos = new THREE.Vector3(Math.sin(earthAngle) * EARTH_ORBIT_RADIUS, 0, Math.cos(earthAngle) * EARTH_ORBIT_RADIUS);
            globeGroup.position.copy(earthPos);
            threeObjects.moonOrbitGroup.position.copy(earthPos);
            moon.position.set(Math.sin(simTimeSec * 0.5) * MOON_ORBIT_RADIUS, 0, Math.cos(simTimeSec * 0.5) * MOON_ORBIT_RADIUS);

            celestialMeshes.forEach(p => {
                const angle = p.initialAngle + celestialTime * p.metadata.speed * 0.005;
                p.mesh.position.set(Math.sin(angle) * p.metadata.orbitRadius, 0, Math.cos(angle) * p.metadata.orbitRadius);
            });

            threeObjects.currentZoom += (threeObjects.targetZoom - threeObjects.currentZoom) * 0.08;
            const focusTransitionThreshold = 800;
            const focusLerp = Math.max(0, Math.min(1, (threeObjects.currentZoom - focusTransitionThreshold) / 2000));
            const viewTarget = earthPos.clone().lerp(new THREE.Vector3(0,0,0), focusLerp);
            
            camera.position.copy(viewTarget).add(new THREE.Vector3(0, 0, threeObjects.currentZoom));
            camera.lookAt(viewTarget);
            
            threeObjects.orbitPaths.visible = threeObjects.currentZoom > 100;
            const orbitOpacity = Math.max(0, Math.min(0.3, (threeObjects.currentZoom - 100) / 1000));
            threeObjects.orbitPaths.children.forEach((child: any) => {
                if (child.material) child.material.opacity = orbitOpacity;
            });

            sunLight.intensity = sunIntensity;
            composer.render();
        };
        animate();

        return () => {
            if (threeObjects.animationFrameId) cancelAnimationFrame(threeObjects.animationFrameId);
            container.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            container.removeEventListener('wheel', onWheel);
            container.innerHTML = ''; renderer.dispose(); threeObjectsRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!threeObjectsRef.current) return;
        const { globeGroup, pointMeshes } = threeObjectsRef.current;
        const points = [...radioPoints, ...birdPoints, ...treePoints, ...inatPoints];
        const newIds = new Set(points.map(p => p.id));
        
        pointMeshes.forEach((mesh, id) => {
            if (!newIds.has(id)) { globeGroup.remove(mesh); pointMeshes.delete(id); }
        });

        points.forEach(p => {
            if (!pointMeshes.has(p.id)) {
                const group = new THREE.Group();
                const color = p.type === 'radio' ? 0x3b82f6 : p.type === 'bird' ? 0xef4444 : p.type === 'tree' ? 0x10b981 : 0x06b6d4;
                const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 1 }));
                group.add(mesh);
                group.userData = p;
                globeGroup.add(group);
                pointMeshes.set(p.id, group);
            }
            const mesh = pointMeshes.get(p.id)!;
            mesh.position.copy(latLonToVector3(p.lat, p.lon, GLOBE_RADIUS, 0.05));
        });
    }, [radioPoints, birdPoints, treePoints, inatPoints]);

    useEffect(() => {
        if (flyToTarget && threeObjectsRef.current) {
            threeObjectsRef.current.targetZoom = 25;
        }
    }, [flyToTarget]);

    useEffect(() => {
        if (celestialFlyToTarget && threeObjectsRef.current) {
            threeObjectsRef.current.targetZoom = 1200;
        }
    }, [celestialFlyToTarget]);

    return (
        <div ref={mountRef} className="w-full h-full absolute top-0 left-0 overflow-hidden bg-black touch-none">
            {astrometryTarget && (
                <div className="absolute top-24 right-5 w-64 bg-slate-950/80 backdrop-blur-2xl rounded-3xl border border-white/20 p-6 shadow-2xl pointer-events-none animate-fadeIn transition-all duration-300 z-[80]">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-black text-white italic tracking-tighter leading-tight">{astrometryTarget.name}</h3>
                            <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest mt-0.5">
                                {astrometryTarget.type === 'celestial-star' ? 'Astrometric Index' : 'Planetary Body'}
                            </p>
                        </div>
                        <div 
                            className="w-4 h-4 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)]" 
                            style={{ 
                                backgroundColor: astrometryTarget.spectralType ? (SPECTRAL_COLORS[astrometryTarget.spectralType[0]] || '#fff') : (astrometryTarget.color || '#fff') 
                            }}
                        ></div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Magnitude</p>
                                <p className="text-sm font-mono text-white">{astrometryTarget.magnitude?.toFixed(2) || 'N/A'}</p>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Spectral</p>
                                <p className="text-sm font-mono" style={{ color: astrometryTarget.spectralType ? (SPECTRAL_COLORS[astrometryTarget.spectralType[0]] || '#fff') : '#fff' }}>
                                    {astrometryTarget.spectralType || '---'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-white/5">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">R.A. Index</span>
                                <span className="text-xs font-mono text-slate-300">{astrometryTarget.ra?.toFixed(3)}h</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Declination</span>
                                <span className="text-xs font-mono text-slate-300">{astrometryTarget.dec?.toFixed(3)}°</span>
                            </div>
                        </div>

                        {astrometryTarget.constellation && (
                            <div className="pt-2">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Sector Origin</p>
                                <p className="text-[10px] font-bold text-blue-400 italic">{astrometryTarget.constellation}</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">Real-time Telemetry Active</span>
                    </div>
                </div>
            )}
        </div>
    );
};
