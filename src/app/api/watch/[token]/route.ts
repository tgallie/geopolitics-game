import { handleWatchRequest } from "@/lib/game/saved-games";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  return handleWatchRequest(request, (await context.params).token);
}
