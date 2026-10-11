import { apiResponse, completionSchema, guardRequest, readJson } from "@/lib/http";
import { completeLesson } from "@/modules/progress/service";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  return apiResponse(async () => {
    guardRequest(request, "complete", 30);
    const { read } = await readJson(request, completionSchema);
    const { slug } = await context.params;
    return completeLesson(slug, read);
  });
}
