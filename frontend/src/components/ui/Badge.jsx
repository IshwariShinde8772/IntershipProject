import { cn } from "../../utils/cn";

const variants = {
  slate: "bg-slate-100 text-slate-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-700",
  yellow: "bg-amber-100 text-amber-700",
  orange: "bg-orange-100 text-orange-700"
};

export function Badge({ className, variant = "slate", ...props }) {
  return (
    <span
      className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", variants[variant], className)}
      {...props}
    />
  );
}
