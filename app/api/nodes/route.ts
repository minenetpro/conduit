import type { NextRequest } from "next/server";
import { authorizeRequest } from "@/app/lib/auth";
import { listNodes } from "@/app/lib/controller";
import { jsonError, jsonOk, jsonServerError } from "@/app/lib/response";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request);
    if (!auth) {
      return jsonError("Unauthorized.", 401);
    }

    const nodes = await listNodes();
    return jsonOk({ nodes });
  } catch (error) {
    return jsonServerError(error, "Unable to load edge nodes.");
  }
}
