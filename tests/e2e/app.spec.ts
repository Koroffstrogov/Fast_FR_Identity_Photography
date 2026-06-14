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

  for (const modeLabel of ["Cadrer", "Fond", "Qualité", "Planche", "Export"]) {
    await expect(page.getByRole("button", { name: modeLabel, exact: true })).toBeVisible();
  }

  const canvas = page.getByLabel("Aperçu photo 35 par 45 millimètres");
  await expect(canvas).toHaveAttribute("width", "413");
  await expect(canvas).toHaveAttribute("height", "531");
  const leftPanel = page.getByLabel("Photos et import");
  const leftImportButton = page.locator(".left-import-button");
  await expect(leftImportButton).toBeVisible();
  const leftPanelBox = await leftPanel.boundingBox();
  const leftImportButtonBox = await leftImportButton.boundingBox();
  expect(leftPanelBox).not.toBeNull();
  expect(leftImportButtonBox).not.toBeNull();
  expect(leftImportButtonBox!.x - leftPanelBox!.x).toBeLessThan(24);
  expect(leftImportButtonBox!.y - leftPanelBox!.y).toBeLessThan(24);

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

  await page.getByLabel("Importer depuis le volet gauche").setInputFiles([
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
  await expect(page.getByText("2 images importées.")).toBeVisible();
  await expect(page.getByText("2 photos / 30 places")).toBeVisible();
  await expect(canvas).toBeVisible();
  await expect(page.getByText("Détails photo active")).toBeVisible();
  const firstPhotoCard = page.locator(".photo-list-item").first();
  const secondPhotoCard = page.locator(".photo-list-item").nth(1);
  const firstCardHeight = await firstPhotoCard.evaluate(
    (node) => node.getBoundingClientRect().height,
  );
  const secondCardHeight = await secondPhotoCard.evaluate(
    (node) => node.getBoundingClientRect().height,
  );
  expect(firstCardHeight).toBeLessThanOrEqual(88);
  expect(secondCardHeight).toBeLessThanOrEqual(88);
  await expect(page.getByRole("button", { name: "Replier" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ouvrir" })).toHaveCount(0);
  const listBox = await page.locator(".photo-list").boundingBox();
  const firstCardBox = await firstPhotoCard.boundingBox();
  expect(listBox).not.toBeNull();
  expect(firstCardBox).not.toBeNull();
  expect(firstCardBox!.y - listBox!.y).toBeLessThan(12);

  await page.getByRole("textbox", { name: "Prénom alice.png", exact: true }).fill("Alice");
  await page.getByRole("textbox", { name: "Nom alice.png", exact: true }).fill("Dupont");
  await page.getByLabel("Usage alice.png").selectOption("college");
  await page.getByRole("button", { name: "Générer nom affiché" }).click();

  await page.getByRole("button", { name: "Choisir bob.png" }).click();
  await expect(secondPhotoCard).toHaveClass(/is-active/);
  await page.getByRole("textbox", { name: "Prénom bob.png", exact: true }).fill("Éléa");
  await page.getByRole("textbox", { name: "Nom bob.png", exact: true }).fill("Sport");
  await page.getByLabel("Usage bob.png").selectOption("sport");
  await page.getByRole("button", { name: "Générer nom affiché" }).click();
  const secondCardBoxAfterSelect = await secondPhotoCard.boundingBox();
  expect(secondCardBoxAfterSelect).not.toBeNull();
  expect(secondCardBoxAfterSelect!.y).toBeGreaterThan(firstCardBox!.y);
  expect(
    await secondPhotoCard.evaluate((node) => node.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(88);

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByLabel("Modèle de nommage").selectOption("lastFirstIdentity");
  await expect(page.getByText("Fichier : sport_elea_photo-identite.jpg")).toBeVisible();

  await page.getByRole("spinbutton", { name: "Copies alice.png" }).fill("4");
  await page.getByRole("spinbutton", { name: "Copies bob.png" }).fill("6");

  await page.getByRole("button", { name: "Planche", exact: true }).click();
  const sheetCanvas = page.getByLabel("Aperçu planche A4 imprimable");
  await expect(sheetCanvas).toHaveAttribute("width", "2480");
  await expect(sheetCanvas).toHaveAttribute("height", "3508");
  await expect(page.getByText("Total demandé : 10 / 30 places.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export planche A4" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Imprimer A4" })).toBeEnabled();

  await page.locator('input[name="sheet-mode"][value="comfort"]').check({ force: true });
  await expect(page.getByText("Total demandé : 10 / 25 places.")).toBeVisible();
  await page.locator('input[name="sheet-mode"][value="standard"]').check({ force: true });
  await expect(page.getByText("Total demandé : 10 / 30 places.")).toBeVisible();

  const sheetDataBeforeGuideToggle = await sheetCanvas.evaluate((node) =>
    (node as HTMLCanvasElement).toDataURL("image/jpeg"),
  );

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(page.getByRole("button", { name: "Export JPEG" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Exporter toutes les photos en ZIP" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Télécharger séparément" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Export planche A4" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Imprimer A4" })).toBeEnabled();

  await page.getByRole("button", { name: "Cadrer", exact: true }).click();
  await page.getByRole("button", { name: "Choisir bob.png" }).click();
  await expect(page.getByRole("heading", { name: "Éléa Sport" })).toBeVisible();
  await expect(page.getByLabel("Guide visage Renforcé")).toBeChecked();
  const interactionGroup = page.getByRole("group", { name: "Interaction sur l'image" });
  const facePointsVisibilityGroup = page.getByRole("group", {
    name: "Affichage points",
  });
  await expect(interactionGroup).toBeVisible();
  await expect(
    interactionGroup.getByRole("radio", { name: "Déplacer photo", exact: true }),
  ).toBeChecked();
  const movePhotoBadge = page
    .getByRole("status")
    .filter({ hasText: "Déplacer photo - glissez l'image, utilisez la molette pour zoomer." });
  await expect(movePhotoBadge).toBeVisible();
  const movePhotoBadgeBox = await movePhotoBadge.boundingBox();
  const cropCanvasBox = await canvas.boundingBox();
  expect(movePhotoBadgeBox).not.toBeNull();
  expect(cropCanvasBox).not.toBeNull();
  expect(movePhotoBadgeBox!.y + movePhotoBadgeBox!.height).toBeLessThan(cropCanvasBox!.y);
  expect(cropCanvasBox!.y - (movePhotoBadgeBox!.y + movePhotoBadgeBox!.height)).toBeGreaterThanOrEqual(8);
  await expect(canvas).toHaveClass(/interaction-move-photo/);
  await expect(facePointsVisibilityGroup.getByLabel("Visibles")).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Placer automatiquement" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Charger le modèle" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Zoom moins" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom plus" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ajuster", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "-1°" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+1°" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();

  await page.getByRole("button", { name: "Placer automatiquement" }).click();
  await expect(
    page.getByText(/Impossible de charger le modèle visage local|Aucun visage exploitable/),
  ).toBeVisible();

  const photoDataBeforeGuideToggle = await canvas.evaluate((node) =>
    (node as HTMLCanvasElement).toDataURL("image/jpeg"),
  );

  await page.locator('label:has(input[name="face-guide-level"][value="hidden"])').click();
  await expect(page.getByLabel("Guide visage Masqué")).toBeChecked();
  expect(
    await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL("image/jpeg")),
  ).toBe(photoDataBeforeGuideToggle);

  await page.getByRole("button", { name: "Planche", exact: true }).click();
  expect(
    await sheetCanvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL("image/jpeg")),
  ).toBe(sheetDataBeforeGuideToggle);

  await page.getByRole("button", { name: "Cadrer", exact: true }).click();
  await page.locator('label:has(input[name="face-guide-level"][value="subtle"])').click();
  await expect(page.getByLabel("Guide visage Discret")).toBeChecked();
  expect(
    await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL("image/jpeg")),
  ).toBe(photoDataBeforeGuideToggle);
  await page.locator('label:has(input[name="face-guide-level"][value="strong"])').click();
  await expect(page.getByLabel("Guide visage Renforcé")).toBeChecked();
  expect(
    await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL("image/jpeg")),
  ).toBe(photoDataBeforeGuideToggle);

  await page
    .locator('label:has(input[name="face-points-visibility"][value="hidden"])')
    .click();
  await expect(facePointsVisibilityGroup.getByLabel("Masqués")).toBeChecked();
  expect(
    await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL("image/jpeg")),
  ).toBe(photoDataBeforeGuideToggle);
  await page
    .locator('label:has(input[name="face-points-visibility"][value="visible"])')
    .click();
  await expect(facePointsVisibilityGroup.getByLabel("Visibles")).toBeChecked();
  expect(
    await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL("image/jpeg")),
  ).toBe(photoDataBeforeGuideToggle);

  await page
    .locator('label:has(input[name="editor-interaction-mode"][value="place-face-points"])')
    .click();
  await expect(
    interactionGroup.getByRole("radio", { name: "Placer points", exact: true }),
  ).toBeChecked();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Placer points - cliquez : œil gauche, œil droit, menton, sommet du crâne." }),
  ).toBeVisible();
  await expect(canvas).toHaveClass(/interaction-place-face-points/);
  expect(await canvas.evaluate((node) => getComputedStyle(node).cursor)).toBe("crosshair");
  await expect(page.getByText("Statut : 0/4 points placés")).toBeVisible();
  await expect(
    page.getByText("0/4 point(s) visage placé(s). Prochain point : œil gauche."),
  ).toBeVisible();
  await canvas.click({ position: { x: 175, y: 230 } });
  await expect(
    page.getByText("1/4 point(s) visage placé(s). Prochain point : œil droit."),
  ).toBeVisible();
  await canvas.click({ position: { x: 238, y: 250 } });
  await expect(
    page.getByText("2/4 point(s) visage placé(s). Prochain point : menton."),
  ).toBeVisible();
  await page
    .locator('label:has(input[name="editor-interaction-mode"][value="place-face-points"])')
    .click();
  await expect(page.getByText("Statut : 0/4 points placés")).toBeVisible();
  await expect(
    page.getByText("0/4 point(s) visage placé(s). Prochain point : œil gauche."),
  ).toBeVisible();
  await canvas.click({ position: { x: 175, y: 230 } });
  await expect(
    page.getByText("1/4 point(s) visage placé(s). Prochain point : œil droit."),
  ).toBeVisible();
  await canvas.click({ position: { x: 238, y: 250 } });
  await expect(
    page.getByText("2/4 point(s) visage placé(s). Prochain point : menton."),
  ).toBeVisible();
  await canvas.click({ position: { x: 206, y: 398 } });
  await expect(
    page.getByText("3/4 point(s) visage placé(s). Prochain point : sommet du crâne."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cadrer à partir des points" }),
  ).toBeEnabled();
  await canvas.click({ position: { x: 206, y: 120 } });
  await expect(page.getByText("4/4 points visage placés. Ajustez-les si besoin.")).toBeVisible();
  await expect(page.getByText("Statut : 4/4 points placés")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cadrer à partir des points" }),
  ).toBeEnabled();
  await page
    .locator('label:has(input[name="editor-interaction-mode"][value="move-face-points"])')
    .click();
  await expect(
    interactionGroup.getByRole("radio", { name: "Déplacer points", exact: true }),
  ).toBeChecked();
  await expect(facePointsVisibilityGroup.getByLabel("Visibles")).toBeChecked();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Déplacer points - glissez un point pour l'ajuster. Échap pour quitter." }),
  ).toBeVisible();
  await expect(canvas).toHaveClass(/interaction-move-face-points/);
  const photoDataBeforePointModeDrag = await canvas.evaluate((node) =>
    (node as HTMLCanvasElement).toDataURL("image/jpeg"),
  );
  const pointModeCanvasBox = await canvas.boundingBox();
  expect(pointModeCanvasBox).not.toBeNull();
  await page.mouse.move(pointModeCanvasBox!.x + 16, pointModeCanvasBox!.y + 16);
  await page.mouse.down();
  await page.mouse.move(pointModeCanvasBox!.x + 54, pointModeCanvasBox!.y + 42);
  await page.mouse.up();
  expect(
    await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL("image/jpeg")),
  ).toBe(photoDataBeforePointModeDrag);
  await page.keyboard.press("Escape");
  await expect(
    interactionGroup.getByRole("radio", { name: "Déplacer photo", exact: true }),
  ).toBeChecked();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Déplacer photo - glissez l'image, utilisez la molette pour zoomer." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cadrer à partir des points" }).click();
  await expect
    .poll(async () => {
      const text = await page.locator('output[aria-label="Valeur rotation"]').textContent();
      return Math.abs(Number.parseFloat(text ?? "0"));
    })
    .toBeGreaterThan(0.1);
  await page.getByRole("button", { name: "Supprimer les points" }).click();
  await expect(page.getByText("Statut : 0/4 points placés")).toBeVisible();

  await page.getByRole("button", { name: "Fond", exact: true }).click();
  await expect(canvas).toBeVisible();
  const backgroundGroup = page.getByRole("group", { name: "Fond" });
  await page.route(/\/models\/rmbg1\.4\/.*\.onnx.*/, async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "text/plain",
      body: "missing model",
    });
  });
  await expect(
    backgroundGroup.locator(".model-status").filter({ hasText: "RMBG-1.4 ONNX" }),
  ).toBeVisible();
  await expect(backgroundGroup.getByText("Options avancées")).toBeVisible();
  await backgroundGroup.getByText("Options avancées").click();
  await expect(page.getByLabel("Modèle RMBG")).toHaveValue(
    "/models/rmbg1.4/model_fp16.onnx",
  );
  await expect(page.getByLabel("Backend fond")).toHaveValue("auto");
  await expect(backgroundGroup.getByRole("button", { name: "Supprimer le fond" })).toBeVisible();
  await backgroundGroup.getByRole("button", { name: "Charger / vérifier le modèle" }).click();
  await expect(page.getByText(/Modèle RMBG-1\.4.*introuvable|Le chemin du modèle renvoie l'application HTML/).first()).toBeVisible();
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
  await page.getByRole("button", { name: "Ajouter point fond à supprimer" }).click();
  await canvas.click({ position: { x: 120, y: 120 } });
  await expect(page.getByText("Point fond ajouté.")).toBeVisible();
  await expect(page.getByText("Points : 0 personne, 1 fond.")).toBeVisible();
  await page.getByRole("button", { name: "Ajouter point fond à supprimer" }).click();
  await page.getByRole("button", { name: "Effacer les points" }).click();
  await expect(page.getByText("Points : 0 personne, 0 fond.")).toBeVisible();

  await page.getByRole("button", { name: "Qualité", exact: true }).click();
  await expect(canvas).toBeVisible();
  await expect(page.getByRole("group", { name: "Diagnostic qualité" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Avant / après corrections" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Avant corrections" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Après corrections" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Actualiser l'analyse avant/après" })).toBeVisible();
  await expect(page.getByText(/Conforme probable|À surveiller|À corriger/).first()).toBeVisible();
  await expect(
    page.getByText("Diagnostic indicatif, ne garantit pas l'acceptation officielle."),
  ).toBeVisible();
  await expect(page.getByText(/Fond|fond/).first()).toBeVisible();
  const beforeQualityCanvas = page.getByLabel("Aperçu original sans correction qualité");
  const afterQualityCanvas = page.getByLabel("Aperçu corrigé exporté");
  const beforeQualityBox = await beforeQualityCanvas.boundingBox();
  const afterQualityBox = await afterQualityCanvas.boundingBox();
  expect(beforeQualityBox).not.toBeNull();
  expect(afterQualityBox).not.toBeNull();
  expect(afterQualityBox!.y).toBeGreaterThan(beforeQualityBox!.y);
  expect(Math.abs(afterQualityBox!.x - beforeQualityBox!.x)).toBeLessThanOrEqual(2);
  const comparisonList = page.getByLabel("Contrôles qualité avant après");
  await expect(comparisonList).toBeVisible();
  const firstComparisonStates = comparisonList
    .locator(".quality-comparison-item")
    .first()
    .locator(".quality-comparison-state");
  const beforeStateBox = await firstComparisonStates.nth(0).boundingBox();
  const afterStateBox = await firstComparisonStates.nth(1).boundingBox();
  expect(beforeStateBox).not.toBeNull();
  expect(afterStateBox).not.toBeNull();
  expect(afterStateBox!.y).toBeGreaterThan(beforeStateBox!.y);
  expect(Math.abs(afterStateBox!.x - beforeStateBox!.x)).toBeLessThanOrEqual(2);
  await page.getByRole("button", { name: "Amélioration auto légère" }).click();
  await expect(page.getByLabel("Aperçu corrigé exporté")).toBeVisible();
  await page.getByRole("button", { name: "Réinitialiser qualité" }).click();
  await expect(page.getByLabel("Aperçu corrigé exporté")).toBeVisible();

  await page.getByRole("slider", { name: "Zoom" }).evaluate((input) => {
    const range = input as HTMLInputElement;
    range.value = "1.5";
    range.dispatchEvent(new Event("input", { bubbles: true }));
    range.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.getByRole("button", { name: "Reset" }).click();
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("button", { name: "+1°" }).click();
  }
  await expect
    .poll(async () => {
      const text = await page.locator('output[aria-label="Valeur rotation"]').textContent();
      return Number.parseFloat(text ?? "0");
    })
    .toBeGreaterThanOrEqual(4.9);

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
  await page.route(/\/models\/rmbg(1\.4|2)\/.*\.onnx.*/, async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "text/plain",
      body: "missing model",
    });
  });

  await page.goto("/");
  await page.getByLabel("Importer depuis le volet gauche").setInputFiles([
    {
      name: "missing-background-model.png",
      mimeType: "image/png",
      buffer: SAMPLE_PNG,
    },
  ]);

  await page.getByRole("button", { name: "Fond", exact: true }).click();
  await page.getByRole("button", { name: "Charger / vérifier le modèle" }).click();
  await expect(page.getByText(/Modèle RMBG-(1\.4|2\.0).*introuvable|Le chemin du modèle renvoie l'application HTML/).first()).toBeVisible();
  await expect(page.getByText(/URL testée/).first()).toBeVisible();
  await expect(page.getByRole("slider", { name: "Zoom" })).toBeEnabled();

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(page.getByRole("button", { name: "Export JPEG" })).toBeEnabled();
});
