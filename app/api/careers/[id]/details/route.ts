
import {
  jsonError,
  jsonForbidden,
  jsonNotFound,
  jsonServerError,
  jsonSuccess,
} from "@/lib/api-response";
import { AuthError, requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { queryOne } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    await requirePermission(PERMISSIONS.can_manage_careers);

    const { id } = await context.params;
    const applicationId = Number(id);

    if (!Number.isSafeInteger(applicationId) || applicationId <= 0) {
      return jsonError("Invalid application ID");
    }

    const application = await queryOne(
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
      WHERE id = ?
      LIMIT 1`,
      [applicationId]
    );

    if (!application) {
      return jsonNotFound("Career application not found");
    }

    return jsonSuccess(application);
  } catch (error) {
    if (error instanceof AuthError) {
      return error.status === 403
        ? jsonForbidden(error.message)
        : jsonError(error.message, error.status);
    }

    console.error("Career details API error:", error);
    return jsonServerError();
  }
}
