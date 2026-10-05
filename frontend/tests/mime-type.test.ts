import { describe, expect, it } from "vitest";
import { CANDIDATE_MIME_TYPES, pickMimeType } from "../src/features/live/mime-type.ts";

describe("pickMimeType", () => {
  it("prefiere WebM/VP8, que es lo único que graba Firefox", () => {
    expect(pickMimeType(() => true)).toBe("video/webm;codecs=vp8");
  });

  it("cae a MP4/H.264 cuando WebM no está disponible, como en Safari", () => {
    expect(pickMimeType((type) => type.startsWith("video/mp4"))).toBe("video/mp4;codecs=avc1");
  });

  it("devuelve undefined si no hay ninguno", () => {
    expect(pickMimeType(() => false)).toBeUndefined();
    expect(CANDIDATE_MIME_TYPES).toHaveLength(3);
  });
});
