import { createAdminClient } from "@/lib/supabase/admin";

const GUEST_DOCS_BUCKET = "guest-docs";

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function extensionForFileType(type: string): string | null {
  return EXTENSION_BY_TYPE[type] ?? null;
}

// Path is derived from the guest id and doc kind (not the original
// filename) so storage paths are predictable and never carry
// user-controlled characters.
export function guestFilePath(
  guestId: string,
  kind: "aadhaar" | "photo" | "passport" | "visa",
  fileType: string,
): string {
  const ext = extensionForFileType(fileType) ?? "bin";
  return `${guestId}/${kind}.${ext}`;
}

// Uploads to the private guest-docs bucket. Returns the storage path —
// not a public URL, since the bucket is private and reads only ever
// happen server-side (admin dashboard, via signed URLs).
export async function uploadGuestFile(
  path: string,
  file: File,
): Promise<string> {
  const supabase = createAdminClient();

  const { error } = await supabase.storage
    .from(GUEST_DOCS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  return path;
}
