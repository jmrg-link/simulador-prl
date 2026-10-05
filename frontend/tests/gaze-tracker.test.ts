import { describe, expect, it } from "vitest";
import { GazeTracker } from "../src/features/headset/gaze-tracker.ts";

describe("GazeTracker", () => {
  it("identifica un riesgo tras la mirada sostenida y no lo repite", () => {
    const tracker = new GazeTracker(1000);
    expect(tracker.update("cable", 0)).toEqual({ target: "cable", progress: 0 });
    expect(tracker.update("cable", 500).progress).toBe(0.5);
    expect(tracker.update("cable", 1000)).toEqual({ target: "cable", progress: 1, detected: "cable" });
    expect(tracker.update("cable", 3000)).toEqual({ target: null, progress: 0 });
  });

  it("reinicia el contador al apartar la mirada", () => {
    const tracker = new GazeTracker(1000);
    tracker.update("aceite", 0);
    tracker.update(null, 900);
    tracker.update("aceite", 1000);
    expect(tracker.update("aceite", 1900).detected).toBeUndefined();
    expect(tracker.update("aceite", 2000).detected).toBe("aceite");
  });

  it("cambiar de objetivo empieza de cero", () => {
    const tracker = new GazeTracker(1000);
    tracker.update("a", 0);
    expect(tracker.update("b", 800)).toEqual({ target: "b", progress: 0 });
  });
});
