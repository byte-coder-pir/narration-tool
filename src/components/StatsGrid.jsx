import { GridIcon, LayersIcon, StarIcon, LinkIcon, ShieldCheckIcon, BoltIcon } from "./Icons";

const items = [
  { label: "Total Rows",   key: "totalRows",    helper: "records extracted",  Icon: GridIcon,       accent: "from-indigo-500 to-indigo-600",  iconCls: "text-indigo-500",  numCls: "text-indigo-600 dark:text-indigo-400" },
  { label: "Stages",       key: "stages",       helper: "workflow stages",     Icon: LayersIcon,     accent: "from-violet-500 to-violet-600",  iconCls: "text-violet-500",  numCls: "text-violet-600 dark:text-violet-400" },
  { label: "Mandatory",    key: "mandatory",    helper: "required fields",     Icon: StarIcon,       accent: "from-rose-500 to-rose-600",      iconCls: "text-rose-500",    numCls: "text-rose-600 dark:text-rose-400" },
  { label: "Dependencies", key: "dependencies", helper: "prerequisite tasks",  Icon: LinkIcon,       accent: "from-amber-500 to-amber-600",    iconCls: "text-amber-500",   numCls: "text-amber-600 dark:text-amber-400" },
  { label: "Validations",  key: "validations",  helper: "validation rules",    Icon: ShieldCheckIcon, accent: "from-emerald-500 to-emerald-600", iconCls: "text-emerald-500", numCls: "text-emerald-600 dark:text-emerald-400" },
  { label: "Automations",  key: "automations",  helper: "automated actions",   Icon: BoltIcon,       accent: "from-sky-500 to-sky-600",        iconCls: "text-sky-500",     numCls: "text-sky-600 dark:text-sky-400" },
];

export default function StatsGrid({ stats, darkMode: dm }) {
  const hasData = stats.totalRows > 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(({ label, key, helper, Icon, accent, iconCls, numCls }) => {
        const val = stats[key] ?? 0;
        return (
          <div
            key={key}
            className={`relative overflow-hidden rounded-xl border transition-shadow hover:shadow-md ${
              dm ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"
            }`}
          >
            {/* top accent bar */}
            <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accent} ${hasData ? "opacity-100" : "opacity-20"} transition-opacity duration-500`} />
            <div className="p-4 pt-5">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-medium tracking-wide ${dm ? "text-slate-500" : "text-slate-400"}`}>
                  {label}
                </span>
                <Icon className={`h-4 w-4 ${hasData ? iconCls : dm ? "text-slate-700" : "text-slate-300"} transition-colors duration-500`} />
              </div>
              <p className={`text-2xl font-bold tabular-nums leading-none transition-colors duration-500 ${
                hasData ? numCls : dm ? "text-slate-700" : "text-slate-300"
              }`}>
                {val}
              </p>
              <p className={`text-xs mt-1.5 ${dm ? "text-slate-600" : "text-slate-400"}`}>{helper}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
