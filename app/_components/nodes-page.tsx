import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EdgeNodeSummary } from "@/app/lib/contracts";
import {
  EmptyState,
  formatDate,
  PageHeader,
  StatusBadge,
} from "@/app/_components/console-ui";

export function NodesPage({ nodes }: { nodes: EdgeNodeSummary[] }) {
  const groups = [
    ...Array.from(
      new Set(
        nodes
          .map((node) => node.provisioningRegionName)
          .filter((name): name is string => Boolean(name)),
      ),
    )
      .sort((left, right) => left.localeCompare(right))
      .map((name) => ({
        key: name,
        label: name,
        nodes: nodes.filter((node) => node.provisioningRegionName === name),
      })),
    {
      key: "unassigned",
      label: "Unassigned",
      nodes: nodes.filter((node) => !node.provisioningRegionName),
    },
  ].filter((group) => group.nodes.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nodes"
        description="Registered edge agents grouped by provisioning region."
        action={
          <div className="flex gap-2">
            <Link
              href="/regions"
              className={buttonVariants({ size: "sm" })}
            >
              Manage regions
            </Link>
            <Link
              href="/tokens"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Manage tokens
            </Link>
          </div>
        }
      />

      {nodes.length === 0 ? (
        <EmptyState
          title="No nodes registered"
          description="Create a registration token to onboard the first edge host."
          action={
            <Link
              href="/tokens"
              className={buttonVariants({ size: "sm" })}
            >
              Open tokens
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <div>
                <h2 className="text-sm font-medium">{group.label}</h2>
                <p className="text-[13px] text-zinc-500">
                  {group.nodes.length} node{group.nodes.length === 1 ? "" : "s"}
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Node</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vultr region</TableHead>
                    <TableHead>Runtime</TableHead>
                    <TableHead>Last heartbeat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.nodes.map((node) => (
                    <TableRow key={node._id}>
                      <TableCell className="min-w-56">
                        <p className="font-medium">{node.label}</p>
                        <p className="font-mono text-[12px] text-zinc-400">
                          {node.hostname} · {node.vultrInstanceId}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={node.status} />
                      </TableCell>
                      <TableCell>{node.region}</TableCell>
                      <TableCell>
                        <p>{node.runningContainers} containers</p>
                        <p className="text-[12px] text-zinc-400">
                          agent {node.agentVersion} · {node.frpsCount} FRPS
                          {node.dockerVersion
                            ? ` · docker ${node.dockerVersion}`
                            : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {formatDate(node.lastHeartbeatAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
