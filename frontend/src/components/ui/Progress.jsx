export function Progress({ value = 0 }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}
