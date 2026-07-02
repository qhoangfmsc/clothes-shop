"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import GoogleSignInButton from "./_components/GoogleSignInButton";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function LoginContent() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        /* Soft gradient background */
        background: `linear-gradient(
          160deg,
          var(--bg-accent-pink) 0%,
          var(--bg-primary) 40%,
          var(--bg-accent-blue) 70%,
          var(--bg-secondary) 100%
        )`,
      }}
    >
      {/* Decorative floating shapes */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "5%",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "var(--color-rose-milk)",
          opacity: 0.4,
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "15%",
          right: "10%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "var(--color-whisper-blue)",
          opacity: 0.5,
          filter: "blur(100px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: "30%",
          width: 150,
          height: 150,
          borderRadius: "50%",
          background: "var(--color-butter)",
          opacity: 0.3,
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [...ease] }}
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-8)",
          padding: "var(--space-12)",
          background: "rgba(253, 252, 250, 0.7)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-lg)",
          width: "100%",
          maxWidth: 400,
        }}
        className="mx-4 sm:mx-0"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.15 }}
        >
          <svg viewBox="0 0 360 50" fill="none" xmlns="http://www.w3.org/2000/svg" width="180">
            <text
              x="50%"
              y="40"
              fill="var(--text-heading)"
              fontSize="48"
              fontFamily="'Inter Tight', sans-serif"
              fontWeight="500"
              letterSpacing="-0.04em"
              textAnchor="middle"
            >
              Ori Baebi
            </text>
          </svg>
        </motion.div>

        {/* Welcome text */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.25 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-2)",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              color: "var(--text-heading)",
              letterSpacing: "-0.04em",
              lineHeight: "100%",
              fontWeight: 500,
            }}
            className="text-[25px] sm:text-[30px]"
          >
            Welcome Back
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              letterSpacing: "-0.02em",
              lineHeight: "140%",
              fontSize: "var(--text-base)",
            }}
          >
            Sign in to access your exclusive collection
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.35 }}
          style={{
            width: "100%",
            height: 1,
            background: "var(--border-subtle)",
            transformOrigin: "center",
          }}
        />

        {/* Google Sign-In */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.4 }}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <GoogleSignInButton />
        </motion.div>

        {/* Back to home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.5 }}
        >
          <Link
            href="/"
            style={{
              color: "var(--text-muted)",
              fontSize: "var(--text-sm)",
              letterSpacing: "-0.02em",
              textDecoration: "none",
              textTransform: "uppercase",
              transition: `color var(--duration-fast) var(--ease-default)`,
            }}
          >
            ← Back to Home
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
