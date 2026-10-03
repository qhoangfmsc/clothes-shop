"use client";

import { useEffect, useRef } from "react";
import { appwriteClient } from "@/src/lib/appwrite-client";

/** One-time connectivity check against the s3host Appwrite instance (dev only). */
export default function AppwritePing() {
  const pinged = useRef(false);

  useEffect(() => {
    if (pinged.current || process.env.NODE_ENV !== "development") return;
    pinged.current = true;

    appwriteClient
      .ping()
      .then(() => console.info("[appwrite] ping ok — s3host reachable"))
      .catch((err) => console.error("[appwrite] ping failed — is s3host running?", err));
  }, []);

  return null;
}
