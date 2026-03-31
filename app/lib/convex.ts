import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference, FunctionReturnType } from "convex/server";
import { env } from "@/app/lib/env";

const normalizeConvexError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('"code":"MalformedAccessToken"')) {
    return new Error(
      "Invalid Convex deploy key. Set CONVEX_DEPLOY_KEY to the deployment or admin key from the Convex dashboard. The CLI access token in ~/.convex/config.json will not work here.",
      { cause: error instanceof Error ? error : undefined },
    );
  }
  return error instanceof Error ? error : new Error(message);
};

const createClient = () => {
  const client = new ConvexHttpClient(env.convexUrl(), { logger: false });
  (
    client as ConvexHttpClient & {
      setAdminAuth: (token: string) => void;
    }
  ).setAdminAuth(env.convexDeployKey());
  return client;
};

export const convexQuery = async <
  T extends FunctionReference<"query", "public" | "internal">,
>(
  fn: T,
  args: T["_args"],
): Promise<FunctionReturnType<T>> => {
  const client = createClient();
  try {
    return (await client.query(
      fn as FunctionReference<"query">,
      args as FunctionReference<"query">["_args"],
    )) as FunctionReturnType<T>;
  } catch (error) {
    throw normalizeConvexError(error);
  }
};

export const convexMutation = async <
  T extends FunctionReference<"mutation", "public" | "internal">,
>(
  fn: T,
  args: T["_args"],
): Promise<FunctionReturnType<T>> => {
  const client = createClient();
  try {
    return (await client.mutation(
      fn as FunctionReference<"mutation">,
      args as FunctionReference<"mutation">["_args"],
    )) as FunctionReturnType<T>;
  } catch (error) {
    throw normalizeConvexError(error);
  }
};
