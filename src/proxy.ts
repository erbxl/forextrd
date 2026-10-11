import { NextResponse, type NextRequest } from "next/server";
import { assertLocalHost } from "@/lib/http";

// Reject DNS-rebinding hostnames before rendering pages or serving resources.
// API handlers also validate the browser Origin for mutations.
export function proxy(request: NextRequest) {
  try {
    assertLocalHost(request);
    return NextResponse.next();
  } catch {
    return NextResponse.json({ error: "Esta instalación solo acepta solicitudes locales." }, {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export const config = { matcher: "/:path*" };
