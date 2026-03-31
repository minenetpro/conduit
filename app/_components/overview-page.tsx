import type {
  EdgeNodeSummary,
  FrpsSummary,
  RegistrationTokenSummary,
} from "@/app/lib/contracts";
import {
  EmptyState,
  formatDate,
  PageHeader,
  Stat,
  StatusBadge,
} from "@/app/_components/console-ui";

export function OverviewPage({
  nodes,
  frps,
  registrationTokens,
  now,
}: {
  nodes: EdgeNodeSummary[];
  frps: FrpsSummary[];
  registrationTokens: RegistrationTokenSummary[];
  now: number;
}) {
  const onlineNodes = nodes.filter((n) => n.status === "online");
  const runningFrps = frps.filter((i) => i.runtimeState === "running");
  const activeTokens = registrationTokens.filter(
    (t) => !t.consumedAt && t.expiresAt > now,
  );

  const attentionItems = [
    ...nodes
      .filter((n) => n.status === "offline")
      .map((n) => ({
        label: n.label,
        detail: `${n.region} · last seen ${formatDate(n.lastHeartbeatAt)}`,
        status: "offline",
      })),
    ...frps
      .filter(
        (i) => i.runtimeState === "error" || i.runtimeState === "deleting",
      )
      .map((i) => ({
        label: i.name,
        detail:
          i.lastError ??
          i.recentEvents[0]?.message ??
          `${i.edgeNodeLabel} · ${formatDate(i.updatedAt)}`,
        status: i.runtimeState,
      })),
  ].slice(0, 8);

  const recentEvents = frps
    .flatMap((i) =>
      i.recentEvents.map((e) => ({ ...e, instanceName: i.name })),
    )
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <PageHeader title="Overview" />

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Stat
          label="Nodes"
          value={nodes.length}
          detail={`${onlineNodes.length} online`}
        />
        <Stat
          label="FRPS running"
          value={runningFrps.length}
          detail={`${frps.length} total`}
        />
        <Stat label="Active tokens" value={activeTokens.length} />
        <Stat label="Attention" value={attentionItems.length} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-[12px] font-medium uppercase tracking-wider text-zinc-400">
            Needs attention
          </h2>
          {attentionItems.length === 0 ? (
            <p className="mt-3 text-[13px] text-zinc-400">All clear.</p>
          ) : (
            <div className="mt-3 divide-y divide-zinc-100">
              {attentionItems.map((item) => (
                <div
                  key={`${item.status}:${item.label}`}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{item.label}</p>
                    <p className="text-[13px] text-zinc-500">{item.detail}</p>
                  </div>
                  <StatusBadge
                    status={item.status}
                    className="shrink-0 text-zinc-500"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-[12px] font-medium uppercase tracking-wider text-zinc-400">
            Recent activity
          </h2>
          {recentEvents.length === 0 ? (
            <p className="mt-3 text-[13px] text-zinc-400">No recent events.</p>
          ) : (
            <div className="mt-3 divide-y divide-zinc-100">
              {recentEvents.map((event) => (
                <div
                  key={event._id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">
                      {event.instanceName}
                    </p>
                    <p className="text-[13px] text-zinc-500">
                      {event.message}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={event.status} className="text-zinc-500" />
                    <p className="mt-0.5 text-[12px] text-zinc-400">
                      {formatDate(event.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
