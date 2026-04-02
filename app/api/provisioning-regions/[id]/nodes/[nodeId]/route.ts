import type { NextRequest } from "next/server";
import { unassignNodeFromProvisioningRegion } from "@/app/lib/controller";
import { authorizeRequest } from "@/app/lib/auth";
import { jsonError, jsonOk, jsonServerError } from "@/app/lib/response";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; nodeId: string }> },
) {
  const auth = await authorizeRequest(request);
  if (!auth) {
    return jsonError("Unauthorized.", 401);
  }

  const { id, nodeId } = await context.params;

  try {
    await unassignNodeFromProvisioningRegion(id, nodeId);
    return jsonOk({});
  } catch (error) {
    return jsonServerError(
      error,
      "Unable to unassign the node from this provisioning region.",
    );
  }
}
