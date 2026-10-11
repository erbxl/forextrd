import { apiResponse, guardRequest, readJson, studySchema } from "@/lib/http";
import { recordStudy } from "@/modules/progress/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return apiResponse(async () => {
    guardRequest(request, "study", 120);
    const { sessionId } = await readJson(request, studySchema);
    return recordStudy(sessionId);
  });
}
