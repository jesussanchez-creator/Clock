import { NextResponse } from "next/server";
import { getSessionState } from "@/lib/validations/session";
import { getClientIp, isIpAllowed } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionState();
  const ip = getClientIp();
  const ipAllowed = isIpAllowed(ip);

  return NextResponse.json({
    user: session.user,
    events: session.events,
    state: session.state,
    localDate: session.localDate,
    ip,
    ipAllowed,
  });
}
