import * as React from "react";
import { cn } from "@/lib/utils";

function Alert({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700",
        className,
      )}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"h5">) {
  return (
    <h5 className={cn("mb-1 font-medium tracking-tight text-zinc-950", className)} {...props} />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("text-sm [&_p]:leading-6", className)} {...props} />;
}

export { Alert, AlertDescription, AlertTitle };
