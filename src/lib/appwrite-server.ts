/* ═══════════════════════════════════════════════════════════
   APPWRITE SERVER CLIENT — node-appwrite (s3host)

   Server-only. Holds the API key — never import this from a
   "use client" file or expose it to the browser.
   ═══════════════════════════════════════════════════════════ */

import { Client, Storage } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT ?? "http://localhost:8080/v1";
const projectId = process.env.APPWRITE_PROJECT_ID ?? "main";
const apiKey = process.env.APPWRITE_API_KEY ?? "";

export const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID ?? "";

export function isAppwriteConfigured(): boolean {
  return Boolean(apiKey && APPWRITE_BUCKET_ID);
}

export function getAppwriteStorage(): Storage {
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Storage(client);
}
