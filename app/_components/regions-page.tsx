"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type {
  EdgeNodeSummary,
  ProvisioningRegionSummary,
} from "@/app/lib/contracts";
import { requestJson } from "@/app/lib/request";
import {
  EmptyState,
  PageHeader,
  StatusBadge,
  formatDate,
} from "@/app/_components/console-ui";

export function RegionsPage({
  nodes,
  provisioningRegions,
}: {
  nodes: EdgeNodeSummary[];
  provisioningRegions: ProvisioningRegionSummary[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [renameTarget, setRenameTarget] = useState<ProvisioningRegionSummary | null>(
    null,
  );
  const [renameName, setRenameName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProvisioningRegionSummary | null>(
    null,
  );
  const [assignSelections, setAssignSelections] = useState<Record<string, string>>(
    {},
  );

  const sortedNodes = useMemo(
    () => [...nodes].sort((left, right) => left.label.localeCompare(right.label)),
    [nodes],
  );

  const refresh = () => router.refresh();

  const setAssignSelection = (regionId: string, nodeId: string) => {
    setAssignSelections((current) => ({
      ...current,
      [regionId]: nodeId,
    }));
  };

  const handleCreateRegion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setError(null);
      setPendingAction("create");
      await requestJson("/api/provisioning-regions", {
        method: "POST",
        body: JSON.stringify({ name: createName }),
      });
      setCreateOpen(false);
      setCreateName("");
      refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create provisioning region.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleRenameRegion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renameTarget) {
      return;
    }

    try {
      setError(null);
      setPendingAction(`rename:${renameTarget._id}`);
      await requestJson(`/api/provisioning-regions/${renameTarget._id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: renameName }),
      });
      setRenameTarget(null);
      setRenameName("");
      refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to rename provisioning region.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleDeleteRegion = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setError(null);
      setPendingAction(`delete:${deleteTarget._id}`);
      await requestJson(`/api/provisioning-regions/${deleteTarget._id}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete provisioning region.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleAssignNode = async (provisioningRegionId: string) => {
    const nodeId =
      assignSelections[provisioningRegionId] ??
      sortedNodes.find((node) => node.provisioningRegionId !== provisioningRegionId)
        ?._id;

    if (!nodeId) {
      return;
    }

    try {
      setError(null);
      setPendingAction(`assign:${provisioningRegionId}`);
      await requestJson(`/api/provisioning-regions/${provisioningRegionId}/nodes`, {
        method: "POST",
        body: JSON.stringify({ nodeId }),
      });
      refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to assign the node to this provisioning region.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleUnassignNode = async (
    provisioningRegionId: string,
    nodeId: string,
  ) => {
    try {
      setError(null);
      setPendingAction(`unassign:${provisioningRegionId}:${nodeId}`);
      await requestJson(
        `/api/provisioning-regions/${provisioningRegionId}/nodes/${nodeId}`,
        {
          method: "DELETE",
        },
      );
      refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to unassign the node from this provisioning region.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regions"
        description="Custom provisioning regions and their node membership."
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">New region</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create provisioning region</DialogTitle>
                <DialogDescription>
                  Create a custom placement group for FRPS provisioning.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateRegion} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="region-name">Name</Label>
                  <Input
                    id="region-name"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="europe-west"
                    minLength={2}
                    required
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="ghost">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={pendingAction === "create"}>
                    {pendingAction === "create" ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      {provisioningRegions.length === 0 ? (
        <EmptyState
          title="No provisioning regions"
          description="Create a provisioning region, then assign nodes into it before creating FRPS instances."
        />
      ) : (
        <div className="space-y-6">
          {provisioningRegions.map((region) => {
            const assignedNodes = sortedNodes.filter(
              (node) => node.provisioningRegionId === region._id,
            );
            const selectableNodes = sortedNodes.filter(
              (node) => node.provisioningRegionId !== region._id,
            );
            const selectedNodeId =
              assignSelections[region._id] ?? selectableNodes[0]?._id ?? "";

            return (
              <section
                key={region._id}
                className="rounded-xl border border-zinc-200 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-medium">{region.name}</h2>
                      {region.activeReservationCount > 0 && (
                        <span className="text-[12px] text-zinc-400">
                          {region.activeReservationCount} pending placement
                          {region.activeReservationCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-zinc-500">
                      {region.onlineNodeCount}/{region.assignedNodeCount} nodes online ·{" "}
                      {region.frpsCount} FRPS · updated {formatDate(region.updatedAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRenameTarget(region);
                        setRenameName(region.name);
                      }}
                      disabled={pendingAction !== null}
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(region)}
                      disabled={pendingAction !== null}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4 lg:flex-row lg:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor={`assign-node-${region._id}`}>Assign node</Label>
                    <Select
                      id={`assign-node-${region._id}`}
                      value={selectedNodeId}
                      onChange={(event) =>
                        setAssignSelection(region._id, event.target.value)
                      }
                      disabled={selectableNodes.length === 0}
                    >
                      {selectableNodes.length === 0 ? (
                        <option value="">No assignable nodes</option>
                      ) : (
                        selectableNodes.map((node) => (
                          <option key={node._id} value={node._id}>
                            {node.label} · {node.region} ·{" "}
                            {node.provisioningRegionName ?? "unassigned"}
                          </option>
                        ))
                      )}
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleAssignNode(region._id)}
                    disabled={selectableNodes.length === 0 || pendingAction !== null}
                  >
                    Assign node
                  </Button>
                </div>

                {assignedNodes.length === 0 ? (
                  <p className="mt-4 text-[13px] text-zinc-500">
                    No nodes assigned yet.
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-zinc-100">
                    {assignedNodes.map((node) => (
                      <div
                        key={node._id}
                        className="flex flex-col gap-3 py-3 first:pt-0 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{node.label}</p>
                            <StatusBadge status={node.status} />
                          </div>
                          <p className="text-[13px] text-zinc-500">
                            {node.hostname} · {node.vultrInstanceId}
                          </p>
                          <p className="text-[12px] text-zinc-400">
                            Vultr region {node.region} · {node.frpsCount} FRPS · last
                            heartbeat {formatDate(node.lastHeartbeatAt)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnassignNode(region._id, node._id)}
                          disabled={pendingAction !== null}
                        >
                          Unassign
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null);
            setRenameName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename provisioning region</DialogTitle>
            <DialogDescription>
              Update the display name for this provisioning region.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameRegion} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rename-region-name">Name</Label>
              <Input
                id="rename-region-name"
                value={renameName}
                onChange={(event) => setRenameName(event.target.value)}
                minLength={2}
                required
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={!renameTarget || pendingAction !== null}
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete provisioning region</DialogTitle>
            <DialogDescription>
              This only works when the region has no assigned nodes and no active
              FRPS instances.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm">
              <p className="font-medium">{deleteTarget.name}</p>
              <p className="mt-0.5 text-zinc-500">
                {deleteTarget.assignedNodeCount} assigned nodes · {deleteTarget.frpsCount}{" "}
                FRPS
              </p>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={!deleteTarget || pendingAction !== null}
              onClick={handleDeleteRegion}
            >
              Delete region
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
