import { NextResponse } from "next/server";
import { query } from "@/lib/mysql";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: Context) {
  try {
    await requirePermission(PERMISSIONS.can_manage_careers);

    const { id } = await context.params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid applicant ID" },
        { status: 400 }
      );
    }

    const [rows] = await query(
      `SELECT
        id,
        name,
        email,
        phone,
        job_id,
        cover_letter,
        resume_name,
        status,
        created_at
       FROM career_applications
       WHERE id = ?`,
      [Number(id)]
    );

    const applicant = (rows as any[])[0];

    if (!applicant) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: applicant });
  } catch (error) {
    console.error("Career details error:", error);

    return NextResponse.json(
      { error: "Unable to load applicant details" },
      { status: 500 }
    );
  }
}