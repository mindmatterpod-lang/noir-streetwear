import { EXTRA_IMAGE_HOSTS } from "@/lib/site-config";

/** Hosts product photos may be linked from. Supabase storage is where uploaded photos live. */
const ALLOWED_HOSTS = ["res.cloudinary.com", "ik.imagekit.io", ...EXTRA_IMAGE_HOSTS];

export type ImageLinkCheck = { ok: true; url: string } | { ok: false; error: string };

/** Validates a pasted image link. Only https links from approved image hosts are accepted. */
export function validateImageUrl(input: string): ImageLinkCheck {
  const raw = input.trim();
  if (raw === "" || raw.length > 600 || /\s/.test(raw))
    return { ok: false, error: "Paste one image link without spaces." };
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "That doesn't look like a link." };
  }
  if (parsed.protocol !== "https:")
    return { ok: false, error: "The link must start with https://" };
  const host = parsed.hostname.toLowerCase();
  const allowed =
    ALLOWED_HOSTS.includes(host) ||
    (host.endsWith(".supabase.co") && parsed.pathname.includes("/storage/v1/object/public/"));
  if (!allowed) {
    return {
      ok: false,
      error: `Links from ${host} aren't allowed (photo-sharing and page links can break). Use Cloudinary or ImageKit.`,
    };
  }
  return { ok: true, url: parsed.toString() };
}

/**
 * Returns a smaller, faster version of an image. Cloudinary and ImageKit resize and convert on the fly;
 * other URLs (local files, Supabase uploads) are returned unchanged.
 */
export function optimizeImageUrl(url: string, width: number): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "res.cloudinary.com" && parsed.pathname.includes("/image/upload/")) {
      if (/\/upload\/[^/]*(f_auto|w_\d+)/.test(parsed.pathname)) return url;
      parsed.pathname = parsed.pathname.replace(
        "/image/upload/",
        `/image/upload/f_auto,q_auto,c_limit,w_${width}/`,
      );
      return parsed.toString();
    }
    if (parsed.hostname === "ik.imagekit.io") {
      if (parsed.searchParams.has("tr") || /\/tr:/.test(parsed.pathname)) return url;
      parsed.searchParams.set("tr", `w-${width},q-80,f-auto`);
      return parsed.toString();
    }
  } catch {
    // Not an absolute URL (e.g. a bundled asset path): use it as is.
  }
  return url;
}

/** The storage path of an uploaded photo (so it can be deleted), or null for linked images. */
export function supabaseStoragePath(url: string): string | null {
  const marker = "/storage/v1/object/public/product-images/";
  const index = url.indexOf(marker);
  return index === -1
    ? null
    : decodeURIComponent(url.slice(index + marker.length).split("?")[0] ?? "");
}

/** Shrinks a photo in the browser (max 1600px, WebP) so uploads use a fraction of the storage. */
export async function shrinkImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  if (
    typeof document === "undefined" ||
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  )
    return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
}
