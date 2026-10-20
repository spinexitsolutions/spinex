// Browser helpers for the admin image upload.

export type Uploaded = { id: string; url: string; name: string; size: number; contentType: string; uploadedAt: string };

const MAX_SIDE = 2000;

// Shrinks big photos (max 2000px, WebP) before upload. Small images and GIFs are sent as they are.
export async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif" || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 600 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

export async function uploadImages(files: File[]): Promise<Uploaded[]> {
  const fd = new FormData();
  for (const f of files) fd.append("files", await compressImage(f));
  const res = await fetch("/api/admin/uploads", { method: "POST", body: fd });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Please log in again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed. Try again.");
  return data as Uploaded[];
}
