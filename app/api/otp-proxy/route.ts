
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const LIVE_OTP_API = 'https://www.contenaissance.com/api/otp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body?.action !== 'send' && body?.action !== 'verify') {
      return NextResponse.json(
        { error: 'Action must be send or verify.' },
        { status: 400 }
      );
    }

    const cookie = request.headers.get('cookie');
    const forwardedFor =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');

    const upstream = await fetch(LIVE_OTP_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}),
        ...(userAgent ? { 'User-Agent': userAgent } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });

    const data = await upstream.json().catch(() => ({
      error: 'Invalid response from OTP server.',
    }));

    const response = NextResponse.json(data, {
      status: upstream.status,
    });

    const setCookies = upstream.headers.getSetCookie();

    for (const originalCookie of setCookies) {
      const rewrittenCookie = originalCookie
        .replace(/;\s*Domain=[^;]*/gi, '')
        .replace(/;\s*Path=[^;]*/gi, '')
        .replace(/;\s*SameSite=[^;]*/gi, '')
        .replace(/;\s*Secure/gi, '');

      response.headers.append(
        'Set-Cookie',
        `${rewrittenCookie}; Path=/api/otp-proxy; HttpOnly; SameSite=Lax`
      );
    }

    return response;
  } catch (error) {
    console.error('[otp-proxy] Request failed:', error);

    return NextResponse.json(
      { error: 'Unable to connect to the live OTP service.' },
      { status: 502 }
    );
  }
}
