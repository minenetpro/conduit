import { ConfigErrorState } from "@/app/_components/console-ui";
import { FrpsPage } from "@/app/_components/frps-page";
import { listFrps, listNodes } from "@/app/lib/controller";

export default async function FrpsRoute() {
  let nodes: Awaited<ReturnType<typeof listNodes>> | null = null;
  let frps: Awaited<ReturnType<typeof listFrps>> | null = null;
  let loadError: string | null = null;

  try {
    [nodes, frps] = await Promise.all([listNodes(), listFrps()]);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unable to load FRPS inventory.";
  }

  if (loadError || !nodes || !frps) {
    return <ConfigErrorState message={loadError ?? "Unable to load FRPS inventory."} />;
  }

  return <FrpsPage nodes={nodes} frps={frps} />;
}
