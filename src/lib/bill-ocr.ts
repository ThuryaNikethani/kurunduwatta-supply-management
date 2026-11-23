"use client";

import type { Worker } from "tesseract.js";
import { parseBillText } from "./bill-parse";
import type { BillDetails } from "./types";

/**
 * Reads a bill photo inside the browser with Tesseract (Sinhala + English).
 * Nothing leaves the phone, there is no account or key, and it costs nothing.
 * The reader files are served by the app itself from /tesseract.
 */

let worker: Promise<Worker> | null = null;

function getWorker() {
  worker ??= import("tesseract.js")
    .then(({ createWorker }) =>
      createWorker(["sin", "eng"], 1, {
        workerPath: "/tesseract/worker.min.js",
        corePath: "/tesseract",
        langPath: "/tesseract/lang",
        workerBlobURL: false,
      }),
    )
    .catch((e) => {
      worker = null; // try again next time
      throw e;
    });
  return worker;
}

/**
 * A grey copy of the photo, made smaller only if it is very large.
 * (Enlarging small photos or forcing the contrast made reading worse in tests.)
 */
async function prepare(photo: Blob) {
  const img = await createImageBitmap(photo);
  const scale = Math.min(1, 2400 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close();
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    px[i] = px[i + 1] = px[i + 2] = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

/** Shop, date, total and items read from the photo, for HR to check. */
export async function readBillPhoto(photo: Blob): Promise<BillDetails> {
  const [w, canvas] = await Promise.all([getWorker(), prepare(photo)]);
  const { data } = await w.recognize(canvas);
  return parseBillText(data.text);
}
