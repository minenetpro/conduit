import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { getPresenceByNodeId, isNodeOnline } from "./nodeState";

type ReadCtx = QueryCtx | MutationCtx;

const DEFAULT_RESERVATION_TTL_MS = 5 * 60 * 1000;

const isActiveFrps = (instance: Doc<"frpsInstances">) =>
  !(
    instance.desiredState === "deleted" && instance.runtimeState === "deleted"
  );

const slugifyProvisioningRegion = (value: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error("Provisioning region name must include letters or numbers.");
  }

  return slug;
};

const countActiveFrpsForNode = async (
  ctx: ReadCtx,
  edgeNodeId: Id<"edgeNodes">,
) => {
  const frps = await ctx.db
    .query("frpsInstances")
    .withIndex("by_edgeNodeId", (q) => q.eq("edgeNodeId", edgeNodeId))
    .take(200);

  return frps.filter(isActiveFrps).length;
};

const countActiveFrpsForProvisioningRegion = async (
  ctx: ReadCtx,
  provisioningRegionId: Id<"provisioningRegions">,
) => {
  const frps = await ctx.db
    .query("frpsInstances")
    .withIndex("by_provisioningRegionId", (q) =>
      q.eq("provisioningRegionId", provisioningRegionId),
    )
    .take(200);

  return frps.filter(isActiveFrps).length;
};

const countActiveReservationsForNode = async (
  ctx: ReadCtx,
  edgeNodeId: Id<"edgeNodes">,
  now: number,
) =>
  (
    await ctx.db
      .query("provisioningReservations")
      .withIndex("by_edgeNodeId_and_expiresAt", (q) =>
        q.eq("edgeNodeId", edgeNodeId).gt("expiresAt", now),
      )
      .take(200)
  ).length;

const countActiveReservationsForProvisioningRegion = async (
  ctx: ReadCtx,
  provisioningRegionId: Id<"provisioningRegions">,
  now: number,
) =>
  (
    await ctx.db
      .query("provisioningReservations")
      .withIndex("by_provisioningRegionId_and_expiresAt", (q) =>
        q.eq("provisioningRegionId", provisioningRegionId).gt("expiresAt", now),
      )
      .take(200)
  ).length;

const assertSlugAvailable = async (
  ctx: MutationCtx,
  slug: string,
  skipId?: Id<"provisioningRegions">,
) => {
  const existing = await ctx.db
    .query("provisioningRegions")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  if (existing && existing._id !== skipId) {
    throw new Error("Provisioning region already exists.");
  }
};

const buildProvisioningRegionSummary = async (
  ctx: ReadCtx,
  region: Doc<"provisioningRegions">,
) => {
  const assignedNodes = await ctx.db
    .query("edgeNodes")
    .withIndex("by_provisioningRegionId", (q) =>
      q.eq("provisioningRegionId", region._id),
    )
    .take(100);

  let onlineNodeCount = 0;
  for (const node of assignedNodes) {
    const presence = await getPresenceByNodeId(ctx, node._id);
    if (presence && isNodeOnline(presence.lastHeartbeatAt)) {
      onlineNodeCount += 1;
    }
  }

  const now = Date.now();

  return {
    _id: region._id,
    name: region.name,
    slug: region.slug,
    assignedNodeCount: assignedNodes.length,
    onlineNodeCount,
    frpsCount: await countActiveFrpsForProvisioningRegion(ctx, region._id),
    activeReservationCount: await countActiveReservationsForProvisioningRegion(
      ctx,
      region._id,
      now,
    ),
    createdAt: region.createdAt,
    updatedAt: region.updatedAt,
  };
};

export const listProvisioningRegions = internalQuery({
  args: {},
  handler: async (ctx) => {
    const regions = await ctx.db.query("provisioningRegions").take(100);
    const results = [];

    for (const region of regions) {
      results.push(await buildProvisioningRegionSummary(ctx, region));
    }

    return results.sort((left, right) => left.name.localeCompare(right.name));
  },
});

export const createProvisioningRegion = internalMutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name.length < 2) {
      throw new Error("Provisioning region name must be at least 2 characters.");
    }

    const slug = slugifyProvisioningRegion(name);
    await assertSlugAvailable(ctx, slug);

    const now = Date.now();
    const provisioningRegionId = await ctx.db.insert("provisioningRegions", {
      name,
      slug,
      createdAt: now,
      updatedAt: now,
    });

    return { provisioningRegionId };
  },
});

export const renameProvisioningRegion = internalMutation({
  args: {
    provisioningRegionId: v.id("provisioningRegions"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const region = await ctx.db.get(args.provisioningRegionId);
    if (!region) {
      throw new Error("Provisioning region not found.");
    }

    const name = args.name.trim();
    if (name.length < 2) {
      throw new Error("Provisioning region name must be at least 2 characters.");
    }

    const slug = slugifyProvisioningRegion(name);
    await assertSlugAvailable(ctx, slug, region._id);

    await ctx.db.patch("provisioningRegions", region._id, {
      name,
      slug,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const deleteProvisioningRegion = internalMutation({
  args: {
    provisioningRegionId: v.id("provisioningRegions"),
  },
  handler: async (ctx, args) => {
    const region = await ctx.db.get(args.provisioningRegionId);
    if (!region) {
      throw new Error("Provisioning region not found.");
    }

    const assignedNode = await ctx.db
      .query("edgeNodes")
      .withIndex("by_provisioningRegionId", (q) =>
        q.eq("provisioningRegionId", args.provisioningRegionId),
      )
      .take(1);

    if (assignedNode.length > 0) {
      throw new Error("Unassign all nodes before deleting this provisioning region.");
    }

    const frps = await ctx.db
      .query("frpsInstances")
      .withIndex("by_provisioningRegionId", (q) =>
        q.eq("provisioningRegionId", args.provisioningRegionId),
      )
      .take(200);

    if (frps.some(isActiveFrps)) {
      throw new Error(
        "Delete or move active FRPS instances before deleting this provisioning region.",
      );
    }

    const reservations = await ctx.db
      .query("provisioningReservations")
      .withIndex("by_provisioningRegionId_and_expiresAt", (q) =>
        q.eq("provisioningRegionId", args.provisioningRegionId).gt("expiresAt", 0),
      )
      .take(200);

    for (const reservation of reservations) {
      await ctx.db.delete(reservation._id);
    }

    await ctx.db.delete(args.provisioningRegionId);
    return { ok: true };
  },
});

export const assignNodeToProvisioningRegion = internalMutation({
  args: {
    provisioningRegionId: v.id("provisioningRegions"),
    nodeId: v.id("edgeNodes"),
  },
  handler: async (ctx, args) => {
    const [region, node] = await Promise.all([
      ctx.db.get(args.provisioningRegionId),
      ctx.db.get(args.nodeId),
    ]);

    if (!region) {
      throw new Error("Provisioning region not found.");
    }

    if (!node) {
      throw new Error("Edge node not found.");
    }

    await ctx.db.patch("edgeNodes", args.nodeId, {
      provisioningRegionId: args.provisioningRegionId,
      updatedAt: Date.now(),
    });

    const frps = await ctx.db
      .query("frpsInstances")
      .withIndex("by_edgeNodeId", (q) => q.eq("edgeNodeId", args.nodeId))
      .take(200);

    for (const instance of frps) {
      if (instance.provisioningRegionId || !isActiveFrps(instance)) {
        continue;
      }

      await ctx.db.patch("frpsInstances", instance._id, {
        provisioningRegionId: args.provisioningRegionId,
        updatedAt: Date.now(),
      });
    }

    return { ok: true };
  },
});

export const unassignNodeFromProvisioningRegion = internalMutation({
  args: {
    provisioningRegionId: v.id("provisioningRegions"),
    nodeId: v.id("edgeNodes"),
  },
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.nodeId);
    if (!node) {
      throw new Error("Edge node not found.");
    }

    if (node.provisioningRegionId !== args.provisioningRegionId) {
      throw new Error("Node is not assigned to this provisioning region.");
    }

    await ctx.db.patch("edgeNodes", args.nodeId, {
      provisioningRegionId: null,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const reserveProvisioningNode = internalMutation({
  args: {
    provisioningRegionId: v.id("provisioningRegions"),
    reservationTtlMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const region = await ctx.db.get(args.provisioningRegionId);
    if (!region) {
      throw new Error("Provisioning region not found.");
    }

    const nodes = await ctx.db
      .query("edgeNodes")
      .withIndex("by_provisioningRegionId", (q) =>
        q.eq("provisioningRegionId", args.provisioningRegionId),
      )
      .take(100);

    const now = Date.now();
    const candidates: Array<{
      node: Doc<"edgeNodes">;
      effectiveLoad: number;
    }> = [];

    for (const node of nodes) {
      const presence = await getPresenceByNodeId(ctx, node._id);
      if (!presence || !isNodeOnline(presence.lastHeartbeatAt)) {
        continue;
      }

      const [frpsCount, reservationCount] = await Promise.all([
        countActiveFrpsForNode(ctx, node._id),
        countActiveReservationsForNode(ctx, node._id, now),
      ]);

      candidates.push({
        node,
        effectiveLoad: frpsCount + reservationCount,
      });
    }

    if (candidates.length === 0) {
      throw new Error(
        "No online nodes are assigned to the selected provisioning region.",
      );
    }

    candidates.sort((left, right) => {
      if (left.effectiveLoad !== right.effectiveLoad) {
        return left.effectiveLoad - right.effectiveLoad;
      }

      const labelOrder = left.node.label.localeCompare(right.node.label);
      if (labelOrder !== 0) {
        return labelOrder;
      }

      return left.node._id.localeCompare(right.node._id);
    });

    const selected = candidates[0];
    const reservationId = await ctx.db.insert("provisioningReservations", {
      provisioningRegionId: region._id,
      edgeNodeId: selected.node._id,
      expiresAt: now + (args.reservationTtlMs ?? DEFAULT_RESERVATION_TTL_MS),
      createdAt: now,
      updatedAt: now,
    });

    return {
      reservationId,
      provisioningRegionId: region._id,
      provisioningRegionName: region.name,
      edgeNodeId: selected.node._id,
      edgeNodeLabel: selected.node.label,
      vultrInstanceId: selected.node.vultrInstanceId,
      providerRegion: selected.node.region,
      effectiveLoad: selected.effectiveLoad,
    };
  },
});

export const releaseProvisioningReservation = internalMutation({
  args: {
    reservationId: v.id("provisioningReservations"),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      return { ok: true };
    }

    await ctx.db.delete(args.reservationId);
    return { ok: true };
  },
});

export const reapExpiredProvisioningReservations = internalMutation({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("provisioningReservations")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .take(args.limit);

    for (const reservation of expired) {
      await ctx.db.delete(reservation._id);
    }

    return { scanned: expired.length };
  },
});
