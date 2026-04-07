import { cn } from "../../utils/cn";

export function Label({ className, ...props }) {
  return <label className={cn("mb-1 block text-sm font-medium text-slate-700", className)} {...props} />;
}
