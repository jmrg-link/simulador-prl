import { warn } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { silenceKnownThreeWarnings } from "../src/shared/three-console.ts";

describe("silenceKnownThreeWarnings", () => {
  afterEach(() => vi.restoreAllMocks());

  it("descarta el aviso de Clock obsoleto y deja pasar el resto de avisos de three", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    silenceKnownThreeWarnings();
    warn("Clock: This module has been deprecated. Please use THREE.Timer instead.");
    warn("WebGLRenderer: otro aviso que debe verse.");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toBe("THREE.WebGLRenderer: otro aviso que debe verse.");
  });
});
