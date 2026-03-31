import { redirect } from "next/navigation";
import { LoginForm } from "@/app/_components/login-form";
import { verifySession } from "@/app/lib/auth";
import { env } from "@/app/lib/env";

export default async function IndexPage() {
  const session = await verifySession();

  if (session) {
    redirect("/overview");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-[13px] font-medium text-zinc-500">Conduit</p>
          <h1 className="mt-2 text-lg font-semibold tracking-tight">
            Sign in
          </h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            Operator access to the control plane.
          </p>
        </div>

        <LoginForm username={env.adminUsername()} />
      </div>
    </div>
  );
}
