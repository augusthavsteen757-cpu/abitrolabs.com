import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { ResetPasswordForm } from "@/components/PasswordResetForms";
import { getDict } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).auth.resetTitle, robots: { index: false }, referrer: "no-referrer" };
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
