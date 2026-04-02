# Conduit

Conduit is the controller UI and ops API for provisioning `fatedier/frp` servers on existing Vultr edge nodes. It is built with Next.js for the admin surface and Convex for state, jobs, and orchestration.

## Local Development

1. Install dependencies with `bun install`.
2. Copy `.env.example` to `.env.local`.
3. Set the required Convex, session, admin, and Vultr variables.
4. Run the app with `bun dev`.

The controller expects a Convex deployment key:

```dotenv
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOY_KEY=prod:your-deployment|your-secret
```

`CONVEX_DEPLOY_KEY` must come from the Convex dashboard. The user access token stored in `~/.convex/config.json` is not a deploy key and will fail with `MalformedAccessToken`.

## Main Responsibilities

- Admin login and bearer-token protected ops API
- Edge node registration and heartbeat tracking
- Provisioning region management and node grouping
- FRPS inventory and job orchestration
- Vultr Reserved IPv4 allocation, attachment, and cleanup

## Related Repo

`../conduit-node` contains the Bun edge agent that runs on Vultr instances and executes jobs from this controller.
