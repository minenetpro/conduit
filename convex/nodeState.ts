import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const NODE_OFFLINE_AFTER_MS = 90_000;

export const isNodeOnline = (lastHeartbeatAt: number) =>
  Date.now() - lastHeartbeatAt <= NODE_OFFLINE_AFTER_MS;

type ReadCtx = QueryCtx | MutationCtx;

export const getPresenceByNodeId = async (
  ctx: ReadCtx,
  edgeNodeId: Id<"edgeNodes">,
) =>
  await ctx.db
    .query("edgeNodePresence")
    .withIndex("by_edgeNodeId", (q) => q.eq("edgeNodeId", edgeNodeId))
    .unique();
