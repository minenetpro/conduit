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
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nodes"
        description="Registered edge agents and runtime capacity."
        action={
          <Link
            href="/tokens"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Manage tokens
          </Link>
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
            {nodes.map((node) => (
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
                    agent {node.agentVersion}
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
      )}
    </div>
  );
}
