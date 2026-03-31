import { ConfigErrorState } from "@/app/_components/console-ui";
import { TokensPage } from "@/app/_components/tokens-page";
import { listRegistrationTokens } from "@/app/lib/controller";

export default async function TokensRoute() {
  let registrationTokens:
    | Awaited<ReturnType<typeof listRegistrationTokens>>
    | null = null;
  let loadError: string | null = null;

  try {
    registrationTokens = await listRegistrationTokens();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Unable to load registration tokens.";
  }

  if (loadError || !registrationTokens) {
    return (
      <ConfigErrorState
        message={loadError ?? "Unable to load registration tokens."}
      />
    );
  }

  return <TokensPage registrationTokens={registrationTokens} />;
}
