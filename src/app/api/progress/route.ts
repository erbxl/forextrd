import { apiResponse, guardRequest } from "@/lib/http";
import { getProgress } from "@/modules/progress/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiResponse(async () => {
    guardRequest(request, "progress", 120);
    return getProgress();
  });
}
