import * as THREE from 'three';

function hash2D(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
    return n - Math.floor(n);
}

function smoothNoise2D(x: number, y: number, seed: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = hash2D(xi, yi, seed);
    const b = hash2D(xi + 1, yi, seed);
    const c = hash2D(xi, yi + 1, seed);
    const d = hash2D(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbmSpherical(lat: number, lon: number, octaves: number, seed: number): number {
    const nx = Math.cos(lat) * Math.cos(lon) * 2.4;
    const ny = Math.sin(lat) * 2.4;
    const nz = Math.cos(lat) * Math.sin(lon) * 2.4;
    let value = 0;
    let amp = 0.5;
    let freq = 1;
    for (let i = 0; i < octaves; i++) {
        const sample = smoothNoise2D((nx + nz * 0.65) * freq + 10, (ny + nz * 0.45) * freq + 10, seed + i * 19);
        value += amp * sample;
        freq *= 2.05;
        amp *= 0.5;
    }
    return value;
}

export interface EarthProceduralTextures {
    albedo: THREE.CanvasTexture;
    roughness: THREE.CanvasTexture;
    bump: THREE.CanvasTexture;
    nightLights: THREE.CanvasTexture;
    clouds: THREE.CanvasTexture;
}

export function createEarthTextures(maxAnisotropy: number): EarthProceduralTextures {
    const w = 1024;
    const h = 512;

    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = w;
    albedoCanvas.height = h;
    const albedoCtx = albedoCanvas.getContext('2d')!;
    const albedoImg = albedoCtx.createImageData(w, h);

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = w;
    roughCanvas.height = h;
    const roughCtx = roughCanvas.getContext('2d')!;
    const roughImg = roughCtx.createImageData(w, h);

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = w;
    bumpCanvas.height = h;
    const bumpCtx = bumpCanvas.getContext('2d')!;
    const bumpImg = bumpCtx.createImageData(w, h);

    const nightCanvas = document.createElement('canvas');
    nightCanvas.width = w;
    nightCanvas.height = h;
    const nightCtx = nightCanvas.getContext('2d')!;
    const nightImg = nightCtx.createImageData(w, h);

    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = w;
    cloudCanvas.height = h;
    const cloudCtx = cloudCanvas.getContext('2d')!;
    const cloudImg = cloudCtx.createImageData(w, h);

    for (let y = 0; y < h; y++) {
        const v = y / h;
        const lat = (0.5 - v) * Math.PI;
        const absLat = Math.abs(lat) / (Math.PI * 0.5);

        for (let x = 0; x < w; x++) {
            const u = x / w;
            const lon = (u - 0.5) * Math.PI * 2;
            const idx = (y * w + x) * 4;

            // Macro continental + regional biome modulation
            const continent = fbmSpherical(lat, lon, 4, 11);
            const ridge = fbmSpherical(lat * 1.4, lon * 1.4, 3, 47);
            const isPolar = absLat > 0.82 - continent * 0.09;
            const elevation = continent * 0.78 + ridge * 0.22;

            let r = 16;
            let g = 62;
            let b = 128;
            let rough = 92; // ocean specular sheen (~0.36)
            let bumpVal = 40;
            let nightR = 0;
            let nightG = 0;
            let nightB = 0;

            if (isPolar) {
                r = 224;
                g = 234;
                b = 245;
                rough = 210;
                bumpVal = 175;
            } else if (elevation > 0.525) {
                const landH = (elevation - 0.525) / 0.475;
                const aridity = fbmSpherical(lat + 0.5, lon - 0.8, 2, 73);
                const warmBelt = Math.max(0, 1 - Math.abs(absLat - 0.24) * 4.0);

                if (landH > 0.55) {
                    // Alpine & mountain peaks
                    r = Math.round(135 + landH * 75);
                    g = Math.round(128 + landH * 72);
                    b = Math.round(120 + landH * 74);
                    rough = 235;
                    bumpVal = Math.round(180 + landH * 75);
                } else if (warmBelt > 0.45 && aridity > 0.48) {
                    // Subtropical arid plains
                    r = Math.round(176 + aridity * 32);
                    g = Math.round(145 + aridity * 22);
                    b = Math.round(98 + aridity * 16);
                    rough = 225;
                    bumpVal = Math.round(125 + landH * 65);
                } else {
                    // Temperate & equatorial forest greens
                    r = Math.round(38 + landH * 46);
                    g = Math.round(96 + landH * 52);
                    b = Math.round(48 + landH * 24);
                    rough = 215;
                    bumpVal = Math.round(115 + landH * 75);
                }

                // Coastal / temperate night lights near habitable coasts
                if (elevation < 0.60 && absLat < 0.65) {
                    const cluster = hash2D(Math.floor(x / 3), Math.floor(y / 3), 99);
                    if (cluster > 0.86) {
                        const glow = Math.min(1, (cluster - 0.86) * 7.2);
                        nightR = Math.round(255 * glow);
                        nightG = Math.round(205 * glow);
                        nightB = Math.round(120 * glow);
                    }
                }
            } else {
                const shelf = Math.max(0, 1 - (0.525 - elevation) * 7.5);
                r = Math.round(12 + shelf * 28);
                g = Math.round(48 + shelf * 64);
                b = Math.round(108 + shelf * 56);
                rough = Math.round(88 + shelf * 14);
                bumpVal = 40;
            }

            albedoImg.data[idx] = r;
            albedoImg.data[idx + 1] = g;
            albedoImg.data[idx + 2] = b;
            albedoImg.data[idx + 3] = 255;

            roughImg.data[idx] = rough;
            roughImg.data[idx + 1] = rough;
            roughImg.data[idx + 2] = rough;
            roughImg.data[idx + 3] = 255;

            bumpImg.data[idx] = bumpVal;
            bumpImg.data[idx + 1] = bumpVal;
            bumpImg.data[idx + 2] = bumpVal;
            bumpImg.data[idx + 3] = 255;

            nightImg.data[idx] = nightR;
            nightImg.data[idx + 1] = nightG;
            nightImg.data[idx + 2] = nightB;
            nightImg.data[idx + 3] = 255;

            const cloudSample = fbmSpherical(lat * 1.15, lon * 1.25 + 0.7, 3, 131);
            const cloudAlpha = cloudSample > 0.54 ? Math.min(255, Math.round((cloudSample - 0.54) * 520)) : 0;
            cloudImg.data[idx] = 242;
            cloudImg.data[idx + 1] = 247;
            cloudImg.data[idx + 2] = 255;
            cloudImg.data[idx + 3] = cloudAlpha;
        }
    }

    albedoCtx.putImageData(albedoImg, 0, 0);
    roughCtx.putImageData(roughImg, 0, 0);
    bumpCtx.putImageData(bumpImg, 0, 0);
    nightCtx.putImageData(nightImg, 0, 0);
    cloudCtx.putImageData(cloudImg, 0, 0);

    const aniso = Math.min(8, Math.max(1, maxAnisotropy));

    const albedo = new THREE.CanvasTexture(albedoCanvas);
    albedo.colorSpace = THREE.SRGBColorSpace;
    albedo.wrapS = THREE.RepeatWrapping;
    albedo.anisotropy = aniso;

    const roughness = new THREE.CanvasTexture(roughCanvas);
    roughness.colorSpace = THREE.NoColorSpace;
    roughness.wrapS = THREE.RepeatWrapping;
    roughness.anisotropy = aniso;

    const bump = new THREE.CanvasTexture(bumpCanvas);
    bump.colorSpace = THREE.NoColorSpace;
    bump.wrapS = THREE.RepeatWrapping;
    bump.anisotropy = aniso;

    const nightLights = new THREE.CanvasTexture(nightCanvas);
    nightLights.colorSpace = THREE.SRGBColorSpace;
    nightLights.wrapS = THREE.RepeatWrapping;
    nightLights.anisotropy = aniso;

    const clouds = new THREE.CanvasTexture(cloudCanvas);
    clouds.colorSpace = THREE.SRGBColorSpace;
    clouds.wrapS = THREE.RepeatWrapping;
    clouds.anisotropy = aniso;

    return { albedo, roughness, bump, nightLights, clouds };
}

export function createPlanetTextures(
    planetName: string,
    baseHex: number,
    maxAnisotropy: number
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
    const w = 256;
    const h = 128;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(w, h);

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = w;
    bumpCanvas.height = h;
    const bumpCtx = bumpCanvas.getContext('2d')!;
    const bumpImg = bumpCtx.createImageData(w, h);

    const baseColor = new THREE.Color(baseHex);
    const seed = planetName.split('').reduce((acc, ch) => acc + ch.charCodeAt(0) * 13, 7);
    const isGasGiant = planetName === 'Jupiter' || planetName === 'Saturn' || planetName === 'Uranus' || planetName === 'Neptune';

    for (let y = 0; y < h; y++) {
        const v = y / h;
        const lat = (0.5 - v) * Math.PI;
        const band = Math.sin(v * Math.PI * (planetName === 'Jupiter' ? 14 : 9)) * 0.5 + 0.5;

        for (let x = 0; x < w; x++) {
            const u = x / w;
            const lon = (u - 0.5) * Math.PI * 2;
            const idx = (y * w + x) * 4;
            const n = fbmSpherical(lat, lon, 3, seed);

            let shade = 0.72 + n * 0.48;
            if (isGasGiant) {
                shade = 0.65 + band * 0.32 + n * 0.22;
            }
            // Polar cap brightness on Mars
            if (planetName === 'Mars' && Math.abs(v - 0.5) > 0.43) {
                img.data[idx] = 235;
                img.data[idx + 1] = 232;
                img.data[idx + 2] = 228;
                img.data[idx + 3] = 255;
            } else {
                img.data[idx] = Math.min(255, Math.round(baseColor.r * 255 * shade));
                img.data[idx + 1] = Math.min(255, Math.round(baseColor.g * 255 * shade));
                img.data[idx + 2] = Math.min(255, Math.round(baseColor.b * 255 * shade));
                img.data[idx + 3] = 255;
            }

            const bumpVal = Math.min(255, Math.max(0, Math.round(n * 255)));
            bumpImg.data[idx] = bumpVal;
            bumpImg.data[idx + 1] = bumpVal;
            bumpImg.data[idx + 2] = bumpVal;
            bumpImg.data[idx + 3] = 255;
        }
    }

    ctx.putImageData(img, 0, 0);
    bumpCtx.putImageData(bumpImg, 0, 0);

    const aniso = Math.min(8, Math.max(1, maxAnisotropy));
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.anisotropy = aniso;

    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    bumpMap.colorSpace = THREE.NoColorSpace;
    bumpMap.wrapS = THREE.RepeatWrapping;
    bumpMap.anisotropy = aniso;

    return { map, bumpMap };
}

export function createSaturnRingTexture(maxAnisotropy: number): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, size, 0);
    grad.addColorStop(0.0, 'rgba(214, 194, 165, 0.05)');
    grad.addColorStop(0.18, 'rgba(232, 212, 182, 0.72)');
    grad.addColorStop(0.42, 'rgba(218, 198, 168, 0.86)');
    grad.addColorStop(0.55, 'rgba(130, 118, 102, 0.14)'); // Cassini division gap
    grad.addColorStop(0.62, 'rgba(228, 210, 185, 0.78)');
    grad.addColorStop(0.88, 'rgba(205, 188, 164, 0.45)');
    grad.addColorStop(1.0, 'rgba(180, 165, 145, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, 16);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, Math.max(1, maxAnisotropy));
    return tex;
}

export function createSolarWingTexture(maxAnisotropy: number): THREE.CanvasTexture {
    const w = 256;
    const h = 128;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#11224d';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1;
    for (let y = 0; y <= h; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, Math.max(1, maxAnisotropy));
    return tex;
}

export function createOrbitalObservatorySatellite(
    maxAnisotropy: number,
    allowShadows: boolean
): THREE.Group {
    const satGroup = new THREE.Group();
    satGroup.name = 'OrbitalObservatory';

    const goldFoilMat = new THREE.MeshStandardMaterial({
        color: 0xd9a441,
        metalness: 0.78,
        roughness: 0.32,
    });
    const chassisMat = new THREE.MeshStandardMaterial({
        color: 0xc8d2df,
        metalness: 0.72,
        roughness: 0.34,
    });
    const darkFrameMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.45,
        roughness: 0.55,
    });
    const solarTex = createSolarWingTexture(maxAnisotropy);
    const solarMat = new THREE.MeshStandardMaterial({
        map: solarTex,
        metalness: 0.6,
        roughness: 0.28,
        emissive: new THREE.Color(0x0b1f44),
        emissiveIntensity: 0.25,
    });
    const dishMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.25,
        roughness: 0.48,
        side: THREE.DoubleSide,
    });
    const opticsMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: new THREE.Color(0x0ea5e9),
        emissiveIntensity: 0.65,
        metalness: 0.2,
        roughness: 0.25,
    });

    // 1. Central octagonal thermal-foil spacecraft bus
    const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.34, 8), goldFoilMat);
    bus.castShadow = allowShadows;
    bus.receiveShadow = allowShadows;
    satGroup.add(bus);

    // 2. Fore & aft structural collars
    const foreCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.04, 16), darkFrameMat);
    foreCollar.position.y = 0.16;
    satGroup.add(foreCollar);

    const aftCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.04, 16), darkFrameMat);
    aftCollar.position.y = -0.16;
    satGroup.add(aftCollar);

    // 3. Wing support boom spar
    const wingBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.48, 12), chassisMat);
    wingBoom.rotation.z = Math.PI / 2;
    satGroup.add(wingBoom);

    // 4 & 5. Port & starboard photovoltaic solar wings
    const wingGeo = new THREE.BoxGeometry(0.56, 0.014, 0.22);
    const leftWing = new THREE.Mesh(wingGeo, solarMat);
    leftWing.position.x = -0.49;
    leftWing.rotation.x = 0.22;
    leftWing.castShadow = allowShadows;
    leftWing.receiveShadow = allowShadows;
    satGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, solarMat);
    rightWing.position.x = 0.49;
    rightWing.rotation.x = 0.22;
    rightWing.castShadow = allowShadows;
    rightWing.receiveShadow = allowShadows;
    satGroup.add(rightWing);

    // 6. High-gain telemetry parabolic dish
    const dishPoints = [
        new THREE.Vector2(0.01, 0),
        new THREE.Vector2(0.09, 0.018),
        new THREE.Vector2(0.16, 0.065),
    ];
    const dish = new THREE.Mesh(new THREE.LatheGeometry(dishPoints, 24), dishMat);
    dish.position.set(0, 0.21, 0);
    satGroup.add(dish);

    // 7. Dish feed-horn spike
    const feedHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.016, 0.12, 8), chassisMat);
    feedHorn.position.set(0, 0.27, 0);
    satGroup.add(feedHorn);

    // 8. Nadir-facing optical Earth/bioacoustics sensor housing + lens
    const sensorHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.11, 16), darkFrameMat);
    sensorHousing.position.set(0, -0.22, 0);
    satGroup.add(sensorHousing);

    const sensorLens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16), opticsMat);
    sensorLens.position.set(0, -0.28, 0);
    satGroup.add(sensorLens);

    return satGroup;
}

interface SharedMarkerResources {
    radioMastMat: THREE.MeshStandardMaterial;
    radioBeaconMat: THREE.MeshStandardMaterial;
    radioPlinthGeo: THREE.CylinderGeometry;
    radioMastGeo: THREE.CylinderGeometry;
    radioRingGeo: THREE.TorusGeometry;
    radioTipGeo: THREE.SphereGeometry;
    birdBodyMat: THREE.MeshStandardMaterial;
    birdWingMat: THREE.MeshStandardMaterial;
    birdBodyGeo: THREE.ConeGeometry;
    birdWingGeo: THREE.BoxGeometry;
    trunkMat: THREE.MeshStandardMaterial;
    treeFoliageMat: THREE.MeshStandardMaterial;
    inatFoliageMat: THREE.MeshStandardMaterial;
    trunkGeo: THREE.CylinderGeometry;
    crownLowerGeo: THREE.ConeGeometry;
    crownUpperGeo: THREE.ConeGeometry;
}

let cachedMarkerResources: SharedMarkerResources | null = null;

function getSharedMarkerResources(): SharedMarkerResources {
    if (cachedMarkerResources) return cachedMarkerResources;

    cachedMarkerResources = {
        radioMastMat: new THREE.MeshStandardMaterial({
            color: 0x93c5fd,
            metalness: 0.65,
            roughness: 0.35,
        }),
        radioBeaconMat: new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            emissive: new THREE.Color(0x2563eb),
            emissiveIntensity: 0.85,
            roughness: 0.32,
            metalness: 0.2,
        }),
        radioPlinthGeo: new THREE.CylinderGeometry(0.06, 0.075, 0.03, 10),
        radioMastGeo: new THREE.CylinderGeometry(0.015, 0.024, 0.15, 8),
        radioRingGeo: new THREE.TorusGeometry(0.055, 0.01, 6, 16),
        radioTipGeo: new THREE.SphereGeometry(0.036, 10, 10),
        birdBodyMat: new THREE.MeshStandardMaterial({
            color: 0xf87171,
            emissive: new THREE.Color(0xdc2626),
            emissiveIntensity: 0.65,
            roughness: 0.45,
            metalness: 0.1,
        }),
        birdWingMat: new THREE.MeshStandardMaterial({
            color: 0xfca5a5,
            emissive: new THREE.Color(0xef4444),
            emissiveIntensity: 0.45,
            roughness: 0.5,
            metalness: 0.08,
        }),
        birdBodyGeo: new THREE.ConeGeometry(0.032, 0.14, 8),
        birdWingGeo: new THREE.BoxGeometry(0.11, 0.012, 0.042),
        trunkMat: new THREE.MeshStandardMaterial({
            color: 0x78553a,
            roughness: 0.88,
            metalness: 0.05,
        }),
        treeFoliageMat: new THREE.MeshStandardMaterial({
            color: 0x10b981,
            emissive: new THREE.Color(0x059669),
            emissiveIntensity: 0.45,
            roughness: 0.68,
            metalness: 0.05,
        }),
        inatFoliageMat: new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            emissive: new THREE.Color(0x0891b2),
            emissiveIntensity: 0.45,
            roughness: 0.68,
            metalness: 0.05,
        }),
        trunkGeo: new THREE.CylinderGeometry(0.018, 0.028, 0.09, 8),
        crownLowerGeo: new THREE.ConeGeometry(0.068, 0.1, 8),
        crownUpperGeo: new THREE.ConeGeometry(0.048, 0.085, 8),
    };
    return cachedMarkerResources;
}

export function createSurfaceMarkerGroup(
    markerType: 'radio' | 'bird' | 'tree' | 'inaturalist'
): THREE.Group {
    const res = getSharedMarkerResources();
    const group = new THREE.Group();

    if (markerType === 'radio') {
        const plinth = new THREE.Mesh(res.radioPlinthGeo, res.radioMastMat);
        plinth.position.y = 0.015;
        const mast = new THREE.Mesh(res.radioMastGeo, res.radioMastMat);
        mast.position.y = 0.095;
        const ring = new THREE.Mesh(res.radioRingGeo, res.radioBeaconMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.14;
        const tip = new THREE.Mesh(res.radioTipGeo, res.radioBeaconMat);
        tip.position.y = 0.175;
        group.add(plinth, mast, ring, tip);
        return group;
    }

    if (markerType === 'bird') {
        const body = new THREE.Mesh(res.birdBodyGeo, res.birdBodyMat);
        body.rotation.x = Math.PI / 2;
        body.position.y = 0.09;
        const leftWing = new THREE.Mesh(res.birdWingGeo, res.birdWingMat);
        leftWing.position.set(-0.055, 0.105, 0);
        leftWing.rotation.z = 0.32;
        const rightWing = new THREE.Mesh(res.birdWingGeo, res.birdWingMat);
        rightWing.position.set(0.055, 0.105, 0);
        rightWing.rotation.z = -0.32;
        group.add(body, leftWing, rightWing);
        return group;
    }

    const foliageMat = markerType === 'tree' ? res.treeFoliageMat : res.inatFoliageMat;
    const trunk = new THREE.Mesh(res.trunkGeo, res.trunkMat);
    trunk.position.y = 0.045;
    const crownLower = new THREE.Mesh(res.crownLowerGeo, foliageMat);
    crownLower.position.y = 0.105;
    const crownUpper = new THREE.Mesh(res.crownUpperGeo, foliageMat);
    crownUpper.position.y = 0.16;
    group.add(trunk, crownLower, crownUpper);
    return group;
}

export function createStarSpriteTexture(size: number = 128, soft: boolean = false): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    if (soft) {
        gradient.addColorStop(0, 'rgba(255,255,255,0.42)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.12)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
    } else {
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.22, 'rgba(255,255,255,0.75)');
        gradient.addColorStop(0.55, 'rgba(255,255,255,0.2)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}
