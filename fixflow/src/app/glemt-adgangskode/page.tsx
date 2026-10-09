import type { Metadata } from "next";
import { AuthLayout } from "@/components/AuthLayout";
import { ForgotPasswordForm } from "@/components/PasswordResetForms";
import { getDict } from "@/i18n/server";
import { COMPANY } from "@/lib/company";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).auth.forgotTitle, robots: { index: false } };
}

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm contactEmail={COMPANY.email} />
    </AuthLayout>
  );
}
