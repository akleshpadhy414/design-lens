/**
 * Downscale an uploaded image to fit model limits and return a data URL.
 * Anthropic caps images at 5 MB (base64-encoded); OpenAI is generous but
 * still charges per pixel. We target ≤4 MB base64 with max dimension 2000px.
 * Screenshots re-encode well as JPEG; we only keep PNG if the source had
 * transparency (rare for UI screenshots, but safe to handle).
 */

const MAX_DIM = 2000;
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB leaves headroom under the 5 MB cap

export async function prepareImage(file) {
  const bitmap = await loadBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_DIM);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);

  // Try a sequence of JPEG qualities; fall back to aggressive downscale if
  // the image is still too big (e.g. very large screenshot of complex UI).
  let quality = 0.85;
  for (let attempt = 0; attempt < 5; attempt++) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (approxByteSize(dataUrl) <= MAX_BYTES) return dataUrl;
    quality -= 0.15;
    if (quality < 0.4) {
      // Shrink further and retry at a reasonable quality.
      const scale = 0.75;
      const nextCanvas = document.createElement("canvas");
      nextCanvas.width = Math.max(320, Math.round(canvas.width * scale));
      nextCanvas.height = Math.max(320, Math.round(canvas.height * scale));
      const nextCtx = nextCanvas.getContext("2d");
      nextCtx.drawImage(canvas, 0, 0, nextCanvas.width, nextCanvas.height);
      canvas.width = nextCanvas.width;
      canvas.height = nextCanvas.height;
      canvas.getContext("2d").drawImage(nextCanvas, 0, 0);
      quality = 0.8;
    }
  }
  // Last-resort return (should never happen with sane inputs).
  return canvas.toDataURL("image/jpeg", 0.6);
}

function loadBitmap(file) {
  // Prefer createImageBitmap; fall back to Image + FileReader for wider support.
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fitWithin(w, h, max) {
  if (w <= max && h <= max) return { width: w, height: h };
  const scale = w >= h ? max / w : max / h;
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

function approxByteSize(dataUrl) {
  // data:image/jpeg;base64,XXXX — strip header, estimate bytes from base64 length.
  const commaIdx = dataUrl.indexOf(",");
  const b64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}
