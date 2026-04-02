import type { NextRequest } from "next/server";
import { authorizeRequest } from "@/app/lib/auth";
import { createFrpsForProvisioningRegion } from "@/app/lib/controller";
import { jsonError, jsonOk, jsonServerError } from "@/app/lib/response";

const statusForProvisioningError = (message: string) => {
  if (message === "Provisioning region not found.") {
    return 404;
  }

  if (
    message === "No online nodes are assigned to the selected provisioning region."
  ) {
    return 409;
  }

  return 500;
};

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth) {
    return jsonError("Unauthorized.", 401);
  }

  const body = await request.json().catch(() => null);
  const name = body?.name;
  const provisioningRegionId = body?.provisioningRegionId;

  if (typeof name !== "string" || name.trim().length < 2) {
    return jsonError("FRPS name must be at least 2 characters.", 400);
  }

  if (typeof provisioningRegionId !== "string") {
    return jsonError("Select a provisioning region.", 400);
  }

  try {
    const created = await createFrpsForProvisioningRegion(
      name.trim(),
      provisioningRegionId,
    );
    return jsonOk(created, 201);
  } catch (error) {
    if (error instanceof Error) {
      return jsonServerError(
        error,
        "Unable to provision FRPS in the selected region.",
        statusForProvisioningError(error.message),
      );
    }

    return jsonServerError(
      error,
      "Unable to provision FRPS in the selected region.",
    );
  }
}
