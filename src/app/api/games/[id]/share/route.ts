import { handleShareRequest } from "@/lib/game/saved-games";

async function handle(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleShareRequest(request, (await context.params).id);
}
export { handle as GET, handle as POST, handle as DELETE };
