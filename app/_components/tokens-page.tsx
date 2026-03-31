"use client";

import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RegistrationTokenSummary } from "@/app/lib/contracts";
import { requestJson } from "@/app/lib/request";
import {
  EmptyState,
  formatDate,
  PageHeader,
  StatusBadge,
} from "@/app/_components/console-ui";

type RegistrationTokenResponse = {
  ok: true;
  registrationToken: {
    label: string;
    token: string;
    expiresAt: number;
  };
};

const getTokenStatus = (token: RegistrationTokenSummary) => {
  if (token.consumedAt) return "used";
  if (token.expiresAt <= Date.now()) return "expired";
  return "active";
};

export function TokensPage({
  registrationTokens,
}: {
  registrationTokens: RegistrationTokenSummary[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [tokenLabel, setTokenLabel] = useState("edge-node");
  const [tokenTtlHours, setTokenTtlHours] = useState("24");
  const [createdToken, setCreatedToken] = useState<{
    label: string;
    token: string;
    expiresAt: number;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<RegistrationTokenSummary | null>(null);

  const refresh = () => router.refresh();

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setError(null);
      setPendingAction("create");
      const payload = await requestJson<RegistrationTokenResponse>(
        "/api/nodes/registration-tokens",
        {
          method: "POST",
          body: JSON.stringify({
            label: tokenLabel,
            ttlHours: Number(tokenTtlHours),
          }),
        },
      );
      setCreateOpen(false);
      setCreatedToken(payload.registrationToken);
      refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create token.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setError(null);
      setPendingAction(deleteTarget._id);
      await requestJson(
        `/api/nodes/registration-tokens/${deleteTarget._id}`,
        { method: "DELETE" },
      );
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete token.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tokens"
        description="Node onboarding tokens and their status."
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">New token</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create registration token</DialogTitle>
                <DialogDescription>
                  Single-use tokens that expire based on the selected TTL.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="token-label">Label</Label>
                  <Input
                    id="token-label"
                    value={tokenLabel}
                    onChange={(e) => setTokenLabel(e.target.value)}
                    minLength={2}
                    placeholder="edge-node"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="token-ttl">Expires in</Label>
                  <Select
                    id="token-ttl"
                    value={tokenTtlHours}
                    onChange={(e) => setTokenTtlHours(e.target.value)}
                  >
                    <option value="6">6 hours</option>
                    <option value="24">24 hours</option>
                    <option value="72">72 hours</option>
                    <option value="168">7 days</option>
                  </Select>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="ghost">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={pendingAction === "create"}
                  >
                    {pendingAction === "create" ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      {registrationTokens.length === 0 ? (
        <EmptyState
          title="No registration tokens"
          description="Create a token to enroll a new edge node."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Consumed</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrationTokens.map((token) => (
              <TableRow key={token._id}>
                <TableCell className="font-medium">{token.label}</TableCell>
                <TableCell className="font-mono text-[12px] text-zinc-400">
                  {token.tokenPreview}
                </TableCell>
                <TableCell>
                  <StatusBadge status={getTokenStatus(token)} />
                </TableCell>
                <TableCell className="text-zinc-500">
                  {formatDate(token.expiresAt)}
                </TableCell>
                <TableCell className="text-zinc-500">
                  {formatDate(token.createdAt)}
                </TableCell>
                <TableCell className="text-zinc-500">
                  {formatDate(token.consumedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget(token)}
                    disabled={pendingAction !== null}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Created token dialog */}
      <Dialog
        open={createdToken !== null}
        onOpenChange={(open) => {
          if (!open) setCreatedToken(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token created</DialogTitle>
            <DialogDescription>
              This token is only shown once. Copy it before closing.
            </DialogDescription>
          </DialogHeader>
          {createdToken && (
            <dl className="mt-4 divide-y divide-zinc-100 text-sm">
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-zinc-500">Label</dt>
                <dd className="font-medium">{createdToken.label}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-zinc-500">Token</dt>
                <dd className="break-all font-mono">
                  {createdToken.token}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-zinc-500">Expires</dt>
                <dd>{formatDate(createdToken.expiresAt)}</dd>
              </div>
            </dl>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button>Done</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete token</DialogTitle>
            <DialogDescription>
              Remove this token from circulation.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm">
              <p className="font-medium">{deleteTarget.label}</p>
              <p className="mt-0.5 font-mono text-[12px] text-zinc-400">
                {deleteTarget.tokenPreview}
              </p>
              <p className="mt-1 text-[13px] text-zinc-500">
                {getTokenStatus(deleteTarget)}
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
              onClick={handleDelete}
              disabled={!deleteTarget || pendingAction !== null}
            >
              Delete token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
