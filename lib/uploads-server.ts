import { GridFSBucket, ObjectId } from "mongodb";
import { getDb } from "./db";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const MAX_IMAGE = 4 * 1024 * 1024; // fits under Vercel's 4.5 MB request limit

export const uploadsBucket = async () => new GridFSBucket(await getDb(), { bucketName: "uploads" });
export const fileUrl = (id: string | ObjectId) => `/api/files/${String(id)}`;

export type UploadInfo = { id: string; url: string; name: string; size: number; contentType: string; uploadedAt: string };
