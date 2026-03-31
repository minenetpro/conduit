import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const formatDate = (timestamp: number | null) => {
  if (!timestamp) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "online":
    case "running":
    case "succeeded":
    case "active":
      return "bg-emerald-500";
    case "offline":
    case "error":
    case "failed":
      return "bg-red-500";
    case "pending":
    case "leased":
      return "bg-amber-500";
    default:
      return "bg-zinc-300";
  }
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-[13px]", className)}
    >
      <span
        className={cn("size-1.5 rounded-full", getStatusColor(status))}
        aria-hidden
      />
      {status}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-[13px] text-zinc-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  value,
  label,
  detail,
}: {
  value: string | number;
  label: string;
  detail?: string;
}) {
  return (
    <div>
      <p className="text-[13px] text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {detail && <p className="mt-0.5 text-[13px] text-zinc-400">{detail}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-12 text-center">
      <p className="text-[13px] font-medium">{title}</p>
      <p className="mt-1 text-[13px] text-zinc-500">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ConfigErrorState({ message }: { message: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          Connection error
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">{message}</p>
      </div>

      <pre className="overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 p-4 text-[13px] leading-relaxed text-zinc-600">
        <code>{`CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...
CONVEX_DEPLOY_KEY=prod:your-deployment|your-secret`}</code>
      </pre>

      <p className="text-[13px] text-zinc-500">
        Use the deployment key from the Convex dashboard. The CLI token in{" "}
        <code className="rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 text-[12px]">
          ~/.convex/config.json
        </code>{" "}
        is not valid here.
      </p>
    </div>
  );
}
