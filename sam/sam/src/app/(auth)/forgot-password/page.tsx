import type { Metadata } from "next";
import { ForgotForm } from "@/features/auth/forms";
export const metadata: Metadata = { title: "Reset password" };
export default function ForgotPage() { return <ForgotForm />; }
