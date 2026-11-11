
import { NextResponse } from "next/server";
import { query } from "@/lib/mysql";
import { Buffer } from "node:buffer";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const jobId = String(form.get("jobId") ?? "").trim();
    const coverLetter = String(form.get("coverLetter") ?? "").trim();
    const resumeFile = form.get("resume");

    if (
      !name ||
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !jobId ||
      !(resumeFile instanceof File) ||
      resumeFile.size === 0
    ) {
      return NextResponse.json(
        { error: "Please provide valid application details and resume." },
        { status: 400 }
      );
    }

    if (resumeFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Resume too large. Maximum size is 10 MB." },
        { status: 413 }
      );
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(resumeFile.type)) {
      return NextResponse.json(
        { error: "Only PDF and Word resumes are allowed." },
        { status: 400 }
      );
    }

    const resumeBuffer = Buffer.from(
      await resumeFile.arrayBuffer()
    );

const result = (await query(
  `INSERT INTO career_applications
   (name, email, phone, job_id, cover_letter,
    resume_name, resume, resume_mime)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    name,
    email,
    phone || null,
    jobId,
    coverLetter || null,
    resumeFile.name,
    resumeBuffer,
    resumeFile.type,
  ]
)) as unknown as { insertId: number };

return NextResponse.json({
  success: true,
  message: "Application submitted successfully.",
  id: result.insertId,
});
  } catch (error) {
    console.error("Career application submission failed:", error);

    return NextResponse.json(
      { error: "Unable to submit application." },
      { status: 500 }
    );
  }
}
