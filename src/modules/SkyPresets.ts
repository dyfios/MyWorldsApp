/**
 * Sky Presets - Predefined sky configurations and sky configuration helper
 *
 * Supports four sky modes:
 * - 'day-night': Procedural day/night cycle with named presets
 * - 'constant-color': Procedural sky with fixed colors (no day/night transition)
 * - 'solid-color': Single solid color sky
 * - 'texture': Skybox texture
 *
 * Each procedural mode supports named presets:
 * clear, warm, cold, sunset, overcast, night, alien, void
 */

import { SkyConfig } from '../types/config';

// ============================================================================
// Types
// ============================================================================

/** RGBA color data stored as plain object (converted to engine Color at runtime) */
interface ColorData {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parameters for a day/night sky preset (maps to SetLiteDayNightSky basic tier) */
export interface DayNightSkyPresetParams {
  enableGround: boolean;
  groundColor: ColorData;
  groundHeight: number;
  dayHorizonColor: ColorData;
  daySkyColor: ColorData;
  nightHorizonColor: ColorData;
  nightSkyColor: ColorData;
  enableSun: boolean;
  sunDiameter: number;
  sunColor: ColorData;
  enableMoon: boolean;
  moonDiameter: number;
  moonColor: ColorData;
  enableStars: boolean;
  starsBrightness: number;
  starRotationSpeed: number;
  enableClouds: boolean;
  cloudsSpeed: { x: number; y: number };
  cloudiness: number;
  cloudsOpacity: number;
  cloudsDayColor: ColorData;
  cloudsNightColor: ColorData;
}

/** Parameters for a constant-color sky preset (maps to SetLiteConstantColorSky basic tier) */
export interface ConstantColorSkyPresetParams {
  enableGround: boolean;
  groundColor: ColorData;
  groundHeight: number;
  horizonColor: ColorData;
  skyColor: ColorData;
  enableSun: boolean;
  sunDiameter: number;
  sunColor: ColorData;
  enableMoon: boolean;
  moonDiameter: number;
  moonColor: ColorData;
  enableStars: boolean;
  starsBrightness: number;
  starRotationSpeed: number;
  enableClouds: boolean;
  cloudsSpeed: { x: number; y: number };
  cloudiness: number;
  cloudsOpacity: number;
  cloudsColor: ColorData;
}

// ============================================================================
// Helpers
// ============================================================================

/** Convert plain color data to engine Color */
function toColor(c: { r: number; g: number; b: number; a?: number }): Color {
  return new Color(c.r, c.g, c.b, c.a ?? 1);
}

// ============================================================================
// Day/Night Sky Presets
// ============================================================================

export const DAY_NIGHT_SKY_PRESETS: Record<string, DayNightSkyPresetParams> = {
  /** Standard bright day, blue sky, normal day/night cycle */
  'clear': {
    enableGround: true,
    groundColor: { r: 0.37, g: 0.35, b: 0.31, a: 1 },
    groundHeight: 0,
    dayHorizonColor: { r: 0.85, g: 0.92, b: 1.0, a: 1 },
    daySkyColor: { r: 0.4, g: 0.7, b: 1.0, a: 1 },
    nightHorizonColor: { r: 0.06, g: 0.06, b: 0.12, a: 1 },
    nightSkyColor: { r: 0.01, g: 0.01, b: 0.05, a: 1 },
    enableSun: true, sunDiameter: 0.05, sunColor: { r: 1, g: 0.96, b: 0.84, a: 1 },
    enableMoon: true, moonDiameter: 0.03, moonColor: { r: 0.9, g: 0.9, b: 1, a: 1 },
    enableStars: true, starsBrightness: 1.0, starRotationSpeed: 0.1,
    enableClouds: true, cloudsSpeed: { x: 0.01, y: 0.005 },
    cloudiness: 0.4, cloudsOpacity: 0.8,
    cloudsDayColor: { r: 1, g: 1, b: 1, a: 1 },
    cloudsNightColor: { r: 0.1, g: 0.1, b: 0.15, a: 1 },
  },

  /** Golden/warm tones, amber sun */
  'warm': {
    enableGround: true,
    groundColor: { r: 0.45, g: 0.35, b: 0.25, a: 1 },
    groundHeight: 0,
    dayHorizonColor: { r: 1.0, g: 0.85, b: 0.6, a: 1 },
    daySkyColor: { r: 0.55, g: 0.75, b: 0.95, a: 1 },
    nightHorizonColor: { r: 0.1, g: 0.06, b: 0.04, a: 1 },
    nightSkyColor: { r: 0.02, g: 0.01, b: 0.04, a: 1 },
    enableSun: true, sunDiameter: 0.06, sunColor: { r: 1, g: 0.88, b: 0.6, a: 1 },
    enableMoon: true, moonDiameter: 0.03, moonColor: { r: 1, g: 0.95, b: 0.85, a: 1 },
    enableStars: true, starsBrightness: 0.8, starRotationSpeed: 0.1,
    enableClouds: true, cloudsSpeed: { x: 0.008, y: 0.004 },
    cloudiness: 0.35, cloudsOpacity: 0.7,
    cloudsDayColor: { r: 1, g: 0.95, b: 0.85, a: 1 },
    cloudsNightColor: { r: 0.12, g: 0.08, b: 0.06, a: 1 },
  },

  /** Arctic/winter feel, pale blue-grey sky */
  'cold': {
    enableGround: true,
    groundColor: { r: 0.35, g: 0.38, b: 0.42, a: 1 },
    groundHeight: 0,
    dayHorizonColor: { r: 0.8, g: 0.85, b: 0.9, a: 1 },
    daySkyColor: { r: 0.65, g: 0.78, b: 0.9, a: 1 },
    nightHorizonColor: { r: 0.05, g: 0.08, b: 0.15, a: 1 },
    nightSkyColor: { r: 0.01, g: 0.02, b: 0.06, a: 1 },
    enableSun: true, sunDiameter: 0.04, sunColor: { r: 0.95, g: 0.95, b: 1, a: 1 },
    enableMoon: true, moonDiameter: 0.035, moonColor: { r: 0.85, g: 0.9, b: 1, a: 1 },
    enableStars: true, starsBrightness: 1.3, starRotationSpeed: 0.08,
    enableClouds: true, cloudsSpeed: { x: 0.015, y: 0.008 },
    cloudiness: 0.5, cloudsOpacity: 0.75,
    cloudsDayColor: { r: 0.9, g: 0.92, b: 0.95, a: 1 },
    cloudsNightColor: { r: 0.08, g: 0.1, b: 0.15, a: 1 },
  },

  /** Perpetual golden hour, deep orange horizon */
  'sunset': {
    enableGround: true,
    groundColor: { r: 0.4, g: 0.3, b: 0.25, a: 1 },
    groundHeight: 0,
    dayHorizonColor: { r: 1.0, g: 0.5, b: 0.2, a: 1 },
    daySkyColor: { r: 0.6, g: 0.4, b: 0.7, a: 1 },
    nightHorizonColor: { r: 0.15, g: 0.05, b: 0.08, a: 1 },
    nightSkyColor: { r: 0.05, g: 0.02, b: 0.1, a: 1 },
    enableSun: true, sunDiameter: 0.08, sunColor: { r: 1, g: 0.6, b: 0.3, a: 1 },
    enableMoon: true, moonDiameter: 0.03, moonColor: { r: 0.95, g: 0.85, b: 0.9, a: 1 },
    enableStars: true, starsBrightness: 0.9, starRotationSpeed: 0.1,
    enableClouds: true, cloudsSpeed: { x: 0.006, y: 0.003 },
    cloudiness: 0.45, cloudsOpacity: 0.85,
    cloudsDayColor: { r: 1, g: 0.7, b: 0.5, a: 1 },
    cloudsNightColor: { r: 0.15, g: 0.06, b: 0.1, a: 1 },
  },

  /** Cloudy/moody, heavy cloud cover */
  'overcast': {
    enableGround: true,
    groundColor: { r: 0.3, g: 0.3, b: 0.3, a: 1 },
    groundHeight: 0,
    dayHorizonColor: { r: 0.7, g: 0.7, b: 0.72, a: 1 },
    daySkyColor: { r: 0.6, g: 0.62, b: 0.65, a: 1 },
    nightHorizonColor: { r: 0.05, g: 0.05, b: 0.07, a: 1 },
    nightSkyColor: { r: 0.02, g: 0.02, b: 0.04, a: 1 },
    enableSun: false, sunDiameter: 0.04, sunColor: { r: 1, g: 1, b: 0.9, a: 1 },
    enableMoon: false, moonDiameter: 0.03, moonColor: { r: 0.8, g: 0.8, b: 0.9, a: 1 },
    enableStars: false, starsBrightness: 0.2, starRotationSpeed: 0.1,
    enableClouds: true, cloudsSpeed: { x: 0.02, y: 0.01 },
    cloudiness: 0.85, cloudsOpacity: 0.95,
    cloudsDayColor: { r: 0.75, g: 0.75, b: 0.78, a: 1 },
    cloudsNightColor: { r: 0.08, g: 0.08, b: 0.1, a: 1 },
  },

  /** Permanent night, bright moon and stars */
  'night': {
    enableGround: true,
    groundColor: { r: 0.15, g: 0.15, b: 0.2, a: 1 },
    groundHeight: 0,
    dayHorizonColor: { r: 0.04, g: 0.04, b: 0.08, a: 1 },
    daySkyColor: { r: 0.02, g: 0.02, b: 0.06, a: 1 },
    nightHorizonColor: { r: 0.04, g: 0.04, b: 0.1, a: 1 },
    nightSkyColor: { r: 0.01, g: 0.01, b: 0.05, a: 1 },
    enableSun: false, sunDiameter: 0.04, sunColor: { r: 1, g: 0.9, b: 0.8, a: 1 },
    enableMoon: true, moonDiameter: 0.045, moonColor: { r: 0.9, g: 0.92, b: 1, a: 1 },
    enableStars: true, starsBrightness: 1.5, starRotationSpeed: 0.05,
    enableClouds: true, cloudsSpeed: { x: 0.005, y: 0.003 },
    cloudiness: 0.25, cloudsOpacity: 0.5,
    cloudsDayColor: { r: 0.15, g: 0.15, b: 0.2, a: 1 },
    cloudsNightColor: { r: 0.1, g: 0.1, b: 0.15, a: 1 },
  },

  /** Otherworldly green/purple tones */
  'alien': {
    enableGround: true,
    groundColor: { r: 0.2, g: 0.3, b: 0.25, a: 1 },
    groundHeight: 0,
    dayHorizonColor: { r: 0.6, g: 0.3, b: 0.8, a: 1 },
    daySkyColor: { r: 0.2, g: 0.8, b: 0.6, a: 1 },
    nightHorizonColor: { r: 0.0, g: 0.1, b: 0.15, a: 1 },
    nightSkyColor: { r: 0.05, g: 0.0, b: 0.1, a: 1 },
    enableSun: true, sunDiameter: 0.06, sunColor: { r: 0.7, g: 1, b: 0.8, a: 1 },
    enableMoon: true, moonDiameter: 0.04, moonColor: { r: 0.8, g: 0.6, b: 1, a: 1 },
    enableStars: true, starsBrightness: 1.2, starRotationSpeed: 0.15,
    enableClouds: true, cloudsSpeed: { x: 0.012, y: 0.008 },
    cloudiness: 0.3, cloudsOpacity: 0.6,
    cloudsDayColor: { r: 0.7, g: 0.9, b: 0.8, a: 1 },
    cloudsNightColor: { r: 0.1, g: 0.05, b: 0.15, a: 1 },
  },

  /** Minimal space-like, black sky with bright stars */
  'void': {
    enableGround: false,
    groundColor: { r: 0, g: 0, b: 0, a: 1 },
    groundHeight: 0,
    dayHorizonColor: { r: 0.02, g: 0.02, b: 0.02, a: 1 },
    daySkyColor: { r: 0, g: 0, b: 0, a: 1 },
    nightHorizonColor: { r: 0.02, g: 0.02, b: 0.02, a: 1 },
    nightSkyColor: { r: 0, g: 0, b: 0, a: 1 },
    enableSun: false, sunDiameter: 0.04, sunColor: { r: 1, g: 1, b: 1, a: 1 },
    enableMoon: false, moonDiameter: 0.03, moonColor: { r: 1, g: 1, b: 1, a: 1 },
    enableStars: true, starsBrightness: 2.0, starRotationSpeed: 0.02,
    enableClouds: false, cloudsSpeed: { x: 0, y: 0 },
    cloudiness: 0, cloudsOpacity: 0,
    cloudsDayColor: { r: 0, g: 0, b: 0, a: 1 },
    cloudsNightColor: { r: 0, g: 0, b: 0, a: 1 },
  },
};

// ============================================================================
// Constant-Color Sky Presets
// ============================================================================

export const CONSTANT_COLOR_SKY_PRESETS: Record<string, ConstantColorSkyPresetParams> = {
  /** Standard bright blue sky */
  'clear': {
    enableGround: true,
    groundColor: { r: 0.37, g: 0.35, b: 0.31, a: 1 },
    groundHeight: 0,
    horizonColor: { r: 0.85, g: 0.92, b: 1.0, a: 1 },
    skyColor: { r: 0.4, g: 0.7, b: 1.0, a: 1 },
    enableSun: true, sunDiameter: 0.05, sunColor: { r: 1, g: 0.96, b: 0.84, a: 1 },
    enableMoon: false, moonDiameter: 0.03, moonColor: { r: 0.9, g: 0.9, b: 1, a: 1 },
    enableStars: false, starsBrightness: 0.5, starRotationSpeed: 0.1,
    enableClouds: true, cloudsSpeed: { x: 0.01, y: 0.005 },
    cloudiness: 0.4, cloudsOpacity: 0.8,
    cloudsColor: { r: 1, g: 1, b: 1, a: 1 },
  },

  /** Golden warm tones */
  'warm': {
    enableGround: true,
    groundColor: { r: 0.45, g: 0.35, b: 0.25, a: 1 },
    groundHeight: 0,
    horizonColor: { r: 1.0, g: 0.85, b: 0.6, a: 1 },
    skyColor: { r: 0.55, g: 0.75, b: 0.95, a: 1 },
    enableSun: true, sunDiameter: 0.06, sunColor: { r: 1, g: 0.88, b: 0.6, a: 1 },
    enableMoon: false, moonDiameter: 0.03, moonColor: { r: 1, g: 0.95, b: 0.85, a: 1 },
    enableStars: false, starsBrightness: 0.5, starRotationSpeed: 0.1,
    enableClouds: true, cloudsSpeed: { x: 0.008, y: 0.004 },
    cloudiness: 0.35, cloudsOpacity: 0.7,
    cloudsColor: { r: 1, g: 0.95, b: 0.85, a: 1 },
  },

  /** Arctic/winter feel */
  'cold': {
    enableGround: true,
    groundColor: { r: 0.35, g: 0.38, b: 0.42, a: 1 },
    groundHeight: 0,
    horizonColor: { r: 0.8, g: 0.85, b: 0.9, a: 1 },
    skyColor: { r: 0.65, g: 0.78, b: 0.9, a: 1 },
    enableSun: true, sunDiameter: 0.04, sunColor: { r: 0.95, g: 0.95, b: 1, a: 1 },
    enableMoon: false, moonDiameter: 0.03, moonColor: { r: 0.85, g: 0.9, b: 1, a: 1 },
    enableStars: false, starsBrightness: 0.5, starRotationSpeed: 0.08,
    enableClouds: true, cloudsSpeed: { x: 0.015, y: 0.008 },
    cloudiness: 0.5, cloudsOpacity: 0.75,
    cloudsColor: { r: 0.9, g: 0.92, b: 0.95, a: 1 },
  },

  /** Perpetual golden hour */
  'sunset': {
    enableGround: true,
    groundColor: { r: 0.4, g: 0.3, b: 0.25, a: 1 },
    groundHeight: 0,
    horizonColor: { r: 1.0, g: 0.5, b: 0.2, a: 1 },
    skyColor: { r: 0.6, g: 0.4, b: 0.7, a: 1 },
    enableSun: true, sunDiameter: 0.08, sunColor: { r: 1, g: 0.6, b: 0.3, a: 1 },
    enableMoon: false, moonDiameter: 0.03, moonColor: { r: 0.95, g: 0.85, b: 0.9, a: 1 },
    enableStars: false, starsBrightness: 0.5, starRotationSpeed: 0.1,
    enableClouds: true, cloudsSpeed: { x: 0.006, y: 0.003 },
    cloudiness: 0.45, cloudsOpacity: 0.85,
    cloudsColor: { r: 1, g: 0.7, b: 0.5, a: 1 },
  },

  /** Cloudy/moody grey sky */
  'overcast': {
    enableGround: true,
    groundColor: { r: 0.3, g: 0.3, b: 0.3, a: 1 },
    groundHeight: 0,
    horizonColor: { r: 0.7, g: 0.7, b: 0.72, a: 1 },
    skyColor: { r: 0.6, g: 0.62, b: 0.65, a: 1 },
    enableSun: false, sunDiameter: 0.04, sunColor: { r: 1, g: 1, b: 0.9, a: 1 },
    enableMoon: false, moonDiameter: 0.03, moonColor: { r: 0.8, g: 0.8, b: 0.9, a: 1 },
    enableStars: false, starsBrightness: 0.2, starRotationSpeed: 0.1,
    enableClouds: true, cloudsSpeed: { x: 0.02, y: 0.01 },
    cloudiness: 0.85, cloudsOpacity: 0.95,
    cloudsColor: { r: 0.75, g: 0.75, b: 0.78, a: 1 },
  },

  /** Dark night sky with bright moon and stars */
  'night': {
    enableGround: true,
    groundColor: { r: 0.15, g: 0.15, b: 0.2, a: 1 },
    groundHeight: 0,
    horizonColor: { r: 0.04, g: 0.04, b: 0.1, a: 1 },
    skyColor: { r: 0.01, g: 0.01, b: 0.05, a: 1 },
    enableSun: false, sunDiameter: 0.04, sunColor: { r: 1, g: 0.9, b: 0.8, a: 1 },
    enableMoon: true, moonDiameter: 0.045, moonColor: { r: 0.9, g: 0.92, b: 1, a: 1 },
    enableStars: true, starsBrightness: 1.5, starRotationSpeed: 0.05,
    enableClouds: true, cloudsSpeed: { x: 0.005, y: 0.003 },
    cloudiness: 0.25, cloudsOpacity: 0.5,
    cloudsColor: { r: 0.1, g: 0.1, b: 0.15, a: 1 },
  },

  /** Otherworldly green/purple tones */
  'alien': {
    enableGround: true,
    groundColor: { r: 0.2, g: 0.3, b: 0.25, a: 1 },
    groundHeight: 0,
    horizonColor: { r: 0.6, g: 0.3, b: 0.8, a: 1 },
    skyColor: { r: 0.2, g: 0.8, b: 0.6, a: 1 },
    enableSun: true, sunDiameter: 0.06, sunColor: { r: 0.7, g: 1, b: 0.8, a: 1 },
    enableMoon: true, moonDiameter: 0.04, moonColor: { r: 0.8, g: 0.6, b: 1, a: 1 },
    enableStars: true, starsBrightness: 1.2, starRotationSpeed: 0.15,
    enableClouds: true, cloudsSpeed: { x: 0.012, y: 0.008 },
    cloudiness: 0.3, cloudsOpacity: 0.6,
    cloudsColor: { r: 0.7, g: 0.9, b: 0.8, a: 1 },
  },

  /** Minimal black sky with bright stars */
  'void': {
    enableGround: false,
    groundColor: { r: 0, g: 0, b: 0, a: 1 },
    groundHeight: 0,
    horizonColor: { r: 0.02, g: 0.02, b: 0.02, a: 1 },
    skyColor: { r: 0, g: 0, b: 0, a: 1 },
    enableSun: false, sunDiameter: 0.04, sunColor: { r: 1, g: 1, b: 1, a: 1 },
    enableMoon: false, moonDiameter: 0.03, moonColor: { r: 1, g: 1, b: 1, a: 1 },
    enableStars: true, starsBrightness: 2.0, starRotationSpeed: 0.02,
    enableClouds: false, cloudsSpeed: { x: 0, y: 0 },
    cloudiness: 0, cloudsOpacity: 0,
    cloudsColor: { r: 0, g: 0, b: 0, a: 1 },
  },
};

// ============================================================================
// Internal helpers
// ============================================================================

function applyDayNightPreset(presetName: string, sunEntity: LightEntity): void {
  const preset = DAY_NIGHT_SKY_PRESETS[presetName];
  if (!preset) {
    Logging.LogWarning('[SkyPresets] Unknown day-night preset: "' + presetName + '", using "clear"');
    applyDayNightParams(DAY_NIGHT_SKY_PRESETS['clear'], sunEntity);
    return;
  }
  Logging.Log('[SkyPresets] Applying day-night preset: "' + presetName + '"');
  applyDayNightParams(preset, sunEntity);
}

function applyDayNightParams(p: DayNightSkyPresetParams, sunEntity: LightEntity): void {
  Environment.SetLiteDayNightSky(
    sunEntity,
    p.enableGround, toColor(p.groundColor), p.groundHeight,
    toColor(p.dayHorizonColor), toColor(p.daySkyColor),
    toColor(p.nightHorizonColor), toColor(p.nightSkyColor),
    p.enableSun, p.sunDiameter, toColor(p.sunColor),
    p.enableMoon, p.moonDiameter, toColor(p.moonColor),
    p.enableStars, p.starsBrightness, p.starRotationSpeed,
    p.enableClouds, new Vector2(p.cloudsSpeed.x, p.cloudsSpeed.y),
    p.cloudiness, p.cloudsOpacity,
    toColor(p.cloudsDayColor), toColor(p.cloudsNightColor)
  );
}

function applyConstantColorPreset(presetName: string, sunEntity: LightEntity): void {
  const preset = CONSTANT_COLOR_SKY_PRESETS[presetName];
  if (!preset) {
    Logging.LogWarning('[SkyPresets] Unknown constant-color preset: "' + presetName + '", using "clear"');
    applyConstantColorParams(CONSTANT_COLOR_SKY_PRESETS['clear'], sunEntity);
    return;
  }
  Logging.Log('[SkyPresets] Applying constant-color preset: "' + presetName + '"');
  applyConstantColorParams(preset, sunEntity);
}

function applyConstantColorParams(p: ConstantColorSkyPresetParams, sunEntity: LightEntity): void {
  Environment.SetLiteConstantColorSky(
    sunEntity,
    p.enableGround, toColor(p.groundColor), p.groundHeight,
    toColor(p.horizonColor), toColor(p.skyColor),
    p.enableSun, p.sunDiameter, toColor(p.sunColor),
    p.enableMoon, p.moonDiameter, toColor(p.moonColor),
    p.enableStars, p.starsBrightness, p.starRotationSpeed,
    p.enableClouds, new Vector2(p.cloudsSpeed.x, p.cloudsSpeed.y),
    p.cloudiness, p.cloudsOpacity,
    toColor(p.cloudsColor)
  );
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Apply sky configuration to the world environment.
 *
 * @param skyConfig Sky configuration object (from world.json or worldMetadata).
 *   If null/undefined, engine defaults are applied.
 * @param sunEntity Sun light entity (required for day-night and constant-color modes,
 *   may be null for texture and solid-color modes).
 */
export function applySkyConfig(skyConfig: SkyConfig | undefined | null, sunEntity: LightEntity | null): void {
  if (!skyConfig) {
    // No sky config provided - apply engine defaults
    if (sunEntity) {
      Logging.Log('[SkyPresets] No sky config provided, using engine defaults');
      Environment.SetLiteDayNightSky(sunEntity);
    } else {
      Logging.LogWarning('[SkyPresets] No sky config and no sun entity - sky not configured');
    }
    return;
  }

  const type = skyConfig.type || 'day-night';
  Logging.Log('[SkyPresets] Applying sky config: type=' + type
    + (skyConfig.preset ? ', preset=' + skyConfig.preset : ''));

  switch (type) {
    case 'texture':
      if (skyConfig.texture) {
        Environment.SetSkyTexture(skyConfig.texture);
      } else {
        Logging.LogWarning('[SkyPresets] Sky type is "texture" but no texture URI provided');
      }
      break;

    case 'solid-color': {
      const c = skyConfig.color;
      if (c) {
        Environment.SetSolidColorSky(toColor(c));
      } else {
        Logging.LogWarning('[SkyPresets] Sky type is "solid-color" but no color provided');
      }
      break;
    }

    case 'constant-color':
      if (sunEntity) {
        applyConstantColorPreset(skyConfig.preset || 'clear', sunEntity);
      } else {
        Logging.LogWarning('[SkyPresets] Sky type "constant-color" requires a sun entity');
      }
      break;

    case 'day-night':
    default:
      if (sunEntity) {
        applyDayNightPreset(skyConfig.preset || 'clear', sunEntity);
      } else {
        Logging.LogWarning('[SkyPresets] Sky type "day-night" requires a sun entity');
      }
      break;
  }

  // Apply fog if configured
  if (skyConfig.fog?.enabled) {
    const fogColor = skyConfig.fog.color
      ? toColor(skyConfig.fog.color)
      : new Color(0.7, 0.7, 0.8, 1);
    Environment.ActivateLiteFog(fogColor, skyConfig.fog.density ?? 0.01);
    Logging.Log('[SkyPresets] Fog enabled: density=' + (skyConfig.fog.density ?? 0.01));
  }
}
