"use client";

import {
  KeyRound,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Server,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestJson } from "@/app/lib/request";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/nodes", label: "Nodes", icon: Server },
  { href: "/frps", label: "FRPS", icon: Waypoints },
  { href: "/tokens", label: "Tokens", icon: KeyRound },
];

export function ConsoleShell({
  adminUsername,
  children,
}: {
  adminUsername: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    setError(null);
    startTransition(() => router.refresh());
  };

  const handleLogout = async () => {
    try {
      setError(null);
      await requestJson("/api/auth/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex shrink-0 border-b border-zinc-200 bg-zinc-50 lg:sticky lg:top-0 lg:h-screen lg:w-52 lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-4 py-3 lg:px-3 lg:py-4">
          <span className="text-[13px] font-semibold tracking-tight">
            Conduit
          </span>
        </div>

        <nav className="flex gap-0.5 overflow-x-auto px-2 pb-2 lg:flex-col lg:px-3 lg:pb-0">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                  active
                    ? "bg-foreground/[0.06] font-medium text-foreground"
                    : "text-zinc-500 hover:bg-foreground/[0.04] hover:text-foreground",
                )}
              >
                <Icon className="size-[15px]" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-zinc-200 px-3 py-3 lg:mt-auto lg:block">
          <div className="flex items-center justify-between">
            <span className="truncate text-[13px] text-zinc-500">
              {adminUsername}
            </span>
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={refresh}
                disabled={isPending}
                className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-foreground/[0.04] hover:text-foreground disabled:opacity-40"
              >
                <RefreshCw
                  className={cn("size-3.5", isPending && "animate-spin")}
                />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isPending}
                className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-foreground/[0.04] hover:text-foreground disabled:opacity-40"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
          </div>
          {error && (
            <p className="mt-1.5 text-[12px] text-red-600">{error}</p>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
