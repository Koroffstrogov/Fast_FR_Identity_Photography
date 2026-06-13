import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

const SAMPLE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8Dwn4GBgYGJAQoAHxcCAtSdd8QAAAAASUVORK5CYII=",
  "base64",
);

test("loads multiple local images, edits the active photo, and previews a multi-person sheet", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /photo d'identite/i })).toBeVisible();

  const canvas = page.getByLabel("Apercu photo 35 par 45 millimetres");
  await expect(canvas).toHaveAttribute("width", "413");
  await expect(canvas).toHaveAttribute("height", "531");

  const sheetCanvas = page.getByLabel("Apercu planche A4 imprimable");
  await expect(sheetCanvas).toHaveAttribute("width", "2480");
  await expect(sheetCanvas).toHaveAttribute("height", "3508");

  const finalPreviewCanvas = page.getByLabel("Apercu photo finale 35 par 45 millimetres");
  await expect(finalPreviewCanvas).toHaveAttribute("width", "413");
  await expect(finalPreviewCanvas).toHaveAttribute("height", "531");

  const requestsAfterLoad: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());

    if (url.protocol === "http:" || url.protocol === "https:") {
      requestsAfterLoad.push(request.url());
    }
  });

  await page.getByLabel("Images locales").setInputFiles([
    {
      name: "alice.png",
      mimeType: "image/png",
      buffer: SAMPLE_PNG,
    },
    {
      name: "bob.png",
      mimeType: "image/png",
      buffer: SAMPLE_PNG,
    },
  ]);

  await expect(page.getByText("alice.png")).toBeVisible();
  await expect(page.getByText("bob.png")).toBeVisible();
  await expect(page.getByText("2 images importees.")).toBeVisible();
  await expect(page.getByText("Total demande : 2 / 30 places.")).toBeVisible();

  await page.getByRole("textbox", { name: "Prenom alice.png", exact: true }).fill("Alice");
  await page.getByRole("textbox", { name: "Nom alice.png", exact: true }).fill("Dupont");
  await page.getByLabel("Usage alice.png").selectOption("college");
  await page.getByRole("button", { name: "Generer nom affiche" }).first().click();

  await page.getByRole("textbox", { name: "Prenom bob.png", exact: true }).fill("Éléa");
  await page.getByRole("textbox", { name: "Nom bob.png", exact: true }).fill("Sport");
  await page.getByLabel("Usage bob.png").selectOption("sport");
  await page.getByRole("button", { name: "Generer nom affiche" }).nth(1).click();

  await page.getByLabel("Modele de nommage").selectOption("lastFirstIdentity");
  await expect(page.getByText("Fichier : sport_elea_photo-identite.jpg")).toBeVisible();

  await page.getByRole("spinbutton", { name: "Copies alice.png" }).fill("4");
  await page.getByRole("spinbutton", { name: "Copies bob.png" }).fill("6");
  await expect(page.getByText("Total demande : 10 / 30 places.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export planche A4" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Imprimer A4" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Exporter toutes les photos en ZIP" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Telecharger separement" })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Photo finale 35x45" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Apercu planche A4" })).toBeVisible();

  await page.locator('input[name="sheet-mode"][value="comfort"]').check({ force: true });
  await expect(page.getByText("Total demande : 10 / 25 places.")).toBeVisible();
  await page.locator('input[name="sheet-mode"][value="standard"]').check({ force: true });
  await expect(page.getByText("Total demande : 10 / 30 places.")).toBeVisible();

  await page.getByRole("button", { name: "Choisir bob.png" }).click();
  await expect(page.getByRole("heading", { name: "Éléa Sport" })).toBeVisible();
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
    await canvas.dispatchEvent("wheel", {
      deltaY: -240,
      clientX: canvasBox.x + canvasBox.width / 2,
      clientY: canvasBox.y + canvasBox.height / 2,
      bubbles: true,
      cancelable: true,
    });
    await expect
      .poll(async () => Number(await page.getByRole("slider", { name: "Zoom" }).inputValue()))
      .not.toBe(1.5);

    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width / 2 + 20,
      canvasBox.y + canvasBox.height / 2 + 10,
    );
    await page.mouse.up();
  }

  await expect
    .poll(async () => (await sheetCanvas.evaluate((node) =>
      (node as HTMLCanvasElement).toDataURL("image/jpeg"),
    )).length)
    .toBeGreaterThan(1000);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JPEG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("sport_elea_photo-identite.jpg");
  expect(requestsAfterLoad).toEqual([]);
});
