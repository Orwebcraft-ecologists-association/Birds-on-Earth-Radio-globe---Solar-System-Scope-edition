import * as THREE from 'three';
import { getCountryBorderPolylines, getEarthElevationSample } from './worldGeography';

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

export function createEarthTextures(maxAnisotropy: number, highRes: boolean = true): EarthProceduralTextures {
    const w = highRes ? 2048 : 1024;
    const h = highRes ? 1024 : 512;

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
        const latDeg = 90 - (y + 0.5) * (180 / h);
        const lat = (latDeg * Math.PI) / 180;
        const absLat = Math.abs(latDeg) / 90;

        for (let x = 0; x < w; x++) {
            const u = x / w;
            const lonDeg = ((x + 0.5) / w) * 360 - 180;
            const lon = (lonDeg * Math.PI) / 180;
            const idx = (y * w + x) * 4;

            const { land, elevation } = getEarthElevationSample(latDeg, lonDeg);
            const micro = fbmSpherical(lat * 2.2, lon * 2.2, 3, 47);
            const aridityNoise = fbmSpherical(lat + 0.4, lon - 0.6, 2, 73);

            // Real polar ice caps (Antarctica south of ~68S, Arctic ice pack north of ~80N, Greenland ice sheet)
            const isGreenlandIce = latDeg > 62 && latDeg < 83 && lonDeg > -58 && lonDeg < -20 && land > 0.3;
            const isAntarctica = latDeg < -63 && land > 0.25;
            const isPolarSeaIce = absLat > 0.90 - micro * 0.04;

            let r = 12;
            let g = 46;
            let b = 104;
            let rough = 86;
            let bumpVal = 24;
            let nightR = 0;
            let nightG = 0;
            let nightB = 0;

            if (isAntarctica || isGreenlandIce || isPolarSeaIce) {
                const iceShade = 0.88 + elevation * 0.14;
                r = Math.min(255, Math.round(224 * iceShade));
                g = Math.min(255, Math.round(236 * iceShade));
                b = Math.min(255, Math.round(248 * iceShade));
                rough = 195;
                bumpVal = Math.round(135 + elevation * 115);
            } else if (land > 0.22) {
                const desertBelt =
                    (latDeg > 13 && latDeg < 34 && lonDeg > -17 && lonDeg < 60) || // Sahara + Arabia
                    (latDeg > -30 && latDeg < -18 && lonDeg > 116 && lonDeg < 142) || // Australian Outback
                    (latDeg > 37 && latDeg < 45 && lonDeg > 55 && lonDeg < 108) || // Central Asia / Gobi
                    (latDeg > 24 && latDeg < 37 && lonDeg > -117 && lonDeg < -102); // Sonoran / Mojave

                const tropicalRainforest =
                    Math.abs(latDeg) < 12 &&
                    ((lonDeg > -78 && lonDeg < -48) || // Amazon
                        (lonDeg > 9 && lonDeg < 31) || // Congo
                        (lonDeg > 95 && lonDeg < 150)); // Maritime SE Asia

                const desertWeight = desertBelt ? Math.min(1, 0.55 + aridityNoise * 0.55) : Math.max(0, (aridityNoise - 0.55) * 1.3 * Math.max(0, 1 - Math.abs(absLat - 0.27) * 4.5));

                if (elevation > 0.62) {
                    // Alpine snow peaks & high rocky cordilleras (Himalayas, Andes, Rockies, Alps)
                    const snow = Math.max(0, Math.min(1, (elevation - 0.62) / 0.28 + (absLat > 0.45 ? 0.22 : 0)));
                    const rockR = 128 + micro * 38;
                    const rockG = 114 + micro * 34;
                    const rockB = 102 + micro * 30;
                    r = Math.round(rockR * (1 - snow) + 236 * snow);
                    g = Math.round(rockG * (1 - snow) + 242 * snow);
                    b = Math.round(rockB * (1 - snow) + 248 * snow);
                    rough = 235;
                    bumpVal = Math.round(165 + elevation * 90);
                } else if (elevation > 0.36) {
                    // Foothills, plateaus, highland steppes
                    const mixDesert = Math.min(0.85, desertWeight);
                    r = Math.round((84 + micro * 42) * (1 - mixDesert) + 178 * mixDesert);
                    g = Math.round((112 + micro * 36) * (1 - mixDesert) + 148 * mixDesert);
                    b = Math.round((64 + micro * 24) * (1 - mixDesert) + 104 * mixDesert);
                    rough = 225;
                    bumpVal = Math.round(115 + elevation * 115);
                } else if (desertWeight > 0.42) {
                    // Arid plains & dunes
                    r = Math.round(182 + aridityNoise * 38 + micro * 16);
                    g = Math.round(150 + aridityNoise * 28 + micro * 12);
                    b = Math.round(100 + aridityNoise * 20 + micro * 10);
                    rough = 228;
                    bumpVal = Math.round(78 + elevation * 95);
                } else if (tropicalRainforest) {
                    // Deep emerald equatorial canopy
                    r = Math.round(24 + micro * 26 + elevation * 25);
                    g = Math.round(84 + micro * 38 + elevation * 28);
                    b = Math.round(36 + micro * 18);
                    rough = 212;
                    bumpVal = Math.round(80 + elevation * 105);
                } else {
                    // Temperate & boreal forests / grasslands
                    const boreal = absLat > 0.58 ? (absLat - 0.58) / 0.26 : 0;
                    r = Math.round((42 + micro * 34) * (1 - boreal) + 64 * boreal);
                    g = Math.round((102 + micro * 42) * (1 - boreal) + 88 * boreal);
                    b = Math.round((48 + micro * 20) * (1 - boreal) + 58 * boreal);
                    rough = 216;
                    bumpVal = Math.round(74 + elevation * 110);
                }

                // Habitable land night city lights (below polar latitudes & low/mid elevation)
                if (absLat < 0.70 && elevation < 0.52) {
                    const cluster = hash2D(Math.floor(x / (highRes ? 4 : 2)), Math.floor(y / (highRes ? 4 : 2)), 99);
                    const densityBias =
                        (latDeg > 30 && latDeg < 58 && lonDeg > -10 && lonDeg < 45) || // Europe + Levant
                        (latDeg > 24 && latDeg < 48 && lonDeg > -125 && lonDeg < -68) || // N America
                        (latDeg > 10 && latDeg < 42 && lonDeg > 68 && lonDeg < 142) // India + East Asia
                            ? 0.055
                            : 0.0;
                    if (cluster > 0.875 - densityBias) {
                        const glow = Math.min(1, (cluster - (0.875 - densityBias)) * 6.5);
                        nightR = Math.round(255 * glow);
                        nightG = Math.round(202 * glow);
                        nightB = Math.round(115 * glow);
                    }
                }
            } else {
                // Ocean bathymetry shading (shallower coastal continental shelf cyan-blue -> abyssal trench navy)
                const abyss = fbmSpherical(lat * 1.8, lon * 1.8, 3, 211);
                const shallowBand = Math.max(0, Math.min(1, land * 4.5));
                const midShelf = Math.max(0, 1 - Math.abs(land - 0.08) * 5) * 0.25;
                r = Math.round(10 + shallowBand * 26 + abyss * 8);
                g = Math.round(42 + shallowBand * 72 + midShelf * 45 + abyss * 14);
                b = Math.round(100 + shallowBand * 68 + midShelf * 32 + abyss * 20);
                rough = Math.round(78 + shallowBand * 16);
                bumpVal = Math.round(18 + abyss * 12);
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

    // Crisp international borders & coastline rim onto equirectangular albedo canvas
    const polylines = getCountryBorderPolylines();
    albedoCtx.save();
    albedoCtx.strokeStyle = 'rgba(186, 230, 253, 0.34)';
    albedoCtx.lineWidth = highRes ? 1.15 : 0.8;
    albedoCtx.lineJoin = 'round';
    for (const shiftLon of [0, -360, 360]) {
        albedoCtx.beginPath();
        for (const ring of polylines) {
            if (ring.length < 2) continue;
            for (let i = 0; i < ring.length; i++) {
                const px = ((ring[i][0] + shiftLon + 180) / 360) * w;
                const py = ((90 - ring[i][1]) / 180) * h;
                if (i === 0) albedoCtx.moveTo(px, py);
                else albedoCtx.lineTo(px, py);
            }
        }
        albedoCtx.stroke();
    }
    albedoCtx.restore();

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
