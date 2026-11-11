
import { NextResponse } from "next/server";
import { query } from "@/lib/mysql";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

const allowedStatuses = [
  "new",
  "reviewed",
  "interview",
  "rejected",
  "hired",
];

type Context = {
  params: Promise<{ id: string }>;
};

// Download applicant resume
export async function GET(req: Request, context: Context) {
  try {
    await requirePermission(PERMISSIONS.can_manage_careers);

    const { id } = await context.params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid applicant ID." },
        { status: 400 }
      );
    }

    const rows = await query<{
      resume_name: string;
      resume: Buffer;
      resume_mime: string;
    }>(
      `SELECT resume_name, resume, resume_mime
       FROM career_applications
       WHERE id = ?`,
      [Number(id)]
    );

    const applicant = rows[0];

    if (!applicant) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 }
      );
    }

    const filename = String(applicant.resume_name)
      .replace(/[\r\n"\\/]/g, "_");

    const resume = new Uint8Array(applicant.resume);

    return new NextResponse(resume, {
      headers: {
        "Content-Type": applicant.resume_mime,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(resume.byteLength),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Resume download failed:", error);

    return NextResponse.json(
      { error: "Unable to download resume." },
      { status: 500 }
    );
  }
}

// Update applicant status
export async function PUT(req: Request, context: Context) {
  try {
    await requirePermission(PERMISSIONS.can_manage_careers);

    const { id } = await context.params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid applicant ID." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const status = body.status;

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid application status." },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE career_applications
       SET status = ?
       WHERE id = ?`,
      [status, Number(id)]
    );

    const affectedRows = (
      result as unknown as { affectedRows: number }
    ).affectedRows;

    if (affectedRows === 0) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Application status updated.",
    });
  } catch (error) {
    console.error("Career status update failed:", error);

    return NextResponse.json(
      { error: "Unable to update application status." },
      { status: 500 }
    );
  }
}
