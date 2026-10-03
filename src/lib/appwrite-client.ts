/* ═══════════════════════════════════════════════════════════
   APPWRITE CLIENT — browser-side SDK (s3host)

   Public endpoint + project only. Never put the API key here.
   ═══════════════════════════════════════════════════════════ */

import { Client } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "http://localhost:8080/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "main";

export const appwriteClient = new Client().setEndpoint(endpoint).setProject(projectId);
