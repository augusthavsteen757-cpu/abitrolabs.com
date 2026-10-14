import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { AuthForm } from "@/components/AuthForm";
import { getDict } from "@/i18n/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { DEMO_EMAIL, isDemoMode } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).auth.loginButton, alternates: { canonical: "/login" } };
}

export default async function LoginPage() {
  // Only point to the demo account where it can actually be used (demo mode, and the seed has created it).
  const showDemo = isDemoMode() && !!(await db.query.users.findFirst({ where: eq(users.email, DEMO_EMAIL), columns: { id: true } }));
  return (
    <AuthLayout>
      <Suspense>
        <AuthForm mode="login" showDemo={showDemo} />
      </Suspense>
    </AuthLayout>
  );
}
