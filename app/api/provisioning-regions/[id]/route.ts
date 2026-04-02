import type { NextRequest } from "next/server";
import {
  deleteProvisioningRegion,
  renameProvisioningRegion,
} from "@/app/lib/controller";
import { authorizeRequest } from "@/app/lib/auth";
import { jsonError, jsonOk, jsonServerError } from "@/app/lib/response";

const statusForProvisioningRegionError = (message: string) => {
  if (message === "Provisioning region not found.") {
    return 404;
  }

  if (
    message === "Unassign all nodes before deleting this provisioning region." ||
    message ===
      "Delete or move active FRPS instances before deleting this provisioning region."
  ) {
    return 409;
  }

  return 500;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request);
  if (!auth) {
    return jsonError("Unauthorized.", 401);
  }

  const body = await request.json().catch(() => null);
  const name = body?.name;

  if (typeof name !== "string" || name.trim().length < 2) {
    return jsonError(
      "Provisioning region name must be at least 2 characters.",
      400,
    );
  }

  const { id } = await context.params;

  try {
    await renameProvisioningRegion(id, name.trim());
    return jsonOk({});
  } catch (error) {
    if (error instanceof Error) {
      return jsonServerError(
        error,
        "Unable to rename provisioning region.",
        statusForProvisioningRegionError(error.message),
      );
    }

    return jsonServerError(error, "Unable to rename provisioning region.");
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request);
  if (!auth) {
    return jsonError("Unauthorized.", 401);
  }

  const { id } = await context.params;

  try {
    await deleteProvisioningRegion(id);
    return jsonOk({});
  } catch (error) {
    if (error instanceof Error) {
      return jsonServerError(
        error,
        "Unable to delete provisioning region.",
        statusForProvisioningRegionError(error.message),
      );
    }

    return jsonServerError(error, "Unable to delete provisioning region.");
  }
}
