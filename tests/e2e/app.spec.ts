import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

const SAMPLE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8Dwn4GBgYGJAQoAHxcCAtSdd8QAAAAASUVORK5CYII=",
  "base64",
);

test("uses the desktop shell modes while keeping photo, sheet, background, and export flows available", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Photo ID 35x45" })).toBeVisible();

  for (const modeLabel of ["Cadrer", "Fond", "Qualite", "Planche", "Export"]) {
    await expect(page.getByRole("button", { name: modeLabel, exact: true })).toBeVisible();
  }

  const canvas = page.getByLabel("Apercu photo 35 par 45 millimetres");
  await expect(canvas).toHaveAttribute("width", "413");
  await expect(canvas).toHaveAttribute("height", "531");

  const pageOrigin = new URL(page.url()).origin;
  const externalRequestsAfterLoad: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());

    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.origin !== pageOrigin
    ) {
      externalRequestsAfterLoad.push(request.url());
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
  await expect(page.getByText("2 photos / 30 places")).toBeVisible();
  await expect(canvas).toBeVisible();

  await page.getByRole("textbox", { name: "Prenom alice.png", exact: true }).fill("Alice");
  await page.getByRole("textbox", { name: "Nom alice.png", exact: true }).fill("Dupont");
  await page.getByLabel("Usage alice.png").selectOption("college");
  await page.getByRole("button", { name: "Generer nom affiche" }).first().click();

  await page.getByRole("textbox", { name: "Prenom bob.png", exact: true }).fill("Éléa");
  await page.getByRole("textbox", { name: "Nom bob.png", exact: true }).fill("Sport");
  await page.getByLabel("Usage bob.png").selectOption("sport");
  await page.getByRole("button", { name: "Generer nom affiche" }).nth(1).click();

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByLabel("Modele de nommage").selectOption("lastFirstIdentity");
  await expect(page.getByText("Fichier : sport_elea_photo-identite.jpg")).toBeVisible();

  await page.getByRole("spinbutton", { name: "Copies alice.png" }).fill("4");
  await page.getByRole("spinbutton", { name: "Copies bob.png" }).fill("6");

  await page.getByRole("button", { name: "Planche", exact: true }).click();
  const sheetCanvas = page.getByLabel("Apercu planche A4 imprimable");
  await expect(sheetCanvas).toHaveAttribute("width", "2480");
  await expect(sheetCanvas).toHaveAttribute("height", "3508");
  await expect(page.getByText("Total demande : 10 / 30 places.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export planche A4" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Imprimer A4" })).toBeEnabled();

  await page.locator('input[name="sheet-mode"][value="comfort"]').check({ force: true });
  await expect(page.getByText("Total demande : 10 / 25 places.")).toBeVisible();
  await page.locator('input[name="sheet-mode"][value="standard"]').check({ force: true });
  await expect(page.getByText("Total demande : 10 / 30 places.")).toBeVisible();

  const sheetDataBeforeGuideToggle = await sheetCanvas.evaluate((node) =>
    (node as HTMLCanvasElement).toDataURL("image/jpeg"),
  );

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(page.getByRole("button", { name: "Export JPEG" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Exporter toutes les photos en ZIP" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Telecharger separement" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Export planche A4" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Imprimer A4" })).toBeEnabled();

  await page.getByRole("button", { name: "Cadrer", exact: true }).click();
  await page.getByRole("button", { name: "Choisir bob.png" }).click();
  await expect(page.getByRole("heading", { name: "Éléa Sport" })).toBeVisible();
  await expect(page.getByLabel("Afficher le guide visage")).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Placer les points automatiquement" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Placer les points automatiquement" }).click();
  await expect(
    page.getByText(/Impossible de charger le modele visage local|Aucun visage exploitable/),
  ).toBeVisible();

  const photoDataBeforeGuideToggle = await canvas.evaluate((node) =>
    (node as HTMLCanvasElement).toDataURL("image/jpeg"),
  );

  await page.getByLabel("Afficher le guide visage").uncheck();
  await expect(page.getByLabel("Afficher le guide visage")).not.toBeChecked();
  expect(
    await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL("image/jpeg")),
  ).toBe(photoDataBeforeGuideToggle);

  await page.getByRole("button", { name: "Planche", exact: true }).click();
  expect(
    await sheetCanvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL("image/jpeg")),
  ).toBe(sheetDataBeforeGuideToggle);

  await page.getByRole("button", { name: "Cadrer", exact: true }).click();
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

  await expect(page.getByLabel("Afficher les points du visage")).toBeChecked();
  await page.getByLabel("Afficher les points du visage").uncheck();
  await expect(page.getByLabel("Afficher les points du visage")).not.toBeChecked();
  await page.getByLabel("Afficher les points du visage").check();
  await page.getByRole("button", { name: "Placer les points du visage manuellement" }).click();
  await expect(page.getByText("Points visage : 0/3.")).toBeVisible();
  await canvas.click({ position: { x: 206, y: 239 } });
  await expect(page.getByText("1/3 point(s) visage place(s).")).toBeVisible();
  await canvas.click({ position: { x: 206, y: 398 } });
  await expect(page.getByText("2/3 point(s) visage place(s).")).toBeVisible();
  await canvas.click({ position: { x: 206, y: 120 } });
  await expect(page.getByText("3/3 point(s) visage place(s).")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cadrer a partir de points" }),
  ).toBeEnabled();
  await expect(page.getByRole("button", { name: "Deplacer un point" })).toBeEnabled();
  await page.getByRole("button", { name: "Supprimer les points" }).click();
  await expect(page.getByText("Points visage : 0/3.")).toBeVisible();

  await page.getByRole("button", { name: "Fond", exact: true }).click();
  await expect(canvas).toBeVisible();
  const backgroundGroup = page.getByRole("group", { name: "Fond" });
  await page.route("**/models/rmbg2/model.onnx", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "text/plain",
      body: "missing model",
    });
  });
  await expect(backgroundGroup.getByText("Moteur : RMBG-2.0")).toBeVisible();
  await expect(page.getByLabel("Backend fond")).toHaveValue("auto");
  await expect(backgroundGroup.getByRole("button", { name: "Supprimer le fond" })).toBeVisible();
  await backgroundGroup.getByRole("button", { name: "Charger / verifier le modele" }).click();
  await expect(page.getByText(/Modele RMBG-2.0 introuvable/).first()).toBeVisible();
  await page.getByLabel("Remplacer le fond dans les exports").check();
  await expect(page.getByLabel("Remplacer le fond dans les exports")).toBeChecked();
  await page.getByLabel("Couleur de fond").evaluate((input) => {
    const colorInput = input as HTMLInputElement;
    colorInput.value = "#dbeafe";
    colorInput.dispatchEvent(new Event("input", { bubbles: true }));
    colorInput.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page
    .locator('input[name="background-preview-mode"][value="mask-preview"]')
    .evaluate((input) => {
      const radio = input as HTMLInputElement;
      radio.checked = true;
      radio.dispatchEvent(new Event("input", { bubbles: true }));
      radio.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await page.getByRole("button", { name: "Ajouter point fond a supprimer" }).click();
  await canvas.click({ position: { x: 120, y: 120 } });
  await expect(page.getByText("Point fond ajoute.")).toBeVisible();
  await expect(page.getByText("Points : 0 personne, 1 fond.")).toBeVisible();
  await page.getByRole("button", { name: "Ajouter point fond a supprimer" }).click();
  await page.getByRole("button", { name: "Effacer les points" }).click();
  await expect(page.getByText("Points : 0 personne, 0 fond.")).toBeVisible();

  await page.getByRole("button", { name: "Qualite", exact: true }).click();
  await expect(canvas).toBeVisible();
  await expect(page.getByRole("group", { name: "Diagnostic qualite" })).toBeVisible();
  await expect(
    page.getByText("Diagnostic indicatif, ne garantit pas l'acceptation officielle."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Amelioration auto legere" }).click();
  await expect(page.getByLabel("Apercu corrige exporte")).toBeVisible();
  await page.getByRole("button", { name: "Reinitialiser qualite" }).click();
  await expect(page.getByLabel("Apercu corrige exporte")).toBeVisible();

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

  await page.getByRole("button", { name: "Planche", exact: true }).click();
  await expect
    .poll(async () => (await sheetCanvas.evaluate((node) =>
      (node as HTMLCanvasElement).toDataURL("image/jpeg"),
    )).length)
    .toBeGreaterThan(1000);

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JPEG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("sport_elea_photo-identite.jpg");
  expect(externalRequestsAfterLoad).toEqual([]);
});

test("shows a clear background model error and keeps editing usable", async ({ page }) => {
  await page.route("**/models/rmbg2/model.onnx", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "text/plain",
      body: "missing model",
    });
  });

  await page.goto("/");
  await page.getByLabel("Images locales").setInputFiles([
    {
      name: "missing-background-model.png",
      mimeType: "image/png",
      buffer: SAMPLE_PNG,
    },
  ]);

  await page.getByRole("button", { name: "Fond", exact: true }).click();
  await page.getByRole("button", { name: "Charger / verifier le modele" }).click();
  await expect(page.getByText(/Modele RMBG-2.0 introuvable/).first()).toBeVisible();
  await expect(page.getByRole("slider", { name: "Zoom" })).toBeEnabled();

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(page.getByRole("button", { name: "Export JPEG" })).toBeEnabled();
});
