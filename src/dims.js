/**
 * src/dims.js — every dimension in the model, in metres. No magic numbers anywhere else.
 *
 * Coordinate system (shared by every scene module, the explode engine and the GLB export):
 *   +Y up. +X right (viewer's right when facing the screen). +Z toward the user (front edge).
 *   Origin at the centre of the bottom case's underside: the laptop sits on the plane y = 0.
 *   Hinge line runs along X at the rear (−Z).
 *
 * Only the outer envelope is an Apple figure (14-inch MacBook Pro, apple.com/macbook-pro/specs).
 * Everything else is a modelling estimate that keeps proportions right for teaching; internal
 * positions follow the teardown layout in PROMPTS.md (board centre-rear between the fans, battery
 * in the front two-thirds, woofers at the front corners, trackpad centre-front, vent bar between
 * the hinges). Treat these as layout anchors, not published data.
 */

export const M = 1; // model unit = metre (GLB imports into Blender at true scale)
export const MM = 0.001;

/* ---------------------------------------------------------------- outer envelope (Apple) */

export const ENVELOPE = Object.freeze({ w: 312.6 * MM, d: 221.2 * MM, h: 15.5 * MM });

/* ---------------------------------------------------------------- chassis */

export const BASE = Object.freeze({
  w: ENVELOPE.w,
  d: ENVELOPE.d,
  h: 11.8 * MM,          // bottom case underside → top case deck surface
  cornerRadius: 8 * MM,  // plan-view corner radius
  edgeRadius: 2.2 * MM,  // vertical edge fillet
  bottomPlateT: 1.2 * MM,
  wallT: 1.6 * MM,       // unibody side wall
  deckT: 1.4 * MM,       // top case deck thickness
});

/** Interior cavity between bottom plate and deck. Everything internal lives in this Y range. */
export const INTERIOR = Object.freeze({
  y0: BASE.bottomPlateT,
  y1: BASE.h - BASE.deckT,
});

export const FEET = Object.freeze({
  radius: 6 * MM,
  h: 1.0 * MM,               // protrudes below y = 0
  positions: [[-130 * MM, -92 * MM], [130 * MM, -92 * MM], [-130 * MM, 96 * MM], [130 * MM, 96 * MM]], // [x, z]
});

export const HINGE = Object.freeze({
  z: -BASE.d / 2 + 6.5 * MM, // hinge axis Z (world)
  y: BASE.h - 3.0 * MM,      // hinge axis Y (world)
  xL: -112 * MM,             // HingeL centre X
  xR: 112 * MM,
  length: 34 * MM,           // along X
  radius: 3.4 * MM,
});

export const VENT_ANTENNA_BAR = Object.freeze({
  w: 180 * MM, // between the hinges
  d: 12 * MM,
  h: 6 * MM,
  z: -BASE.d / 2 + 6 * MM,
  y: BASE.h - 5.5 * MM,
});

/* ---------------------------------------------------------------- lid (Display group, local space)
 * Display group origin = hinge axis (world x=0, y=HINGE.y, z=HINGE.z). rotation.x = -lidAngle.
 * Local +Z runs from the hinge toward the lid's free edge (the top of the screen when open).
 * Local +Y is the lid's outward normal when closed (the aluminium back); the glass faces local −Y.
 * When open at 105°, local −Y faces the user. Closed lid occupies local y ∈ [gap, gap + t].
 */

export const LID = Object.freeze({
  w: ENVELOPE.w,
  d: ENVELOPE.d,
  t: ENVELOPE.h - BASE.h,   // 3.7 mm
  gap: BASE.h - HINGE.y,    // local y of the lid underside when closed (rests on the deck)
  zRear: -6.5 * MM,         // local z of the lid's rear edge (wraps over the hinge)
  cornerRadius: 8 * MM,
  layers: Object.freeze({   // local y ranges, glass side first (nearest the deck when closed)
    glass: [0, 0.5 * MM],
    bezel: [0.5 * MM, 0.7 * MM],
    lcd: [0.7 * MM, 1.7 * MM],
    backlight: [1.7 * MM, 2.7 * MM],
    shell: [2.7 * MM, 3.7 * MM],
  }),
  restAngleDeg: 105,        // default open angle
  explodeAngleDeg: 130,     // angle reached at the end of the 'lid' explode stage
});

/** Active area of the 14.2-inch 16:10 panel, in lid-local X/Z. */
export const SCREEN = Object.freeze({
  w: 302.6 * MM,
  h: 196.5 * MM,
  zBottom: LID.zRear + 16.5 * MM,       // bottom bezel is the wide one
  get zTop() { return this.zBottom + this.h; },
  notch: Object.freeze({ w: 38 * MM, h: 6.5 * MM }), // intrudes into the top of the active area, centred
  cameraRadius: 3 * MM,
});

/* ---------------------------------------------------------------- interior layout zones (plan view, world X/Z) */

export const KEYBOARD = Object.freeze({
  x0: -140 * MM, x1: 140 * MM,
  z0: -98 * MM, z1: 6 * MM,             // rear → front
  pitch: 19 * MM,
  keyW: 16.5 * MM, keyD: 16.5 * MM,
  fnRowD: 8.5 * MM,
  keyH: 1.2 * MM,                       // keycap height above the deck
  travel: 1.0 * MM,
  wellDepth: 1.5 * MM,                  // recess in the deck
});

export const TRACKPAD = Object.freeze({
  w: 130 * MM, d: 83 * MM,
  cx: 0, cz: 56.5 * MM,
  glassT: 0.8 * MM,
  plateT: 1.2 * MM,
  tapticSize: [30 * MM, 4 * MM, 10 * MM], // w, h, d
});

export const SPEAKER_GRILLE = Object.freeze({
  w: 12 * MM,
  z0: KEYBOARD.z0, z1: KEYBOARD.z1,
  xL: -150 * MM, xR: 150 * MM,
  holePitch: 1.6 * MM,
});

export const LOGIC_BOARD = Object.freeze({
  x0: -85 * MM, x1: 85 * MM,
  z0: -98 * MM, z1: -35 * MM,
  y: INTERIOR.y0 + 3.5 * MM,            // PCB centre plane
  t: 1.0 * MM,
  cornerRadius: 3 * MM,
});

export const SOC = Object.freeze({
  cx: 0, cz: -66 * MM,                  // package centre on the board
  substrate: Object.freeze({ w: 48 * MM, d: 32 * MM, t: 0.7 * MM }),
  dieT: 0.7 * MM,
  spreaderT: 0.5 * MM,
  spreaderMargin: 1.5 * MM,             // spreader overhang beyond the die
  lpddr: Object.freeze({ w: 12 * MM, d: 14 * MM, t: 1.1 * MM, gapFromDie: 2.0 * MM }),
  /** Die side length from die_mm2: sqrt(mm²) mm. Fallback when null: from GPU core count. */
  dieSideFromMm2: (mm2) => Math.sqrt(mm2) * MM,
  dieSideFromGpuCores: (cores) => (8 + 0.2 * cores) * MM,
  dieSideMin: 8 * MM,
  dieSideMax: 24 * MM,
  ballPitch: 0.8 * MM,                  // solder balls under the substrate
  ballRadius: 0.25 * MM,
});

export const FAN = Object.freeze({
  radius: 28 * MM,
  h: 7.5 * MM,
  bladeCount: 61,
  xL: -115 * MM, xR: 115 * MM,
  z: -70 * MM,
  y: INTERIOR.y0 + 0.5 * MM,            // fan housing bottom
});

export const HEAT_PIPE = Object.freeze({
  x0: FAN.xL + FAN.radius, x1: FAN.xR - FAN.radius,
  z: SOC.cz,
  y: LOGIC_BOARD.y + LOGIC_BOARD.t / 2 + SOC.substrate.t + SOC.dieT + SOC.spreaderT + 2.2 * MM,
  w: 8 * MM, t: 3 * MM,
});

export const HEATSINK_PLATE = Object.freeze({
  w: 64 * MM, d: 44 * MM, t: 1.5 * MM,
  cx: SOC.cx, cz: SOC.cz,
  y: HEAT_PIPE.y - 1.6 * MM,
});

export const GRAPHITE_SHEET = Object.freeze({
  w: 110 * MM, d: 60 * MM, t: 0.2 * MM,
  cx: 0, cz: SOC.cz,
  y: LOGIC_BOARD.y - LOGIC_BOARD.t / 2 - 0.4 * MM,
});

export const BATTERY = Object.freeze({
  cellT: 5.5 * MM,
  y: INTERIOR.y0 + 0.3 * MM,            // cell underside
  /** Six pouch cells: [cx, cz, w, d]. Two rows × three columns filling the front two-thirds. */
  cells: [
    [-104 * MM, -8 * MM, 88 * MM, 46 * MM], [0, -8 * MM, 100 * MM, 46 * MM], [104 * MM, -8 * MM, 88 * MM, 46 * MM],
    [-104 * MM, 62 * MM, 88 * MM, 62 * MM], [0, 66 * MM, 100 * MM, 54 * MM], [104 * MM, 62 * MM, 88 * MM, 62 * MM],
  ],
  bmsFlex: Object.freeze({ w: 120 * MM, d: 4 * MM, t: 0.3 * MM, cx: 0, cz: -32 * MM }),
});

export const AUDIO = Object.freeze({
  woofer: Object.freeze({ w: 22 * MM, d: 40 * MM, t: 2.6 * MM, xL: -136 * MM, xR: 136 * MM, z: 78 * MM, stackGap: 0.6 * MM }),
  tweeter: Object.freeze({ radius: 6 * MM, t: 2 * MM, xL: -136 * MM, xR: 136 * MM, z: 22 * MM }),
  mics: [[-148 * MM, -60 * MM], [-148 * MM, -45 * MM], [-148 * MM, -30 * MM]], // [x, z] along the left grille
  micRadius: 1.2 * MM,
});

/** Ports sit in the side walls (x = ±BASE.w/2). [z, w (along z), h] for each, centred at PORT_Y. */
export const PORT_Y = INTERIOR.y0 + 4.5 * MM;
export const PORTS = Object.freeze({
  left: Object.freeze({
    MagSafe3: [-75 * MM, 10 * MM, 3 * MM],
    'TB5[0]': [-55 * MM, 9 * MM, 3.4 * MM],
    'TB5[1]': [-40 * MM, 9 * MM, 3.4 * MM],
    HeadphoneJack: [-18 * MM, 3.6 * MM, 3.6 * MM],
  }),
  right: Object.freeze({
    SDXC: [-70 * MM, 24 * MM, 2.4 * MM],
    'TB5[2]': [-45 * MM, 9 * MM, 3.4 * MM],
    HDMI: [-25 * MM, 15 * MM, 4.6 * MM],
  }),
  depth: 12 * MM, // how far a port body reaches inward from the wall
});

export const SMALL_BOARDS = Object.freeze({
  USBCBoardL: [-135 * MM, -48 * MM, 22 * MM, 20 * MM],   // cx, cz, w, d
  USBCBoardR: [135 * MM, -45 * MM, 16 * MM, 20 * MM],
  MagSafeBoard: [-138 * MM, -75 * MM, 14 * MM, 12 * MM],
  AudioBoard: [-120 * MM, -18 * MM, 24 * MM, 14 * MM],
  t: 0.8 * MM,
});

/** Board-mounted packages: cx, cz relative to board centre plane; w, d, t. */
export const BOARD_PARTS = Object.freeze({
  NAND: [[-52 * MM, -84 * MM, 14 * MM, 12 * MM, 1.0 * MM], [52 * MM, -84 * MM, 14 * MM, 12 * MM, 1.0 * MM]],
  PMIC: [[-30 * MM, -46 * MM, 7 * MM, 7 * MM, 0.8 * MM], [30 * MM, -46 * MM, 7 * MM, 7 * MM, 0.8 * MM], [0, -42 * MM, 7 * MM, 7 * MM, 0.8 * MM]],
  ThunderboltRetimer: [[-70 * MM, -60 * MM, 5 * MM, 5 * MM, 0.7 * MM], [-70 * MM, -50 * MM, 5 * MM, 5 * MM, 0.7 * MM], [70 * MM, -55 * MM, 5 * MM, 5 * MM, 0.7 * MM]],
  WirelessModule: [-70 * MM, -88 * MM, 16 * MM, 10 * MM, 1.2 * MM],
  NORFlash: [40 * MM, -44 * MM, 4 * MM, 3 * MM, 0.6 * MM],
});

/* ---------------------------------------------------------------- explode distances (full slider) */

export const EXPLODE = Object.freeze({
  bottomCase: -40 * MM,
  feet: -46 * MM,
  battery: -18 * MM,
  trackpad: -12 * MM,
  board: 60 * MM,
  soc: 30 * MM,
  spreader: 14 * MM,
  lpddrSpread: 18 * MM,        // outward in XZ from the die centre
  thermal: 95 * MM,
  displayLayerGap: 9 * MM,     // between consecutive lid layers, along the lid normal
});

/* ---------------------------------------------------------------- software stack (hovering above the SoC) */

export const STACK = Object.freeze({
  w: 120 * MM, d: 80 * MM,
  layerT: 1.2 * MM,
  gap: 7 * MM,
  y0: BASE.h + 70 * MM,        // first layer's underside (world Y); clears the SoC lifted by the Stack preset (explode 0.5)
  cx: SOC.cx, cz: SOC.cz,
});

/* ---------------------------------------------------------------- die unit layout (fractions of the die face) */

/** [x0, z0, w, d] as fractions of the die side, origin at the die's rear-left corner. */
export const DIE_UNITS = Object.freeze({
  CPUCluster: [0.02, 0.02, 0.40, 0.44],
  GPUCores: [0.44, 0.02, 0.54, 0.62],
  NeuralEngine: [0.02, 0.48, 0.24, 0.24],
  MediaEngine: [0.28, 0.48, 0.14, 0.24],
  SecureEnclave: [0.02, 0.74, 0.14, 0.24],
  MemoryController: [0.18, 0.74, 0.24, 0.24],
  SLC: [0.44, 0.66, 0.54, 0.32],
  unitT: 0.08 * MM,            // units are thin plates on the die face
});

/* ---------------------------------------------------------------- cameras (named views) */

/** Position and target in world metres. Keys 1–7 in this order. */
export const VIEWS = Object.freeze({
  Hero: { position: [0.42, 0.30, 0.46], target: [0, 0.06, -0.02], lidAngleDeg: 105, explode: 0, stack: false },
  'Open lid': { position: [0.0, 0.26, 0.52], target: [0, 0.08, -0.04], lidAngleDeg: 100, explode: 0, stack: false },
  'Board top-down': { position: [0, 0.34, -0.066], target: [0, 0.0, -0.066], lidAngleDeg: 105, explode: 0.5, stack: false, dial: 2 },
  // Presets that carry explode > 0 target the lifted heights, not the rest pose (board +60 mm, SoC +90 mm).
  'SoC macro': { position: [0.05, 0.137, -0.006], target: [0, 0.097, -0.066], lidAngleDeg: 105, explode: 0.75, stack: false, dial: 3 },
  Thermal: { position: [0.38, 0.40, 0.32], target: [0, 0.06, -0.05], lidAngleDeg: 105, explode: 1, stack: false, dial: 2 },
  // The deck is opaque, so the battery reads from a low three-quarter front once the cells have dropped.
  Battery: { position: [0.30, 0.06, 0.48], target: [0, 0.02, 0.03], lidAngleDeg: 105, explode: 0.375, stack: false, dial: 2 },
  Stack: { position: [0.24, 0.24, 0.20], target: [0, 0.14, -0.066], lidAngleDeg: 105, explode: 0.5, stack: true, dial: 3 },
});

export const VIEW_NAMES = Object.freeze(Object.keys(VIEWS));
