
interface Star {
    ra: number; // Right Ascension in decimal hours
    dec: number; // Declination in decimal degrees
    name?: string;
    mag?: number; // Apparent Magnitude
    spectralType?: string; // Spectral Classification
}

interface ConstellationLine {
    start: Star;
    end: Star;
}

interface Constellation {
    name: string;
    lines: ConstellationLine[];
}

// Star data for constellations with spectral types
// RA is in decimal hours, DEC is in decimal degrees.
// Magnitudes are real astronomical values (lower is brighter).

// Ursa Major (The Big Dipper)
const UMA_DUBHE: Star = { ra: 11.062, dec: 61.751, name: 'Dubhe', mag: 1.81, spectralType: 'K0III' };
const UMA_MERAK: Star = { ra: 11.03, dec: 56.382, name: 'Merak', mag: 2.34, spectralType: 'A1V' };
const UMA_PHECDA: Star = { ra: 11.897, dec: 53.695, name: 'Phecda', mag: 2.41, spectralType: 'A0V' };
const UMA_MEGREZ: Star = { ra: 12.257, dec: 57.032, name: 'Megrez', mag: 3.32, spectralType: 'A3V' };
const UMA_ALIOTH: Star = { ra: 12.900, dec: 55.960, name: 'Alioth', mag: 1.76, spectralType: 'A0p' };
const UMA_MIZAR: Star = { ra: 13.399, dec: 54.925, name: 'Mizar', mag: 2.23, spectralType: 'A2V' };
const UMA_ALKAID: Star = { ra: 13.792, dec: 49.313, name: 'Alkaid', mag: 1.85, spectralType: 'B3V' };

// Orion (The Hunter)
const ORI_BETELGEUSE: Star = { ra: 5.92, dec: 7.407, name: 'Betelgeuse', mag: 0.42, spectralType: 'M1Ib' };
const ORI_RIGEL: Star = { ra: 5.242, dec: -8.201, name: 'Rigel', mag: 0.13, spectralType: 'B8Ia' };
const ORI_BELLATRIX: Star = { ra: 5.419, dec: 6.35, name: 'Bellatrix', mag: 1.64, spectralType: 'B2III' };
const ORI_SAIPH: Star = { ra: 5.796, dec: -9.67, name: 'Saiph', mag: 2.07, spectralType: 'B0.5Ia' };
const ORI_ALNITAK: Star = { ra: 5.679, dec: -1.943, name: 'Alnitak', mag: 1.74, spectralType: 'O9.7Ib' };
const ORI_ALNILAM: Star = { ra: 5.603, dec: -1.202, name: 'Alnilam', mag: 1.69, spectralType: 'B0Ia' };
const ORI_MINTAKA: Star = { ra: 5.533, dec: -0.299, name: 'Mintaka', mag: 2.25, spectralType: 'B0III' };

// Cassiopeia (The Queen)
const CAS_SEGIN: Star = { ra: 1.906, dec: 63.67, name: 'Segin', mag: 3.37, spectralType: 'B3III' };
const CAS_RUCHBAH: Star = { ra: 1.43, dec: 60.235, name: 'Ruchbah', mag: 2.68, spectralType: 'A5III' };
const CAS_GAMMA: Star = { ra: 0.945, dec: 60.716, name: 'Gamma Cassiopeiae', mag: 2.15, spectralType: 'B0IV' };
const CAS_SCHEDAR: Star = { ra: 0.675, dec: 56.537, name: 'Schedar', mag: 2.24, spectralType: 'K0III' };
const CAS_CAPH: Star = { ra: 0.153, dec: 59.15, name: 'Caph', mag: 2.28, spectralType: 'F2III' };

// Leo (The Lion)
const LEO_REGULUS: Star = { ra: 10.14, dec: 11.967, name: 'Regulus', mag: 1.36, spectralType: 'B7V' };
const LEO_ALGIEBA: Star = { ra: 10.33, dec: 19.84, name: 'Algieba', mag: 2.01, spectralType: 'K1III' };
const LEO_ZOSMA: Star = { ra: 11.235, dec: 20.52, name: 'Zosma', mag: 2.56, spectralType: 'A4V' };
const LEO_DENEBOLA: Star = { ra: 11.817, dec: 14.57, name: 'Denebola', mag: 2.14, spectralType: 'A3V' };
const LEO_RAS_ELASED: Star = { ra: 9.764, dec: 23.77, name: 'Ras Elased Borealis', mag: 2.97, spectralType: 'G1II' };
const LEO_ADHAFERA: Star = { ra: 10.278, dec: 23.417, name: 'Adhafera', mag: 3.44, spectralType: 'F0III' };

// Canis Major (The Great Dog)
const CMA_SIRIUS: Star = { ra: 6.75, dec: -16.72, name: 'Sirius', mag: -1.46, spectralType: 'A1V' };
const CMA_MIRZAM: Star = { ra: 6.38, dec: -17.95, name: 'Mirzam', mag: 1.98, spectralType: 'B1II' };
const CMA_MULIPHEN: Star = { ra: 7.06, dec: -15.63, name: 'Muliphen', mag: 4.12, spectralType: 'B8II' };
const CMA_WEZEN: Star = { ra: 7.14, dec: -26.4, name: 'Wezen', mag: 1.83, spectralType: 'F8Ia' };
const CMA_ADHARA: Star = { ra: 6.98, dec: -28.97, name: 'Adhara', mag: 1.50, spectralType: 'B2II' };
const CMA_ALUDRA: Star = { ra: 7.40, dec: -29.3, name: 'Aludra', mag: 2.45, spectralType: 'B5Ia' };

// Cygnus (The Swan / Northern Cross)
const CYG_DENEB: Star = { ra: 20.69, dec: 45.27, name: 'Deneb', mag: 1.25, spectralType: 'A2Ia' };
const CYG_SADR: Star = { ra: 20.37, dec: 40.25, name: 'Sadr', mag: 2.23, spectralType: 'F8Ib' };
const CYG_GIENAH: Star = { ra: 20.77, dec: 33.97, name: 'Gienah', mag: 2.48, spectralType: 'B9III' };
const CYG_ALBIREO: Star = { ra: 19.51, dec: 27.97, name: 'Albireo', mag: 3.05, spectralType: 'K3II' };
const CYG_FAWARIS: Star = { ra: 19.75, dec: 45.13, name: 'Fawaris', mag: 2.87, spectralType: 'B9.5III' };

// Scorpius (The Scorpion)
const SCO_ANTARES: Star = { ra: 16.49, dec: -26.43, name: 'Antares', mag: 1.06, spectralType: 'M1Ib' };
const SCO_DSCHUBBA: Star = { ra: 16.005, dec: -22.62, name: 'Dschubba', mag: 2.29, spectralType: 'B0IV' };
const SCO_GRAFFIAS: Star = { ra: 16.09, dec: -19.80, name: 'Graffias', mag: 2.56, spectralType: 'B0.5V' };
const SCO_SHAULA: Star = { ra: 17.56, dec: -37.10, name: 'Shaula', mag: 1.62, spectralType: 'B1.5IV' };
const SCO_SARGAS: Star = { ra: 17.62, dec: -43.00, name: 'Sargas', mag: 1.86, spectralType: 'F1II' };
const SCO_PI: Star = { ra: 15.98, dec: -26.11, name: 'Pi Scorpii', mag: 2.89, spectralType: 'B1V' };
const SCO_ALNIYAT: Star = { ra: 16.35, dec: -25.59, name: 'Alniyat', mag: 2.82, spectralType: 'B1III' };
const SCO_EPSILON: Star = { ra: 16.84, dec: -34.29, name: 'Epsilon Scorpii', mag: 2.29, spectralType: 'K2III' };

// Lyra (The Lyre)
const LYR_VEGA: Star = { ra: 18.615, dec: 38.78, name: 'Vega', mag: 0.03, spectralType: 'A0V' };
const LYR_SULAFAT: Star = { ra: 18.98, dec: 32.69, name: 'Sulafat', mag: 3.22, spectralType: 'B9III' };
const LYR_SHELIAK: Star = { ra: 18.83, dec: 33.36, name: 'Sheliak', mag: 3.45, spectralType: 'B7II' };
const LYR_ZETA: Star = { ra: 18.74, dec: 37.60, name: 'Zeta Lyrae', mag: 4.34, spectralType: 'A3V' };
const LYR_DELTA2: Star = { ra: 18.90, dec: 36.90, name: 'Delta2 Lyrae', mag: 4.22, spectralType: 'M4II' };

// Aquila (The Eagle)
const AQL_ALTAIR: Star = { ra: 19.846, dec: 8.87, name: 'Altair', mag: 0.76, spectralType: 'A7V' };
const AQL_TARAZED: Star = { ra: 19.77, dec: 10.61, name: 'Tarazed', mag: 2.72, spectralType: 'K3II' };
const AQL_ALSHAIN: Star = { ra: 19.92, dec: 6.40, name: 'Alshain', mag: 3.71, spectralType: 'G8IV' };
const AQL_ZETA: Star = { ra: 19.09, dec: 13.86, name: 'Zeta Aquilae', mag: 2.99, spectralType: 'A0V' };
const AQL_THETA: Star = { ra: 20.18, dec: -0.82, name: 'Theta Aquilae', mag: 3.23, spectralType: 'B9.5III' };
const AQL_LAMBDA: Star = { ra: 19.11, dec: -4.86, name: 'Lambda Aquilae', mag: 3.43, spectralType: 'B9V' };

// Crux (The Southern Cross)
const CRU_ACRUX: Star = { ra: 12.44, dec: -63.10, name: 'Acrux', mag: 0.77, spectralType: 'B0.5IV' };
const CRU_MIMOSA: Star = { ra: 12.79, dec: -59.69, name: 'Mimosa', mag: 1.25, spectralType: 'B0.5IV' };
const CRU_GACRUX: Star = { ra: 12.52, dec: -57.11, name: 'Gacrux', mag: 1.63, spectralType: 'M3III' };
const CRU_DELTA: Star = { ra: 12.25, dec: -58.75, name: 'Delta Crucis', mag: 2.79, spectralType: 'B2IV' };

// Taurus (The Bull)
const TAU_ALDEBARAN: Star = { ra: 4.598, dec: 16.51, name: 'Aldebaran', mag: 0.87, spectralType: 'K5III' };
const TAU_ELNATH: Star = { ra: 5.438, dec: 28.60, name: 'Elnath', mag: 1.65, spectralType: 'B7III' };
const TAU_ZETA: Star = { ra: 5.627, dec: 21.14, name: 'Zeta Tauri', mag: 2.97, spectralType: 'B2III' };
const TAU_AIN: Star = { ra: 4.47, dec: 19.18, name: 'Ain', mag: 3.53, spectralType: 'K0III' };
const TAU_GAMMA: Star = { ra: 4.33, dec: 15.63, name: 'Gamma Tauri', mag: 3.65, spectralType: 'G8III' };

// Gemini (The Twins)
const GEM_CASTOR: Star = { ra: 7.57, dec: 31.89, name: 'Castor', mag: 1.58, spectralType: 'A1V' };
const GEM_POLLUX: Star = { ra: 7.755, dec: 28.02, name: 'Pollux', mag: 1.14, spectralType: 'K0III' };
const GEM_ALHENA: Star = { ra: 6.63, dec: 16.40, name: 'Alhena', mag: 1.93, spectralType: 'A1IV' };
const GEM_WASAT: Star = { ra: 7.33, dec: 21.98, name: 'Wasat', mag: 3.50, spectralType: 'F0III' };
const GEM_MEBSUTA: Star = { ra: 6.73, dec: 25.13, name: 'Mebsuta', mag: 3.06, spectralType: 'G8Ib' };
const GEM_MU: Star = { ra: 6.38, dec: 22.50, name: 'Mu Geminorum', mag: 2.87, spectralType: 'M3III' };

// Pegasus (The Winged Horse)
const PEG_MARKAB: Star = { ra: 23.08, dec: 15.20, name: 'Markab', mag: 2.49, spectralType: 'B9III' };
const PEG_SCHEAT: Star = { ra: 23.06, dec: 28.08, name: 'Scheat', mag: 2.42, spectralType: 'M2II' };
const PEG_ALGENIB: Star = { ra: 0.22, dec: 15.18, name: 'Algenib', mag: 2.83, spectralType: 'B2IV' };
const AND_ALPHERATZ: Star = { ra: 0.14, dec: 29.09, name: 'Alpheratz', mag: 2.06, spectralType: 'B8IV' }; // Andromeda but makes the square
const PEG_ENIF: Star = { ra: 21.73, dec: 9.87, name: 'Enif', mag: 2.39, spectralType: 'K2Ib' };
const PEG_HOMAM: Star = { ra: 22.69, dec: 10.83, name: 'Homam', mag: 3.41, spectralType: 'B8V' };

export const constellations: Constellation[] = [
    {
        name: 'Ursa Major',
        lines: [
            { start: UMA_MERAK, end: UMA_DUBHE },
            { start: UMA_MERAK, end: UMA_PHECDA },
            { start: UMA_PHECDA, end: UMA_MEGREZ },
            { start: UMA_MEGREZ, end: UMA_ALIOTH },
            { start: UMA_ALIOTH, end: UMA_MIZAR },
            { start: UMA_MIZAR, end: UMA_ALKAID },
        ],
    },
    {
        name: 'Orion',
        lines: [
            { start: ORI_BELLATRIX, end: ORI_BETELGEUSE },
            { start: ORI_RIGEL, end: ORI_SAIPH },
            { start: ORI_BETELGEUSE, end: ORI_ALNITAK },
            { start: ORI_BELLATRIX, end: ORI_MINTAKA },
            { start: ORI_SAIPH, end: ORI_ALNITAK },
            { start: ORI_RIGEL, end: ORI_MINTAKA },
            { start: ORI_MINTAKA, end: ORI_ALNILAM },
            { start: ORI_ALNILAM, end: ORI_ALNITAK },
        ],
    },
    {
        name: 'Cassiopeia',
        lines: [
            { start: CAS_SEGIN, end: CAS_RUCHBAH },
            { start: CAS_RUCHBAH, end: CAS_GAMMA },
            { start: CAS_GAMMA, end: CAS_SCHEDAR },
            { start: CAS_SCHEDAR, end: CAS_CAPH },
        ],
    },
    {
        name: 'Leo',
        lines: [
            { start: LEO_RAS_ELASED, end: LEO_ADHAFERA },
            { start: LEO_ADHAFERA, end: LEO_ALGIEBA },
            { start: LEO_ALGIEBA, end: LEO_REGULUS },
            { start: LEO_ALGIEBA, end: LEO_ZOSMA },
            { start: LEO_ZOSMA, end: LEO_DENEBOLA },
        ],
    },
    {
        name: 'Canis Major',
        lines: [
            { start: CMA_MIRZAM, end: CMA_SIRIUS },
            { start: CMA_SIRIUS, end: CMA_MULIPHEN },
            { start: CMA_SIRIUS, end: CMA_WEZEN },
            { start: CMA_WEZEN, end: CMA_ADHARA },
            { start: CMA_WEZEN, end: CMA_ALUDRA },
        ],
    },
    {
        name: 'Cygnus',
        lines: [
            { start: CYG_ALBIREO, end: CYG_SADR },
            { start: CYG_SADR, end: CYG_DENEB },
            { start: CYG_SADR, end: CYG_FAWARIS },
            { start: CYG_SADR, end: CYG_GIENAH },
        ],
    },
    {
        name: 'Scorpius',
        lines: [
            { start: SCO_GRAFFIAS, end: SCO_DSCHUBBA },
            { start: SCO_DSCHUBBA, end: SCO_PI },
            { start: SCO_DSCHUBBA, end: SCO_ANTARES },
            { start: SCO_ANTARES, end: SCO_ALNIYAT },
            { start: SCO_ANTARES, end: SCO_EPSILON },
            { start: SCO_EPSILON, end: SCO_SHAULA },
            { start: SCO_SHAULA, end: SCO_SARGAS },
        ]
    },
    {
        name: 'Lyra',
        lines: [
            { start: LYR_VEGA, end: LYR_ZETA },
            { start: LYR_VEGA, end: LYR_DELTA2 },
            { start: LYR_SHELIAK, end: LYR_SULAFAT },
            { start: LYR_SHELIAK, end: LYR_ZETA },
            { start: LYR_SULAFAT, end: LYR_DELTA2 },
        ]
    },
    {
        name: 'Aquila',
        lines: [
            { start: AQL_ALTAIR, end: AQL_TARAZED },
            { start: AQL_ALTAIR, end: AQL_ALSHAIN },
            { start: AQL_ALTAIR, end: AQL_ZETA },
            { start: AQL_ZETA, end: AQL_LAMBDA },
            { start: AQL_LAMBDA, end: AQL_THETA },
        ]
    },
    {
        name: 'Crux',
        lines: [
            { start: CRU_ACRUX, end: CRU_GACRUX },
            { start: CRU_MIMOSA, end: CRU_DELTA },
        ]
    },
    {
        name: 'Taurus',
        lines: [
            { start: TAU_AIN, end: TAU_ALDEBARAN },
            { start: TAU_ALDEBARAN, end: TAU_GAMMA },
            { start: TAU_ALDEBARAN, end: TAU_ZETA },
            { start: TAU_ZETA, end: TAU_ELNATH },
        ]
    },
    {
        name: 'Gemini',
        lines: [
            { start: GEM_CASTOR, end: GEM_MEBSUTA },
            { start: GEM_MEBSUTA, end: GEM_ALHENA },
            { start: GEM_ALHENA, end: GEM_MU },
            { start: GEM_POLLUX, end: GEM_WASAT },
            { start: GEM_WASAT, end: GEM_ALHENA },
        ]
    },
    {
        name: 'Pegasus',
        lines: [
            { start: PEG_SCHEAT, end: AND_ALPHERATZ },
            { start: AND_ALPHERATZ, end: PEG_ALGENIB },
            { start: PEG_ALGENIB, end: PEG_MARKAB },
            { start: PEG_MARKAB, end: PEG_SCHEAT },
            { start: PEG_MARKAB, end: PEG_HOMAM },
            { start: PEG_SCHEAT, end: PEG_ENIF },
        ]
    },
];

export const allNamedStars: (Star & { constellation: string })[] = [];
const starMap = new Map<string, Star & { constellation: string }>();

constellations.forEach(c => {
    c.lines.forEach(l => {
        [l.start, l.end].forEach(s => {
            if (s.name && !starMap.has(s.name)) {
                const starData = { ...s, constellation: c.name };
                starMap.set(s.name, starData);
                allNamedStars.push(starData);
            }
        });
    });
});
