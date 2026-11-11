
import { NextResponse } from "next/server";
import { query } from "@/lib/mysql";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

type CareerRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  job_id: string;
  status: string;
  created_at: string;
};

export async function GET(req: Request) {
  try {
    await requirePermission(PERMISSIONS.can_manage_careers);

    const url = new URL(req.url);
    const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit")) || 20, 1),
      100
    );
    const offset = (page - 1) * limit;
    const search = url.searchParams.get("search")?.trim() ?? "";

    const where = search
      ? "WHERE name LIKE ? OR email LIKE ?"
      : "";

    const searchParams = search
      ? [`%${search}%`, `%${search}%`]
      : [];

    const rows = await query<CareerRow>(
      `SELECT id, name, email, phone, job_id, status, created_at
       FROM career_applications
       ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...searchParams, limit, offset]
    );

    const countRows = await query<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt
       FROM career_applications ${where}`,
      searchParams
    );

    const total = Number(countRows[0]?.cnt ?? 0);

    return NextResponse.json({
      data: rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Career listing failed:", error);

    return NextResponse.json(
      { error: "Unable to load applications." },
      { status: 500 }
    );
  }
}
