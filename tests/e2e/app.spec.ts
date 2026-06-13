import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

const SAMPLE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8Dwn4GBgYGJAQoAHxcCAtSdd8QAAAAASUVORK5CYII=",
  "base64",
);

test("loads a local image, adjusts it, and exports the expected JPEG", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /photo d'identite/i })).toBeVisible();

  const canvas = page.getByLabel("Apercu photo 35 par 45 millimetres");
  await expect(canvas).toHaveAttribute("width", "413");
  await expect(canvas).toHaveAttribute("height", "531");

  const requestsAfterLoad: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());

    if (url.protocol === "http:" || url.protocol === "https:") {
      requestsAfterLoad.push(request.url());
    }
  });

  await page.getByLabel("Image locale").setInputFiles({
    name: "sample.png",
    mimeType: "image/png",
    buffer: SAMPLE_PNG,
  });

  await expect(page.getByText("sample.png")).toBeVisible();
  await page.getByRole("slider", { name: "Zoom" }).evaluate((input) => {
    const range = input as HTMLInputElement;
    range.value = "1.5";
    range.dispatchEvent(new Event("input", { bubbles: true }));
    range.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.getByRole("slider", { name: "Rotation" }).evaluate((input) => {
    const range = input as HTMLInputElement;
    range.value = "5";
    range.dispatchEvent(new Event("input", { bubbles: true }));
    range.dispatchEvent(new Event("change", { bubbles: true }));
  });

  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();

  if (canvasBox) {
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 20, canvasBox.y + canvasBox.height / 2 + 10);
    await page.mouse.up();
  }

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JPEG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("photo-identite-413x531.jpg");
  expect(requestsAfterLoad).toEqual([]);
});
