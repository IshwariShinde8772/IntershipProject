import { cn } from "../../utils/cn";

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
