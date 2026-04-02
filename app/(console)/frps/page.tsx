import { ConfigErrorState } from "@/app/_components/console-ui";
import { FrpsPage } from "@/app/_components/frps-page";
import { listFrps, listProvisioningRegions } from "@/app/lib/controller";

export default async function FrpsRoute() {
  let frps: Awaited<ReturnType<typeof listFrps>> | null = null;
  let provisioningRegions: Awaited<
    ReturnType<typeof listProvisioningRegions>
  > | null = null;
  let loadError: string | null = null;

  try {
    [frps, provisioningRegions] = await Promise.all([
      listFrps(),
      listProvisioningRegions(),
    ]);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unable to load FRPS inventory.";
  }

  if (loadError || !frps || !provisioningRegions) {
    return <ConfigErrorState message={loadError ?? "Unable to load FRPS inventory."} />;
  }

  return (
    <FrpsPage
      frps={frps}
      provisioningRegions={provisioningRegions}
    />
  );
}
