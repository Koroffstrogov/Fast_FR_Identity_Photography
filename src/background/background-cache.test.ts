import { describe, expect, it } from "vitest";
import { DEFAULT_IMAGE_TRANSFORM } from "../core/geometry";
import { getDefaultBackgroundEditState } from "../core/photo-project";
import {
  createBackgroundCompositionCacheKey,
  createPostProcessedMaskCacheKey,
  createRawMaskCacheKey,
} from "./background-cache";

describe("background cache keys", () => {
  it("invalidates the raw mask key when the source photo changes", () => {
    const imageSize = { width: 1200, height: 1600 };

    expect(createRawMaskCacheKey({ photoId: "a", imageSize })).not.toBe(
      createRawMaskCacheKey({ photoId: "b", imageSize }),
    );
  });

  it("keeps color changes out of the post-processed mask key", () => {
    const edit = getDefaultBackgroundEditState();
    const blueEdit = { ...edit, replacementColor: "#dbeafe" };

    expect(createPostProcessedMaskCacheKey(edit)).toBe(
      createPostProcessedMaskCacheKey(blueEdit),
    );
  });

  it("changes the post-processed mask key when alpha settings change", () => {
    const edit = getDefaultBackgroundEditState();

    expect(createPostProcessedMaskCacheKey(edit)).not.toBe(
      createPostProcessedMaskCacheKey({ ...edit, threshold: 0.7 }),
    );
  });

  it("changes only the composition key when the replacement color changes", () => {
    const rawKey = "raw";
    const postKey = "post";

    expect(
      createBackgroundCompositionCacheKey(
        rawKey,
        postKey,
        DEFAULT_IMAGE_TRANSFORM,
        "#ffffff",
      ),
    ).not.toBe(
      createBackgroundCompositionCacheKey(
        rawKey,
        postKey,
        DEFAULT_IMAGE_TRANSFORM,
        "#eeeeee",
      ),
    );
  });
});
