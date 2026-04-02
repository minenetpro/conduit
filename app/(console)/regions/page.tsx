import { ConfigErrorState } from "@/app/_components/console-ui";
import { RegionsPage } from "@/app/_components/regions-page";
import { listNodes, listProvisioningRegions } from "@/app/lib/controller";

export default async function RegionsRoute() {
  let nodes: Awaited<ReturnType<typeof listNodes>> | null = null;
  let provisioningRegions: Awaited<
    ReturnType<typeof listProvisioningRegions>
  > | null = null;
  let loadError: string | null = null;

  try {
    [nodes, provisioningRegions] = await Promise.all([
      listNodes(),
      listProvisioningRegions(),
    ]);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Unable to load provisioning regions.";
  }

  if (loadError || !nodes || !provisioningRegions) {
    return (
      <ConfigErrorState
        message={loadError ?? "Unable to load provisioning regions."}
      />
    );
  }

  return (
    <RegionsPage
      nodes={nodes}
      provisioningRegions={provisioningRegions}
    />
  );
}
