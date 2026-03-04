"use client";

export async function fileToOptimisedDataUrl(file: File, maxSide = 320, quality = 0.82): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) {
    return dataUrl;
  }

  const scale = Math.min(1, maxSide / Math.max(width, height));
  const outWidth = Math.max(1, Math.round(width * scale));
  const outHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return dataUrl;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, outWidth, outHeight);

  return canvas.toDataURL("image/jpeg", quality);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });
}
