// src/app/system/page.tsx - Redirect to dashboard (system management is now merged)
import { redirect } from "next/navigation";

export default function SystemPage() {
  redirect("/dashboard");
}
