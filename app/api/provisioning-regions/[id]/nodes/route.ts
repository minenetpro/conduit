import type { NextRequest } from "next/server";
import { assignNodeToProvisioningRegion } from "@/app/lib/controller";
import { authorizeRequest } from "@/app/lib/auth";
import { jsonError, jsonOk, jsonServerError } from "@/app/lib/response";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request);
  if (!auth) {
    return jsonError("Unauthorized.", 401);
  }

  const body = await request.json().catch(() => null);
  const nodeId = body?.nodeId;

  if (typeof nodeId !== "string") {
    return jsonError("Select an edge node.", 400);
  }

  const { id } = await context.params;

  try {
    await assignNodeToProvisioningRegion(id, nodeId);
    return jsonOk({});
  } catch (error) {
    return jsonServerError(
      error,
      "Unable to assign the node to this provisioning region.",
    );
  }
}
