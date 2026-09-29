import type { Metadata } from "next";
import LoginContent from "./LoginContent";

export const metadata: Metadata = {
  title: "Sign In — DOOVAN",
  description:
    "Sign in to your DOOVAN account to access exclusive collections and personalized styling.",
};

export default function LoginPage() {
  return <LoginContent />;
}
