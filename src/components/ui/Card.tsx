import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-forest-100/40 bg-white/70 p-4 backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
