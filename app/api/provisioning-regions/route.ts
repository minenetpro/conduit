import type { NextRequest } from "next/server";
import {
  createProvisioningRegion,
  listProvisioningRegions,
} from "@/app/lib/controller";
import { authorizeRequest } from "@/app/lib/auth";
import { jsonError, jsonOk, jsonServerError } from "@/app/lib/response";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request);
    if (!auth) {
      return jsonError("Unauthorized.", 401);
    }

    const provisioningRegions = await listProvisioningRegions();
    return jsonOk({ provisioningRegions });
  } catch (error) {
    return jsonServerError(
      error,
      "Unable to load provisioning regions.",
    );
  }
}

export async function POST(request: NextRequest) {
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

  try {
    const created = await createProvisioningRegion(name.trim());
    return jsonOk(created, 201);
  } catch (error) {
    return jsonServerError(error, "Unable to create provisioning region.");
  }
}
