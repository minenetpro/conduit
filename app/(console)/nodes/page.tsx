import { ConfigErrorState } from "@/app/_components/console-ui";
import { NodesPage } from "@/app/_components/nodes-page";
import { listNodes } from "@/app/lib/controller";

export default async function NodesRoute() {
  let nodes: Awaited<ReturnType<typeof listNodes>> | null = null;
  let loadError: string | null = null;

  try {
    nodes = await listNodes();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unable to load edge nodes.";
  }

  if (loadError || !nodes) {
    return <ConfigErrorState message={loadError ?? "Unable to load edge nodes."} />;
  }

  return <NodesPage nodes={nodes} />;
}
