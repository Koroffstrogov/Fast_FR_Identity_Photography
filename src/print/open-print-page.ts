import { A4_PRINT_PAGE } from "../core/print-layout";

export function openA4PrintPage(sheetDataUrl: string): void {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    throw new Error("Impossible d'ouvrir la page d'impression.");
  }

  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(buildPrintPageHtml(sheetDataUrl));
  printWindow.document.close();
}

function buildPrintPageHtml(sheetDataUrl: string): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Planche A4 a imprimer</title>
    <style>
      @page { size: A4 portrait; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; }
      body {
        min-height: 100vh;
        color: #172026;
        background: #eef3f1;
        font-family: Arial, sans-serif;
      }
      .notice {
        max-width: 210mm;
        margin: 16px auto;
        padding: 10px 12px;
        border: 1px solid #b6c5c1;
        background: #ffffff;
        font-size: 14px;
        line-height: 1.4;
      }
      .sheet {
        display: block;
        width: 210mm;
        height: 297mm;
        margin: 0 auto 24px;
        background: #ffffff;
      }
      @media print {
        html, body {
          width: 210mm;
          height: 297mm;
          background: #ffffff;
        }
        .notice { display: none; }
        .sheet {
          width: 210mm;
          height: 297mm;
          margin: 0;
        }
      }
    </style>
  </head>
  <body>
    <p class="notice">
      Imprimez a 100 %, sans ajustement a la page. La regle 10 cm en bas de la
      planche permet de verifier l'absence de mise a l'echelle.
    </p>
    <img
      class="sheet"
      src="${sheetDataUrl}"
      width="${A4_PRINT_PAGE.widthPx}"
      height="${A4_PRINT_PAGE.heightPx}"
      alt="Planche A4 de photos d'identite"
    />
    <script>
      window.addEventListener("load", () => {
        window.focus();
        window.setTimeout(() => window.print(), 100);
      });
    </script>
  </body>
</html>`;
}
