"use client";

import {
  KeyRound,
  RefreshCw,
  Server,
  Shield,
  SquareTerminal,
  Waypoints,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  EdgeNodeSummary,
  FrpsConnectionDetails,
  FrpsSummary,
  RegistrationTokenSummary,
} from "@/app/lib/contracts";
import { cn } from "@/lib/utils";

type DashboardProps = {
  adminUsername: string;
  nodes: EdgeNodeSummary[];
  frps: FrpsSummary[];
  registrationTokens: RegistrationTokenSummary[];
};

type RegistrationTokenResponse = {
  ok: true;
  registrationToken: {
    label: string;
    token: string;
    expiresAt: number;
  };
};

type FrpsCreateResponse = {
  ok: true;
  frpsId: string;
  connection: FrpsConnectionDetails;
};

const formatDate = (timestamp: number | null) => {
  if (!timestamp) {
    return "Never";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
};

const statusBadge = (status: string) => {
  switch (status) {
    case "online":
    case "running":
    case "succeeded":
      return {
        variant: "default" as const,
        className: "",
      };
    case "pending":
    case "leased":
    case "deleting":
      return {
        variant: "secondary" as const,
        className: "border-dashed",
      };
    default:
      return {
        variant: "outline" as const,
        className: "",
      };
  }
};

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="gap-2 pb-3">
        <CardDescription className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          {label}
        </CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-zinc-500">
        {description}
      </CardContent>
    </Card>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center">
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
  );
}

export function Dashboard({
  adminUsername,
  nodes,
  frps,
  registrationTokens,
}: DashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tokenLabel, setTokenLabel] = useState("edge-node");
  const [tokenTtlHours, setTokenTtlHours] = useState("24");
  const [frpsName, setFrpsName] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0]?._id ?? "");
  const [createdToken, setCreatedToken] = useState<{
    label: string;
    token: string;
    expiresAt: number;
  } | null>(null);
  const [createdConnection, setCreatedConnection] = useState<{
    frpsId: string;
    connection: FrpsConnectionDetails;
  } | null>(null);

  const onlineNodes = nodes.filter((node) => node.status === "online");
  const runningFrps = frps.filter(
    (instance) => instance.runtimeState === "running",
  ).length;
  const errorFrps = frps.filter(
    (instance) => instance.runtimeState === "error",
  ).length;

  const refresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const request = async <T,>(url: string, init?: RequestInit): Promise<T> => {
    setError(null);

    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | T
      | null;

    if (!response.ok) {
      throw new Error(
        payload && typeof payload === "object" && "error" in payload
          ? payload.error ?? "Request failed."
          : `Request failed with ${response.status}.`,
      );
    }

    return payload as T;
  };

  const handleLogout = async () => {
    try {
      await request("/api/auth/logout", { method: "POST" });
      refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Logout failed.",
      );
    }
  };

  const handleRegistrationTokenCreate = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    try {
      const payload = await request<RegistrationTokenResponse>(
        "/api/nodes/registration-tokens",
        {
          method: "POST",
          body: JSON.stringify({
            label: tokenLabel,
            ttlHours: Number(tokenTtlHours),
          }),
        },
      );

      setCreatedToken(payload.registrationToken);
      refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create registration token.",
      );
    }
  };

  const handleFrpsCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const payload = await request<FrpsCreateResponse>("/api/frps", {
        method: "POST",
        body: JSON.stringify({
          name: frpsName,
          edgeNodeId: selectedNodeId,
        }),
      });

      setCreatedConnection(payload);
      setFrpsName("");
      refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to provision FRPS.",
      );
    }
  };

  const handleFrpsAction = async (frpsId: string, action: string) => {
    const shouldDelete =
      action === "delete" &&
      !window.confirm("Delete this FRPS and release its reserved IPv4?");

    if (shouldDelete) {
      return;
    }

    try {
      if (action === "delete") {
        await request(`/api/frps/${frpsId}`, { method: "DELETE" });
      } else {
        await request(`/api/frps/${frpsId}/${action}`, { method: "POST" });
      }

      refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to dispatch FRPS action.",
      );
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Card className="rounded-2xl">
          <CardHeader className="gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <Badge
                variant="outline"
                className="rounded-full px-3 py-1 tracking-[0.16em] uppercase"
              >
                Conduit
              </Badge>
              <div className="space-y-3">
                <CardTitle className="text-4xl leading-tight sm:text-5xl">
                  Provision FRPS capacity on existing edge servers.
                </CardTitle>
                <CardDescription className="max-w-2xl text-base leading-7">
                  Minimal single-tenant control plane for node onboarding,
                  reserved IPv4 assignment, and FRPS lifecycle operations.
                </CardDescription>
              </div>
            </div>

            <div className="grid gap-3 text-sm text-zinc-600 sm:min-w-80">
              <div className="rounded-xl border border-zinc-200 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-500">Operator</span>
                  <span className="font-medium text-zinc-950">
                    {adminUsername}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={refresh}
                  disabled={isPending}
                >
                  <RefreshCw className={cn(isPending && "animate-spin")} />
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={handleLogout}
                  disabled={isPending}
                >
                  Sign out
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {error ? (
          <Alert className="border-zinc-900">
            <AlertTitle>Request failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Online nodes"
            value={onlineNodes.length}
            description={`${nodes.length} registered edge hosts`}
          />
          <MetricCard
            label="Running FRPS"
            value={runningFrps}
            description={`${frps.length} managed instances`}
          />
          <MetricCard
            label="Needs attention"
            value={errorFrps}
            description="Instances reporting runtime errors"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_380px]">
          <div className="grid gap-6">
            <Card className="rounded-2xl">
              <CardHeader className="gap-2">
                <div className="flex items-center gap-2">
                  <Server className="size-4 text-zinc-500" />
                  <CardTitle>Edge nodes</CardTitle>
                </div>
                <CardDescription>
                  Registered Vultr instances running the edge agent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {nodes.length === 0 ? (
                  <EmptyState
                    title="No nodes registered"
                    description="Mint a registration token and onboard the first edge server."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Node</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Runtime</TableHead>
                        <TableHead>Last heartbeat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nodes.map((node) => {
                        const badge = statusBadge(node.status);
                        return (
                          <TableRow key={node._id}>
                            <TableCell className="min-w-72">
                              <div className="space-y-1">
                                <div className="font-medium text-zinc-950">
                                  {node.label}
                                </div>
                                <div className="font-mono text-xs text-zinc-500">
                                  {node.hostname} · {node.vultrInstanceId}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={badge.variant}
                                className={badge.className}
                              >
                                {node.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{node.region}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div>{node.frpsCount} managed</div>
                                <div className="text-xs text-zinc-500">
                                  {node.runningContainers} running containers
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-zinc-500">
                              {formatDate(node.lastHeartbeatAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="gap-2">
                <div className="flex items-center gap-2">
                  <Waypoints className="size-4 text-zinc-500" />
                  <CardTitle>FRPS inventory</CardTitle>
                </div>
                <CardDescription>
                  Managed server instances and their recent controller events.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {frps.length === 0 ? (
                  <EmptyState
                    title="No FRPS instances provisioned"
                    description="Create an instance after at least one edge node is online."
                  />
                ) : (
                  frps.map((instance) => {
                    const runtimeBadge = statusBadge(instance.runtimeState);
                    const desiredBadge = statusBadge(instance.desiredState);

                    return (
                      <div
                        key={instance._id}
                        className="rounded-xl border border-zinc-200"
                      >
                        <div className="flex flex-col gap-5 p-5">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold text-zinc-950">
                                  {instance.name}
                                </h3>
                                <Badge
                                  variant={runtimeBadge.variant}
                                  className={runtimeBadge.className}
                                >
                                  {instance.runtimeState}
                                </Badge>
                                <Badge
                                  variant={desiredBadge.variant}
                                  className={desiredBadge.className}
                                >
                                  desired {instance.desiredState}
                                </Badge>
                              </div>

                              <div className="grid gap-1 text-sm text-zinc-600">
                                <p>
                                  Node{" "}
                                  <span className="font-medium text-zinc-950">
                                    {instance.edgeNodeLabel}
                                  </span>
                                </p>
                                <p className="font-mono text-xs text-zinc-500">
                                  {instance.reservedIp}:{instance.bindPort} ·{" "}
                                  {instance.containerName}
                                </p>
                                <p className="font-mono text-xs text-zinc-500">
                                  token {instance.authToken.slice(0, 12)}... ·
                                  ports {instance.proxyPortRange}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleFrpsAction(instance._id, "start")
                                }
                                disabled={isPending}
                              >
                                Start
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleFrpsAction(instance._id, "stop")
                                }
                                disabled={isPending}
                              >
                                Stop
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleFrpsAction(instance._id, "restart")
                                }
                                disabled={isPending}
                              >
                                Restart
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  handleFrpsAction(instance._id, "retry")
                                }
                                disabled={isPending}
                              >
                                Retry
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleFrpsAction(instance._id, "delete")
                                }
                                disabled={isPending}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>

                          {instance.lastError ? (
                            <Alert className="border-zinc-300">
                              <AlertTitle>Last error</AlertTitle>
                              <AlertDescription>
                                {instance.lastError}
                              </AlertDescription>
                            </Alert>
                          ) : null}

                          {instance.recentEvents.length > 0 ? (
                            <>
                              <Separator />
                              <div className="grid gap-2">
                                {instance.recentEvents.map((event) => {
                                  const eventBadge = statusBadge(event.status);

                                  return (
                                    <div
                                      key={event._id}
                                      className="flex flex-col gap-2 rounded-lg border border-zinc-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                      <div className="flex min-w-0 items-start gap-3">
                                        <Badge
                                          variant={eventBadge.variant}
                                          className={eventBadge.className}
                                        >
                                          {event.status}
                                        </Badge>
                                        <span className="text-sm text-zinc-600">
                                          {event.message}
                                        </span>
                                      </div>
                                      <span className="font-mono text-xs text-zinc-500">
                                        {formatDate(event.createdAt)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card className="rounded-2xl">
              <CardHeader className="gap-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4 text-zinc-500" />
                  <CardTitle>Node onboarding</CardTitle>
                </div>
                <CardDescription>
                  Mint a registration token for a new edge installation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <form
                  className="space-y-4"
                  onSubmit={handleRegistrationTokenCreate}
                >
                  <div className="space-y-2">
                    <Label htmlFor="token-label">Label</Label>
                    <Input
                      id="token-label"
                      value={tokenLabel}
                      onChange={(event) => setTokenLabel(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="token-ttl">TTL hours</Label>
                    <Input
                      id="token-ttl"
                      value={tokenTtlHours}
                      onChange={(event) => setTokenTtlHours(event.target.value)}
                      inputMode="numeric"
                    />
                  </div>

                  <Button className="w-full" disabled={isPending}>
                    Create token
                  </Button>
                </form>

                {createdToken ? (
                  <div className="rounded-xl border border-zinc-200 p-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                      New token
                    </p>
                    <p className="mt-3 break-all font-mono text-xs leading-6 text-zinc-950">
                      {createdToken.token}
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">
                      Expires {formatDate(createdToken.expiresAt)}
                    </p>
                  </div>
                ) : null}

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-medium text-zinc-950">
                    Recent registration tokens
                  </p>
                  {registrationTokens.length === 0 ? (
                    <EmptyState
                      title="No tokens minted"
                      description="Generated node tokens appear here."
                    />
                  ) : (
                    registrationTokens.map((token) => (
                      <div
                        key={token._id}
                        className="rounded-xl border border-zinc-200 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-zinc-950">
                            {token.label}
                          </span>
                          <Badge
                            variant={token.consumedAt ? "outline" : "default"}
                            className={cn(
                              token.consumedAt && "border-dashed",
                            )}
                          >
                            {token.consumedAt ? "consumed" : "ready"}
                          </Badge>
                        </div>
                        <p className="mt-2 font-mono text-xs text-zinc-500">
                          {token.tokenPreview}...
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">
                          Expires {formatDate(token.expiresAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="gap-2">
                <div className="flex items-center gap-2">
                  <SquareTerminal className="size-4 text-zinc-500" />
                  <CardTitle>Provision FRPS</CardTitle>
                </div>
                <CardDescription>
                  Create a managed server instance on an online edge node.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <form className="space-y-4" onSubmit={handleFrpsCreate}>
                  <div className="space-y-2">
                    <Label htmlFor="frps-name">FRPS name</Label>
                    <Input
                      id="frps-name"
                      value={frpsName}
                      onChange={(event) => setFrpsName(event.target.value)}
                      placeholder="production-edge-eu"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edge-node">Target edge node</Label>
                    <Select
                      id="edge-node"
                      value={selectedNodeId}
                      onChange={(event) => setSelectedNodeId(event.target.value)}
                    >
                      {onlineNodes.length === 0 ? (
                        <option value="">No online nodes</option>
                      ) : (
                        onlineNodes.map((node) => (
                          <option key={node._id} value={node._id}>
                            {node.label} ({node.region})
                          </option>
                        ))
                      )}
                    </Select>
                  </div>

                  <Button
                    className="w-full"
                    disabled={isPending || onlineNodes.length === 0}
                  >
                    Provision FRPS
                  </Button>
                </form>

                {createdConnection ? (
                  <div className="rounded-xl border border-zinc-200 p-4">
                    <div className="flex items-center gap-2">
                      <Shield className="size-4 text-zinc-500" />
                      <p className="text-sm font-medium text-zinc-950">
                        Connection details
                      </p>
                    </div>
                    <div className="mt-3 space-y-2 font-mono text-xs leading-6 text-zinc-700">
                      <p>
                        serverAddr = &quot;
                        {createdConnection.connection.serverAddr}&quot;
                      </p>
                      <p>
                        serverPort = {createdConnection.connection.bindPort}
                      </p>
                      <p>
                        auth.token = &quot;
                        {createdConnection.connection.authToken}&quot;
                      </p>
                      <p>
                        ports = &quot;
                        {createdConnection.connection.allowedPorts}&quot;
                      </p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
