export type GraphicsQuality = 'economy' | 'balanced' | 'high';
export interface VisualSettings { quality: GraphicsQuality; reducedMotion: boolean; }
export interface RenderProfile { fps: 20 | 30 | 60; pixelRatio: number; shadows: boolean; }

export const DEFAULT_VISUAL_SETTINGS: Readonly<VisualSettings> = Object.freeze({ quality: 'balanced', reducedMotion: false });
const PROFILES = {
  economy: { fps: 20, maxPixelRatio: 1, shadows: false },
  balanced: { fps: 30, maxPixelRatio: 1.25, shadows: true },
  high: { fps: 60, maxPixelRatio: 1.5, shadows: true },
} as const;

/** Preferences contain only these two fields; malformed fields fall back independently. */
export function parseVisualSettings(raw: string | null): VisualSettings {
  let value: unknown;
  try { value = raw === null ? null : JSON.parse(raw); } catch { value = null; }
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    quality: typeof input.quality === 'string' && Object.hasOwn(PROFILES, input.quality) ? input.quality as GraphicsQuality : DEFAULT_VISUAL_SETTINGS.quality,
    reducedMotion: typeof input.reducedMotion === 'boolean' ? input.reducedMotion : DEFAULT_VISUAL_SETTINGS.reducedMotion,
  };
}

export function getRenderProfile(quality: GraphicsQuality, devicePixelRatio: number): RenderProfile {
  const profile = Object.hasOwn(PROFILES, quality) ? PROFILES[quality] : PROFILES.balanced;
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return { fps: profile.fps, pixelRatio: Math.min(ratio, profile.maxPixelRatio), shadows: profile.shadows };
}

/** A timestamp gate, not a measured FPS counter. Reset when a suspended loop resumes. */
export class FrameBudget {
  private boundary: number | undefined;
  private fps: number | undefined;

  reset(): void { this.boundary = undefined; this.fps = undefined; }

  shouldRender(time: number, fps: number): boolean {
    if (!Number.isFinite(time) || time < 0 || !Number.isFinite(fps) || fps <= 0) return false;
    if (this.boundary === undefined || this.fps !== fps || time < this.boundary - 1e-6) {
      this.boundary = time; this.fps = fps; return true;
    }
    const interval = 1000 / fps;
    const steps = Math.floor((time - this.boundary + 1e-6) / interval);
    if (steps < 1) return false;
    // Advance the cadence across missed frames without issuing a burst of catch-up draws.
    this.boundary += steps * interval;
    return true;
  }
}
