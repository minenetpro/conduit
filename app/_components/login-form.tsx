"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestJson } from "@/app/lib/request";

export function LoginForm({ username }: { username: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adminUsername, setAdminUsername] = useState(username);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await requestJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: adminUsername, password }),
      });

      startTransition(() => {
        router.replace("/overview");
        router.refresh();
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Login failed.",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={adminUsername}
          onChange={(event) => setAdminUsername(event.target.value)}
          autoComplete="username"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
      </div>

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      <Button className="w-full" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
