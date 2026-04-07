import { cn } from "../../utils/cn";

export function Table({ className, ...props }) {
  return <table className={cn("w-full text-left text-sm", className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return <th className={cn("px-4 py-3 font-medium text-slate-500", className)} {...props} />;
}

export function TableCell({ className, ...props }) {
  return <td className={cn("px-4 py-3 text-slate-700", className)} {...props} />;
}
