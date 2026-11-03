
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const LIVE_ENQUIRY_API =
  'https://www.contenaissance.com/api/enquiry';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (
      !body?.email ||
      !body?.fullName ||
      !body?.subject ||
      !body?.message
    ) {
      return NextResponse.json(
        { error: 'Name, email, service, and message are required.' },
        { status: 400 }
      );
    }

    const upstream = await fetch(LIVE_ENQUIRY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'contact',
        fullName: body.fullName,
        email: body.email,
        contactNumber: body.contactNumber,
        subject: body.subject,
        message: body.message,
        source: 'new-website-contact',
        timestamp: new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
        }),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });

    const data = await upstream.json().catch(() => ({
      error: 'Invalid response from enquiry server.',
    }));

    return NextResponse.json(data, {
      status: upstream.status,
    });
  } catch (error) {
    console.error('[enquiry-proxy] Request failed:', error);

    return NextResponse.json(
      { error: 'Unable to submit your enquiry. Please try again.' },
      { status: 502 }
    );
  }
}
