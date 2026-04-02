import type { Id } from "@/convex/_generated/dataModel";
import { internal } from "@/convex/_generated/api";
import type {
  AgentJobPayload,
  FrpsSummary,
  JobKind,
  ProvisioningRegionSummary,
} from "@/app/lib/contracts";
import { convexMutation, convexQuery } from "@/app/lib/convex";
import {
  attachReservedIpv4,
  createReservedIpv4,
  deleteReservedIpv4,
} from "@/app/lib/vultr";
import {
  createOpaqueToken,
  hashToken,
  previewToken,
  slugify,
} from "@/app/lib/crypto";
import { env } from "@/app/lib/env";

const DEFAULT_BIND_PORT = 7000;
const DEFAULT_PROXY_PORT_START = 1024;
const DEFAULT_PROXY_PORT_END = 49_151;
const DEFAULT_REGISTRATION_TOKEN_TTL_HOURS = 24;
const DEFAULT_JOB_LEASE_MS = 60_000;
const DEFAULT_PROVISIONING_RESERVATION_TTL_MS = 5 * 60 * 1000;

const asEdgeNodeId = (value: string) => value as Id<"edgeNodes">;
const asFrpsId = (value: string) => value as Id<"frpsInstances">;
const asJobId = (value: string) => value as Id<"jobs">;
const asRegistrationTokenId = (value: string) =>
  value as Id<"nodeRegistrationTokens">;
const asProvisioningRegionId = (value: string) =>
  value as Id<"provisioningRegions">;
const asProvisioningReservationId = (value: string) =>
  value as Id<"provisioningReservations">;

const buildFrpsPayload = (frps: FrpsSummary): AgentJobPayload => ({
  frpsId: frps._id,
  name: frps.name,
  containerName: frps.containerName,
  reservedIp: frps.reservedIp,
  bindPort: frps.bindPort,
  proxyPortStart: frps.proxyPortStart,
  proxyPortEnd: frps.proxyPortEnd,
  authToken: frps.authToken,
  image: frps.image,
});

type FrpsProvisionTarget = {
  edgeNodeId: string;
  edgeNodeLabel: string;
  vultrInstanceId: string;
  providerRegion: string;
  provisioningRegionId: string | null;
  provisioningRegionName: string | null;
};

const buildFrpsCreateResult = (input: {
  frpsId: string;
  edgeNodeId: string;
  edgeNodeLabel: string;
  provisioningRegionId: string | null;
  provisioningRegionName: string | null;
  serverAddr: string;
  authToken: string;
}) => ({
  frpsId: input.frpsId,
  edgeNodeId: input.edgeNodeId,
  edgeNodeLabel: input.edgeNodeLabel,
  provisioningRegionId: input.provisioningRegionId,
  provisioningRegionName: input.provisioningRegionName,
  connection: {
    serverAddr: input.serverAddr,
    bindPort: DEFAULT_BIND_PORT,
    authToken: input.authToken,
    allowedPorts: `${DEFAULT_PROXY_PORT_START}-${DEFAULT_PROXY_PORT_END}`,
  },
});

const provisionFrpsOnTarget = async (
  name: string,
  target: FrpsProvisionTarget,
) => {
  let reservedIpId: string | null = null;
  let createdFrpsId: string | null = null;

  try {
    const reservedIp = await createReservedIpv4(
      target.providerRegion,
      `conduit-${slugify(name)}-${Date.now().toString(36)}`,
    );
    reservedIpId = reservedIp.id;

    await attachReservedIpv4(reservedIp.id, target.vultrInstanceId);

    const authToken = createOpaqueToken("frps");
    const image = env.frpsImage();
    const containerName = `conduit-frps-${slugify(name) || "node"}-${Date.now().toString(36)}`;

    const created = await convexMutation(internal.frps.createFrpsProvisioning, {
      name,
      edgeNodeId: asEdgeNodeId(target.edgeNodeId),
      provisioningRegionId: target.provisioningRegionId
        ? asProvisioningRegionId(target.provisioningRegionId)
        : null,
      reservedIpId: reservedIp.id,
      reservedIp: reservedIp.address,
      region: target.providerRegion,
      bindPort: DEFAULT_BIND_PORT,
      proxyPortStart: DEFAULT_PROXY_PORT_START,
      proxyPortEnd: DEFAULT_PROXY_PORT_END,
      authToken,
      image,
      containerName,
    });

    createdFrpsId = created.frpsId;

    await convexMutation(internal.jobs.enqueueJob, {
      kind: "provision_frps",
      targetNodeId: asEdgeNodeId(target.edgeNodeId),
      frpsInstanceId: created.frpsId,
      payload: {
        frpsId: created.frpsId,
        name,
        containerName,
        reservedIp: reservedIp.address,
        bindPort: DEFAULT_BIND_PORT,
        proxyPortStart: DEFAULT_PROXY_PORT_START,
        proxyPortEnd: DEFAULT_PROXY_PORT_END,
        authToken,
        image,
      },
    });

    return buildFrpsCreateResult({
      frpsId: created.frpsId,
      edgeNodeId: target.edgeNodeId,
      edgeNodeLabel: target.edgeNodeLabel,
      provisioningRegionId: target.provisioningRegionId,
      provisioningRegionName: target.provisioningRegionName,
      serverAddr: reservedIp.address,
      authToken,
    });
  } catch (error) {
    if (createdFrpsId) {
      await convexMutation(internal.frps.rollbackFrpsProvisioning, {
        frpsId: asFrpsId(createdFrpsId),
      }).catch(() => null);
    }

    if (reservedIpId) {
      await deleteReservedIpv4(reservedIpId).catch(() => null);
    }

    throw error;
  }
};

export const loadDashboardData = async () => {
  const [nodes, frps, registrationTokens] = await Promise.all([
    convexQuery(internal.nodes.listNodes, {}),
    convexQuery(internal.frps.listFrps, {}),
    convexQuery(internal.nodes.listRegistrationTokens, {}),
  ]);

  return {
    nodes,
    frps,
    registrationTokens,
  };
};

export const listNodes = async () => convexQuery(internal.nodes.listNodes, {});

export const getNode = async (nodeId: string) =>
  convexQuery(internal.nodes.getNode, { nodeId: asEdgeNodeId(nodeId) });

export const listProvisioningRegions = async (): Promise<
  ProvisioningRegionSummary[]
> => convexQuery(internal.provisioningRegions.listProvisioningRegions, {});

export const createProvisioningRegion = async (name: string) =>
  convexMutation(internal.provisioningRegions.createProvisioningRegion, {
    name,
  });

export const renameProvisioningRegion = async (
  provisioningRegionId: string,
  name: string,
) =>
  convexMutation(internal.provisioningRegions.renameProvisioningRegion, {
    provisioningRegionId: asProvisioningRegionId(provisioningRegionId),
    name,
  });

export const deleteProvisioningRegion = async (provisioningRegionId: string) =>
  convexMutation(internal.provisioningRegions.deleteProvisioningRegion, {
    provisioningRegionId: asProvisioningRegionId(provisioningRegionId),
  });

export const assignNodeToProvisioningRegion = async (
  provisioningRegionId: string,
  nodeId: string,
) =>
  convexMutation(internal.provisioningRegions.assignNodeToProvisioningRegion, {
    provisioningRegionId: asProvisioningRegionId(provisioningRegionId),
    nodeId: asEdgeNodeId(nodeId),
  });

export const unassignNodeFromProvisioningRegion = async (
  provisioningRegionId: string,
  nodeId: string,
) =>
  convexMutation(
    internal.provisioningRegions.unassignNodeFromProvisioningRegion,
    {
      provisioningRegionId: asProvisioningRegionId(provisioningRegionId),
      nodeId: asEdgeNodeId(nodeId),
    },
  );

export const listRegistrationTokens = async () =>
  convexQuery(internal.nodes.listRegistrationTokens, {});

export const deleteRegistrationToken = async (tokenId: string) =>
  convexMutation(internal.nodes.deleteRegistrationToken, {
    tokenId: asRegistrationTokenId(tokenId),
  });

export const createRegistrationToken = async (
  label: string,
  ttlHours = DEFAULT_REGISTRATION_TOKEN_TTL_HOURS,
) => {
  const token = createOpaqueToken("reg");
  const expiresAt = Date.now() + ttlHours * 60 * 60 * 1000;

  await convexMutation(internal.nodes.createRegistrationToken, {
    label,
    tokenHash: hashToken(token),
    tokenPreview: previewToken(token),
    expiresAt,
  });

  return {
    token,
    label,
    expiresAt,
  };
};

export const listFrps = async () => convexQuery(internal.frps.listFrps, {});

export const getFrps = async (frpsId: string) =>
  convexQuery(internal.frps.getFrps, { frpsId: asFrpsId(frpsId) });

export const createFrps = async (name: string, edgeNodeId: string) => {
  const node = await getNode(edgeNodeId);
  if (!node) {
    throw new Error("Edge node not found.");
  }

  if (node.status !== "online") {
    throw new Error("Select an online edge node for provisioning.");
  }

  return provisionFrpsOnTarget(name, {
    edgeNodeId: node._id,
    edgeNodeLabel: node.label,
    vultrInstanceId: node.vultrInstanceId,
    providerRegion: node.region,
    provisioningRegionId: node.provisioningRegionId,
    provisioningRegionName: node.provisioningRegionName,
  });
};

export const createFrpsForProvisioningRegion = async (
  name: string,
  provisioningRegionId: string,
) => {
  const reservation = await convexMutation(
    internal.provisioningRegions.reserveProvisioningNode,
    {
      provisioningRegionId: asProvisioningRegionId(provisioningRegionId),
      reservationTtlMs: DEFAULT_PROVISIONING_RESERVATION_TTL_MS,
    },
  );

  try {
    return await provisionFrpsOnTarget(name, {
      edgeNodeId: reservation.edgeNodeId,
      edgeNodeLabel: reservation.edgeNodeLabel,
      vultrInstanceId: reservation.vultrInstanceId,
      providerRegion: reservation.providerRegion,
      provisioningRegionId: reservation.provisioningRegionId,
      provisioningRegionName: reservation.provisioningRegionName,
    });
  } finally {
    await convexMutation(
      internal.provisioningRegions.releaseProvisioningReservation,
      {
        reservationId: asProvisioningReservationId(reservation.reservationId),
      },
    ).catch(() => null);
  }
};

const queueFrpsJob = async (
  frpsId: string,
  kind: JobKind,
  desiredState: FrpsSummary["desiredState"],
  runtimeState: FrpsSummary["runtimeState"],
) => {
  const frps = await getFrps(frpsId);
  if (!frps) {
    throw new Error("FRPS instance not found.");
  }

  await convexMutation(internal.frps.setFrpsState, {
    frpsId: asFrpsId(frpsId),
    desiredState,
    runtimeState,
    lastError: null,
  });

  await convexMutation(internal.jobs.enqueueJob, {
    kind,
    targetNodeId: asEdgeNodeId(frps.edgeNodeId),
    frpsInstanceId: asFrpsId(frpsId),
    payload: buildFrpsPayload(frps),
  });

  return frps;
};

export const startFrps = async (frpsId: string) =>
  queueFrpsJob(frpsId, "start_frps", "running", "pending");

export const stopFrps = async (frpsId: string) =>
  queueFrpsJob(frpsId, "stop_frps", "stopped", "pending");

export const restartFrps = async (frpsId: string) =>
  queueFrpsJob(frpsId, "restart_frps", "running", "pending");

export const retryFrps = async (frpsId: string) => {
  const frps = await getFrps(frpsId);
  if (!frps) {
    throw new Error("FRPS instance not found.");
  }

  if (frps.desiredState === "deleted") {
    return queueFrpsJob(frpsId, "delete_frps", "deleted", "deleting");
  }

  if (frps.desiredState === "stopped") {
    return queueFrpsJob(frpsId, "stop_frps", "stopped", "pending");
  }

  return queueFrpsJob(frpsId, "provision_frps", "running", "pending");
};

export const deleteFrps = async (frpsId: string) =>
  queueFrpsJob(frpsId, "delete_frps", "deleted", "deleting");

export const registerAgentNode = async (input: {
  registrationToken: string;
  label: string;
  hostname: string;
  vultrInstanceId: string;
  region: string;
  agentVersion: string;
  dockerVersion: string | null;
}) => {
  const agentToken = createOpaqueToken("node");
  const result = await convexMutation(internal.nodes.exchangeRegistrationToken, {
    tokenHash: hashToken(input.registrationToken),
    label: input.label,
    hostname: input.hostname,
    vultrInstanceId: input.vultrInstanceId,
    region: input.region,
    agentVersion: input.agentVersion,
    dockerVersion: input.dockerVersion,
    nodeTokenHash: hashToken(agentToken),
    nodeTokenPreview: previewToken(agentToken),
  });

  return {
    nodeId: result.edgeNodeId,
    agentToken,
  };
};

export const authenticateAgentNode = async (nodeId: string, agentToken: string) =>
  convexQuery(internal.nodes.authenticateNode, {
    nodeId: asEdgeNodeId(nodeId),
    nodeTokenHash: hashToken(agentToken),
  });

export const recordAgentHeartbeat = async (input: {
  nodeId: string;
  hostname: string;
  agentVersion: string;
  dockerVersion: string | null;
  runningContainers: number;
}) =>
  convexMutation(internal.nodes.recordHeartbeat, {
    nodeId: asEdgeNodeId(input.nodeId),
    hostname: input.hostname,
    agentVersion: input.agentVersion,
    dockerVersion: input.dockerVersion,
    runningContainers: input.runningContainers,
  });

export const claimAgentJob = async (nodeId: string) =>
  convexMutation(internal.jobs.claimNextJob, {
    targetNodeId: asEdgeNodeId(nodeId),
    leaseDurationMs: DEFAULT_JOB_LEASE_MS,
  });

export const getJob = async (jobId: string) =>
  convexQuery(internal.jobs.getJob, { jobId: asJobId(jobId) });

export const completeAgentJob = async (input: {
  jobId: string;
  status: "succeeded" | "failed";
  message?: string;
  containerName?: string;
}) =>
  convexMutation(internal.jobs.completeJob, {
    jobId: asJobId(input.jobId),
    status: input.status,
    message: input.message,
    containerName: input.containerName,
  });

export const cleanupDeletedFrpsIp = async (frpsId: string) => {
  const frps = await getFrps(frpsId);
  if (!frps) {
    throw new Error("FRPS instance not found for cleanup.");
  }

  await deleteReservedIpv4(frps.reservedIpId);
};
