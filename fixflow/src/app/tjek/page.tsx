import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/AuthLayout";
import { GuestStart } from "@/components/GuestStart";
import { getCurrentUser } from "@/lib/auth";
import { GUEST_DELETE_DAYS } from "@/lib/guest";
import { getDict } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).guest.metaTitle, alternates: { canonical: "/tjek" } };
}

export default async function GuestCheckPage() {
  // Signed in already (account or guest): go straight to the upload.
  if (await getCurrentUser()) redirect("/dashboard/upload");
  return (
    <AuthLayout>
      <GuestStart days={GUEST_DELETE_DAYS} />
    </AuthLayout>
  );
}
