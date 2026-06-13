export function loadImageFile(file: File): Promise<HTMLImageElement> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Le fichier selectionne n'est pas une image."));
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire cette image."));
    };

    image.src = url;
  });
}
