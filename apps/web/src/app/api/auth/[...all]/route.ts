import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth.ts";

export const dynamic = "force-dynamic";
const handlers = () => toNextJsHandler(getAuth());
export const GET = (req: Request): Promise<Response> => handlers().GET(req);
export const POST = (req: Request): Promise<Response> => handlers().POST(req);
