import { apiResponse, guardRequest, readJson, settingsSchema } from "@/lib/http";
import { updateSettings } from "@/modules/progress/service";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  return apiResponse(async () => {
    guardRequest(request, "settings", 20);
    return updateSettings(await readJson(request, settingsSchema));
  });
}
