import type { NextRequest } from "next/server";
import { authorizeRequest } from "@/app/lib/auth";
import { deleteRegistrationToken } from "@/app/lib/controller";
import { jsonError, jsonOk, jsonServerError } from "@/app/lib/response";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorizeRequest(request);
    if (!auth) {
      return jsonError("Unauthorized.", 401);
    }

    const { id } = await context.params;
    await deleteRegistrationToken(id);
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonServerError(error, "Unable to delete registration token.");
  }
}
