import { handleGameRequest } from "@/lib/game/saved-games";

export const GET = (request: Request) => handleGameRequest(request);
export const POST = (request: Request) => handleGameRequest(request);
