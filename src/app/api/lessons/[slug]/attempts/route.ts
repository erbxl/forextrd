import { answersSchema, apiResponse, guardRequest, readJson } from "@/lib/http";
import { saveAttempt } from "@/modules/progress/service";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  return apiResponse(async () => {
    guardRequest(request, "attempts", 20);
    const { answers } = await readJson(request, answersSchema);
    const { slug } = await context.params;
    return saveAttempt(slug, answers);
  });
}
