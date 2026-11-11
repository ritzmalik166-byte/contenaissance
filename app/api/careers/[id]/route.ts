
import { NextResponse } from "next/server";
import { query } from "@/lib/mysql";
import {
  AuthError,
  requirePermission,
} from "@/lib/auth-guard";
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

async function getApplicationId(context: Context) {
  const { id } = await context.params;

  if (!/^\d+$/.test(id) || Number(id) <= 0) {
    return null;
  }

  return Number(id);
}

function handleError(error: unknown, message: string) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status }
    );
  }

  console.error(message, error);

  return NextResponse.json(
    { error: "An unexpected error occurred." },
    { status: 500 }
  );
}

// GET: Download applicant resume
export async function GET(_req: Request, context: Context) {
  try {
    await requirePermission(PERMISSIONS.can_manage_careers);

    const id = await getApplicationId(context);

    if (!id) {
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
      [id]
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
    return handleError(error, "Resume download failed:");
  }
}

// PUT: Edit applicant details and status
export async function PUT(req: Request, context: Context) {
  try {
    await requirePermission(PERMISSIONS.can_manage_careers);

    const id = await getApplicationId(context);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid applicant ID." },
        { status: 400 }
      );
    }

    const body = await req.json();

    const existing = await query(
      "SELECT id FROM career_applications WHERE id = ? LIMIT 1",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      const name = String(body.name).trim();

      if (!name) {
        return NextResponse.json(
          { error: "Name is required." },
          { status: 400 }
        );
      }

      updates.push("name = ?");
      values.push(name);
    }

    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: "Invalid email address." },
          { status: 400 }
        );
      }

      updates.push("email = ?");
      values.push(email);
    }

    if (body.phone !== undefined) {
      updates.push("phone = ?");
      values.push(body.phone ? String(body.phone).trim() : null);
    }

    if (body.job_id !== undefined) {
      const jobId = String(body.job_id).trim();

      if (!jobId) {
        return NextResponse.json(
          { error: "Position is required." },
          { status: 400 }
        );
      }

      updates.push("job_id = ?");
      values.push(jobId);
    }

    if (body.cover_letter !== undefined) {
      updates.push("cover_letter = ?");
      values.push(
        body.cover_letter
          ? String(body.cover_letter).trim()
          : null
      );
    }

    if (body.status !== undefined) {
      if (!allowedStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: "Invalid application status." },
          { status: 400 }
        );
      }

      updates.push("status = ?");
      values.push(body.status);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided." },
        { status: 400 }
      );
    }

    values.push(id);

    await query(
      `UPDATE career_applications
       SET ${updates.join(", ")}
       WHERE id = ?`,
      values
    );

    return NextResponse.json({
      success: true,
      message: "Application updated successfully.",
    });
  } catch (error) {
    return handleError(error, "Career update failed:");
  }
}

// DELETE: Delete applicant and stored resume
export async function DELETE(_req: Request, context: Context) {
  try {
    await requirePermission(PERMISSIONS.can_manage_careers);

    const id = await getApplicationId(context);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid applicant ID." },
        { status: 400 }
      );
    }

    const existing = await query(
      "SELECT id FROM career_applications WHERE id = ? LIMIT 1",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 }
      );
    }

    await query(
      "DELETE FROM career_applications WHERE id = ?",
      [id]
    );

    return NextResponse.json({
      success: true,
      message: "Application deleted successfully.",
    });
  } catch (error) {
    return handleError(error, "Career deletion failed:");
  }
}
