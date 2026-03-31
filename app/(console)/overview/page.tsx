import { ConfigErrorState } from "@/app/_components/console-ui";
import { OverviewPage } from "@/app/_components/overview-page";
import { loadDashboardData } from "@/app/lib/controller";

const loadOverviewModel = async () => ({
  ...(await loadDashboardData()),
  now: Date.now(),
});

export default async function OverviewRoute() {
  let overviewData: Awaited<ReturnType<typeof loadOverviewModel>> | null = null;
  let loadError: string | null = null;

  try {
    overviewData = await loadOverviewModel();
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unable to load controller state.";
  }

  if (loadError || !overviewData) {
    return <ConfigErrorState message={loadError ?? "Unable to load controller state."} />;
  }

  return <OverviewPage {...overviewData} />;
}
