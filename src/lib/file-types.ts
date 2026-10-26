/**
 * Upload safety. The type of a file is decided from its *bytes*, never from the name the browser
 * sends or its claimed MIME type, and only a short allow-list is accepted. HTML, SVG, scripts and
 * archives are rejected outright: an uploaded file must never be able to run in the application's origin.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type DetectedFile = { ext: "pdf" | "png" | "jpg" | "webp" | "csv" | "txt"; mime: string };

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, i) => bytes[offset + i] === byte);

/** Valid UTF-8 with no control characters other than tab, CR and LF. */
function looksLikePlainText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, 8192);
  const decode = (chunk: Uint8Array) => new TextDecoder("utf-8", { fatal: true }).decode(chunk);
  let text: string;
  try {
    text = decode(sample);
  } catch {
    // Only a file longer than the sample can have a character cut by the boundary; a short
    // file that fails to decode is simply not UTF-8.
    if (bytes.length <= sample.length) return false;
    try {
      text = decode(sample.subarray(0, sample.length - 3));
    } catch {
      return false;
    }
  }
  return !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text);
}

/** Returns the detected type, or null when the file is not on the allow-list. */
export function detectFileType(bytes: Uint8Array, originalName: string): DetectedFile | null {
  if (bytes.length === 0) return null;
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]))
    return { ext: "pdf", mime: "application/pdf" };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ext: "png", mime: "image/png" };
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { ext: "jpg", mime: "image/jpeg" };
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { ext: "webp", mime: "image/webp" };
  }

  // Plain text is only accepted for explicitly text-like names, and only if it really is text.
  const extension = originalName.toLowerCase().split(".").pop();
  if ((extension === "csv" || extension === "txt") && looksLikePlainText(bytes)) {
    return extension === "csv"
      ? { ext: "csv", mime: "text/csv; charset=utf-8" }
      : { ext: "txt", mime: "text/plain; charset=utf-8" };
  }
  return null;
}

/** A display-only file name: no path parts, control characters or markup. */
export function safeDisplayName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001F<>:"|?*]/g, "_").trim();
  return (cleaned || "file").slice(0, 150);
}
