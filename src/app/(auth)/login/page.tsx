import type { Metadata } from "next";
import LoginContent from "./LoginContent";

export const metadata: Metadata = {
  title: "Sign In — Ori Baebi",
  description:
    "Sign in to your Ori Baebi account to access exclusive collections and personalized styling.",
};

export default function LoginPage() {
  return <LoginContent />;
}
