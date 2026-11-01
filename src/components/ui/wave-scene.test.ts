import { describe, expect, it, vi } from "vitest";

import { boundedSwellStrength, createWaveScene } from "./wave-scene";
import { WAVE_PALETTE } from "@/styles/wave-palettes";

interface Point {
  x: number;
  y: number;
}

class RecordingContext {
  readonly canvas = { width: 0, height: 0 };
  fillStyle: string | CanvasGradient | CanvasPattern = "";
  readonly fills: string[] = [];
  readonly paths: Point[][] = [];
  private path: Point[] = [];

  setTransform() {}
  clearRect() {}
  beginPath() {
    this.path = [];
  }
  moveTo(x: number, y: number) {
    this.path.push({ x, y });
  }
  lineTo(x: number, y: number) {
    this.path.push({ x, y });
  }
  closePath() {}
  fill() {
    this.fills.push(String(this.fillStyle));
    this.paths.push([...this.path]);
  }
}

function setupScene() {
  const context = new RecordingContext();
  const scene = createWaveScene(
    context as unknown as CanvasRenderingContext2D,
  );
  scene.resize(1000, 800, 1);
  return { context, scene };
}

describe("createWaveScene", () => {
  it("sizes the backing store and draws four finite wave layers", () => {
    const { context, scene } = setupScene();

    scene.draw(0);

    expect(context.canvas).toEqual({ width: 1000, height: 800 });
    expect(context.paths).toHaveLength(4);
    expect(context.paths.flat()).not.toContainEqual(
      expect.objectContaining({ x: Number.NaN }),
    );
    for (const point of context.paths.flat()) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
    }
  });

  it("makes every rapid navigation react while approaching the swell ceiling", () => {
    expect(boundedSwellStrength(0)).toBe(0);
    expect(boundedSwellStrength(1)).toBeCloseTo(1);
    expect(boundedSwellStrength(2)).toBeGreaterThan(
      boundedSwellStrength(1),
    );
    expect(boundedSwellStrength(6)).toBeGreaterThan(
      boundedSwellStrength(2),
    );
    expect(boundedSwellStrength(6)).toBeLessThan(1.5);
  });

  it("drops a swell after its lifetime", () => {
    vi.spyOn(Date, "now").mockReturnValue(10_000);
    const settled = setupScene();
    const expired = setupScene();

    expired.scene.tide(0);
    settled.scene.draw(2400);
    expired.scene.draw(2400);

    expect(expired.context.paths).toEqual(settled.context.paths);
  });

  it("fills every layer with the single wave palette, swell or not", () => {
    const { context, scene } = setupScene();
    const expected = [
      WAVE_PALETTE.wave1,
      WAVE_PALETTE.wave2,
      WAVE_PALETTE.wave3,
      WAVE_PALETTE.wave4,
    ];

    scene.draw(0);
    expect(context.fills).toEqual(expected);

    scene.tide(0);
    scene.draw(320);
    expect(context.fills.slice(-4)).toEqual(expected);
  });
});
