import { CloseIcon } from "./Icons";

const config = {
  error:   { bar: "bg-red-500",     bg: "bg-red-50 border-red-200 text-red-900 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-200",   title: "Error" },
  success: { bar: "bg-emerald-500", bg: "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-200", title: "Done" },
  info:    { bar: "bg-blue-500",    bg: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-200",   title: "Working…" },
};

export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const { bar, bg, title } = config[toast.type] || config.info;
  return (
    <div className={`fixed top-5 right-5 z-50 flex max-w-xs overflow-hidden rounded-xl border shadow-2xl ${bg}`}>
      <div className={`w-1 shrink-0 ${bar}`} />
      <div className="flex flex-1 items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{title}</p>
          <p className="text-sm leading-5 mt-0.5">{toast.message}</p>
        </div>
        <button onClick={onDismiss} className="mt-0.5 rounded p-0.5 opacity-50 hover:opacity-100 transition-opacity">
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
