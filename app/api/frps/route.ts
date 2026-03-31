import type { NextRequest } from "next/server";
import { authorizeRequest } from "@/app/lib/auth";
import { createFrps, listFrps } from "@/app/lib/controller";
import { jsonError, jsonOk, jsonServerError } from "@/app/lib/response";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request);
    if (!auth) {
      return jsonError("Unauthorized.", 401);
    }

    const frps = await listFrps();
    return jsonOk({ frps });
  } catch (error) {
    return jsonServerError(error, "Unable to load FRPS instances.");
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth) {
    return jsonError("Unauthorized.", 401);
  }

  const body = await request.json().catch(() => null);
  const name = body?.name;
  const edgeNodeId = body?.edgeNodeId;

  if (typeof name !== "string" || name.trim().length < 2) {
    return jsonError("FRPS name must be at least 2 characters.", 400);
  }

  if (typeof edgeNodeId !== "string") {
    return jsonError("Select an edge node.", 400);
  }

  try {
    const created = await createFrps(name.trim(), edgeNodeId);
    return jsonOk(created, 201);
  } catch (error) {
    return jsonServerError(error, "Unable to create FRPS instance.");
  }
}
