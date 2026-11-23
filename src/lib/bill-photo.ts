"use client";

/**
 * Makes a bill photo small before it is kept: black and white, paper made
 * white, and as small as it can be while the writing stays clear.
 * Most bills end up about 50–80 KB, so the free photo space holds many thousands.
 */

const TARGET = 80_000; // bytes
const SIZES = [1600, 1400, 1200, 1000]; // longest side, in pixels
const QUALITIES = [0.7, 0.6, 0.5, 0.42];

function toBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("photo"))), "image/jpeg", quality),
  );
}

/** Draw the photo in grey at this size, stretching greys so the paper turns white. */
function drawGrey(img: ImageBitmap, longest: number) {
  const scale = Math.min(1, longest / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) {
    const g = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    px[i] = g;
    hist[g]++;
  }
  const total = px.length / 4;
  let lo = 0, hi = 255, seen = 0;
  while (lo < 255 && (seen += hist[lo]) < total * 0.01) lo++;
  seen = 0;
  // The lightest tenth is paper: it becomes pure white, which also keeps the file small.
  while (hi > 0 && (seen += hist[hi]) < total * 0.1) hi--;
  const range = Math.max(hi - lo, 1);
  for (let i = 0; i < px.length; i += 4) {
    const g = Math.max(0, Math.min(255, ((px[i] - lo) * 255) / range));
    px[i] = px[i + 1] = px[i + 2] = g;
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

/** A colour copy for reading (at most 2000px, about 0.3–1 MB), small enough to send to the server. */
export async function photoForReading(file: Blob): Promise<Blob> {
  const img = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await toBlob(canvas, 0.85);
  } finally {
    img.close();
  }
}

/** The smallest clear copy of the photo, as a JPEG. */
export async function shrinkBillPhoto(file: Blob): Promise<Blob> {
  const img = await createImageBitmap(file);
  try {
    let smallest: Blob | null = null;
    for (const size of SIZES) {
      const canvas = drawGrey(img, size);
      for (const q of QUALITIES) {
        const blob = await toBlob(canvas, q);
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= TARGET) return blob;
      }
    }
    return smallest!;
  } finally {
    img.close();
  }
}
