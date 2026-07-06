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
        /* Soft warm gradient — diverse palette tints */
        background: `linear-gradient(
          160deg,
          var(--color-rose-milk) 0%,
          var(--bg-primary) 35%,
          var(--color-lavender-cream) 65%,
          var(--color-vanilla) 100%
        )`,
      }}
    >
      {/* Decorative floating shapes — diverse color blobs */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "5%",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "var(--color-rose-milk)",
          opacity: 0.5,
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
          background: "var(--color-cloud)",
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
          background: "var(--color-soft-gold)",
          opacity: 0.35,
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "30%",
          left: "20%",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "var(--color-sage-cream)",
          opacity: 0.4,
          filter: "blur(70px)",
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
          background: "rgba(251, 248, 241, 0.65)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-light)",
          boxShadow: "var(--shadow-lg)",
          width: "100%",
          maxWidth: 400,
        }}
        className="mx-4 sm:mx-0"
      >
        {/* Logo — using Quiche Display for brand consistency */}
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
              fontFamily="var(--font-display), serif"
              fontWeight="400"
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
              fontFamily: "var(--font-display), serif",
              fontWeight: 400,
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
              fontFamily: "var(--font-primary)",
            }}
          >
            Sign in to access your exclusive collection
          </p>
        </motion.div>

        {/* Divider — gold tinted */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: [...ease], delay: 0.35 }}
          style={{
            width: "100%",
            height: 1,
            background: "var(--border-default)",
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
              fontFamily: "var(--font-primary)",
              letterSpacing: "0.12em",
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
