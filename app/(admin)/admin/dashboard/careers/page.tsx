
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getSessionUser } from "@/lib/session";
import CareersAdmin from "@/components/admin/CareersManager";

export const metadata: Metadata = {
  title: "Career Applications | Admin",
  robots: { index: false, follow: false },
};

export default async function AdminCareersPage() {
  const session = await getSessionUser();

  if (!session) redirect("/admin");

  if (
    session.role !== "superadmin" &&
    !session.permissions.can_manage_careers
  ) {
    redirect("/admin/dashboard");
  }

  return (
    <AdminShell
      user={session}
      title="Career Management"
      description="Review applications, manage applicant status, and download resumes."
    >
      <CareersAdmin />
    </AdminShell>
  );
}
