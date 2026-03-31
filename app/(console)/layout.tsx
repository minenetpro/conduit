import { redirect } from "next/navigation";
import { ConsoleShell } from "@/app/_components/console-shell";
import { verifySession } from "@/app/lib/auth";
import { env } from "@/app/lib/env";

export default async function ConsoleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await verifySession();

  if (!session) {
    redirect("/");
  }

  return (
    <ConsoleShell adminUsername={env.adminUsername()}>{children}</ConsoleShell>
  );
}
