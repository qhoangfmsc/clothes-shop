"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/src/contexts/auth-context";
import { StoreProvider } from "@/src/store/StoreProvider";
import CartSync from "@/src/app/[locale]/(private)/cart/_components/CartSync";
import type { ReactNode } from "react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <CartSync />
          {children}
        </AuthProvider>
      </GoogleOAuthProvider>
    </StoreProvider>
  );
}
