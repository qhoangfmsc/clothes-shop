"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/src/contexts/auth-context";

const GoogleLogo = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
};

export default function GoogleSignInButton() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Use authorization_code flow:
   * 1. Google popup → user consents → returns auth code
   * 2. We exchange code for access_token client-side via Google's token endpoint
   * 3. Then use the access_token to get user info and send to our BE
   *
   * Alternative: use implicit flow to get access_token directly
   */
  const googleLogin = useGoogleLogin({
    flow: "auth_code",
    onSuccess: async (codeResponse) => {
      setIsLoading(true);
      setError(null);
      try {
        // Send the authorization code to BE for exchange
        await login(codeResponse.code);
        router.push("/");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setError("Google sign-in was cancelled or failed.");
    },
  });

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)" }}>
      <motion.button
        onClick={() => {
          setError(null);
          googleLogin();
        }}
        disabled={isLoading}
        whileHover={isLoading ? {} : { scale: 1.02, opacity: 0.9 }}
        whileTap={isLoading ? {} : { scale: 0.98 }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-3)",
          background: "var(--color-white)",
          color: "var(--text-heading)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-pill)",
          padding: "14px 32px",
          fontSize: "var(--text-md)",
          fontFamily: "var(--font-primary)",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          cursor: isLoading ? "wait" : "pointer",
          boxShadow: "var(--shadow-sm)",
          transition: `opacity var(--duration-fast) var(--ease-default), transform var(--duration-fast) var(--ease-default), box-shadow var(--duration-fast) var(--ease-default), border-color var(--duration-fast) var(--ease-default)`,
          width: "100%",
          maxWidth: 320,
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "2px solid var(--border-default)",
              borderTopColor: "var(--text-heading)",
            }}
          />
        ) : (
          <GoogleLogo />
        )}
        <span>{isLoading ? "Signing in..." : "Continue with Google"}</span>
      </motion.button>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            color: "#c53030",
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-primary)",
            textAlign: "center",
          }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
