const required = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const optional = (name: string) => {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
};

const isConvexDeployKey = (value: string) => {
  const parts = value.split("|");
  return parts.length >= 2 && parts[0]!.length > 0 && parts.at(-1)!.length > 0;
};

const requiredConvexDeployKey = () => {
  const value = optional("CONVEX_DEPLOY_KEY") ?? optional("CONVEX_ADMIN_KEY");
  if (!value) {
    throw new Error(
      "Missing required environment variable: CONVEX_DEPLOY_KEY. Use the deployment key from the Convex dashboard. CONVEX_ADMIN_KEY is supported as a legacy alias.",
    );
  }

  if (!isConvexDeployKey(value)) {
    throw new Error(
      "Invalid Convex deploy key. Set CONVEX_DEPLOY_KEY to the deployment or admin key from the Convex dashboard. The CLI access token in ~/.convex/config.json will not work here.",
    );
  }

  return value;
};

export const env = {
  convexUrl: () => required("NEXT_PUBLIC_CONVEX_URL"),
  convexDeployKey: requiredConvexDeployKey,
  sessionSecret: () => required("SESSION_SECRET"),
  adminUsername: () => required("CONDUIT_ADMIN_USERNAME"),
  adminPassword: () => required("CONDUIT_ADMIN_PASSWORD"),
  adminApiToken: () => required("CONDUIT_ADMIN_API_TOKEN"),
  vultrApiKey: () => required("VULTR_API_KEY"),
  frpsImage: () =>
    process.env.CONDUIT_FRPS_IMAGE ?? "ghcr.io/fatedier/frps:v0.65.0",
};
