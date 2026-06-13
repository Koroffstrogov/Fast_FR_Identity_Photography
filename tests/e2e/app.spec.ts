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

  const sheetCanvas = page.getByLabel("Apercu planche A4 imprimable");
  await expect(sheetCanvas).toHaveAttribute("width", "2480");
  await expect(sheetCanvas).toHaveAttribute("height", "3508");

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
  await expect(page.getByRole("button", { name: "Export planche A4" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Imprimer A4" })).toBeEnabled();
  await expect(page.getByLabel("Afficher le guide visage")).toBeChecked();

  const photoDataBeforeGuideToggle = await canvas.evaluate((node) =>
    (node as HTMLCanvasElement).toDataURL("image/jpeg"),
  );
  const sheetDataBeforeGuideToggle = await sheetCanvas.evaluate((node) =>
    (node as HTMLCanvasElement).toDataURL("image/jpeg"),
  );

  await page.getByLabel("Afficher le guide visage").uncheck();
  await expect(page.getByLabel("Afficher le guide visage")).not.toBeChecked();
  expect(
    await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL("image/jpeg")),
  ).toBe(photoDataBeforeGuideToggle);
  expect(
    await sheetCanvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL("image/jpeg")),
  ).toBe(sheetDataBeforeGuideToggle);

  await page.getByLabel("Afficher le guide visage").check();
  await page.getByRole("slider", { name: "Opacite du guide" }).evaluate((input) => {
    const range = input as HTMLInputElement;
    range.value = "0.35";
    range.dispatchEvent(new Event("input", { bubbles: true }));
    range.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(
    await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL("image/jpeg")),
  ).toBe(photoDataBeforeGuideToggle);

  await page.getByRole("spinbutton", { name: "Nombre de photos" }).fill("5");
  await expect(page.getByRole("spinbutton", { name: "Nombre de photos" })).toHaveValue("5");

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
    await page.mouse.wheel(0, -240);
    await expect
      .poll(async () => Number(await page.getByRole("slider", { name: "Zoom" }).inputValue()))
      .not.toBe(1.5);

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
