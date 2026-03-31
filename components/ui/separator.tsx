import * as React from "react";
import { cn } from "@/lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}) {
  return (
    <div
      aria-hidden={decorative}
      className={cn(
        "shrink-0 border-zinc-200",
        orientation === "horizontal"
          ? "w-full border-t"
          : "h-full border-l",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
