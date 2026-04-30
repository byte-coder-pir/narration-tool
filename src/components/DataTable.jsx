import { useState, useMemo } from "react";
import { DownloadIcon, SearchIcon, TrashIcon, ChevronIcon, CloseIcon } from "./Icons";

const PAGE_SIZE = 50;

const STAGE_COLORS = [
  "bg-indigo-500", "bg-violet-500", "bg-sky-500", "bg-emerald-500",
  "bg-amber-500",  "bg-rose-500",   "bg-teal-500", "bg-orange-500",
];

const BADGE_COLS = new Set([
  "Field Type",
  "Activity / Parameter Type",
  "Configuration Status",
  "Configuration Feasibility",
  "IS SELF VERIFICATION PRESENT?",
  "IS PEER VERIFICATION PRESENT?",
]);

const LONG_COLS = new Set([
  "Activity Description in detail",
  "Options / Values",
  "Dependencies",
  "Executor Lock",
  "Branching",
  "Filters",
  "Validations",
  "Automation Details",
  "Configuration Feasibility Notes",
  "Tester Comments",
  "Tester Comments (B)",
]);

function badgeCls(col, val) {
  const v = (val || "").toLowerCase();
  if (col === "Field Type") {
    if (v === "mandatory") return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400";
    if (v === "optional")  return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  }
  if (col === "Configuration Feasibility") {
    if (v === "configurable") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
    if (v === "not configurable") return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";
  }
  if (col === "Configuration Status") {
    if (v === "configured")     return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
    if (v === "not configured") return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
    if (v === "in progress")    return "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400";
  }
  if (col === "IS SELF VERIFICATION PRESENT?" || col === "IS PEER VERIFICATION PRESENT?") {
    if (v === "enabled")  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
    if (v === "disabled") return "bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400";
  }
  if (v === "single_select" || v === "multi_select") return "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400";
  if (v === "single_line" || v === "multi_line")     return "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400";
  return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400";
}

function ExpandableCell({ value, dm }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = value && value.length > 120;
  return (
    <div>
      <p className={`whitespace-pre-wrap leading-5 text-xs ${!expanded && isLong ? "line-clamp-3" : ""} ${dm ? "text-slate-300" : "text-slate-700"}`}>
        {value}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((p) => !p)}
          className={`mt-1 text-xs font-medium ${dm ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-500"}`}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export default function DataTable({ rows, stats, onReset, onDownloadCSV, onDownloadXLSX, darkMode: dm }) {
  const [search, setSearch]           = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [page, setPage]               = useState(1);

  const columns    = rows.length ? Object.keys(rows[0]) : [];
  const stageNames = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => r["Stage Name"]).filter(Boolean)))], [rows]);

  const stageColorMap = useMemo(() => {
    const map = {};
    stageNames.filter((s) => s !== "All").forEach((s, i) => {
      map[s] = STAGE_COLORS[i % STAGE_COLORS.length];
    });
    return map;
  }, [stageNames]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((row) => {
      const matchStage  = stageFilter === "All" || row["Stage Name"] === stageFilter;
      const matchSearch = !q ||
        Object.values(row).some((v) => (v || "").toString().toLowerCase().includes(q));
      return matchStage && matchSearch;
    });
  }, [rows, search, stageFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const go = (n) => setPage(Math.max(1, Math.min(n, totalPages)));

  const card = dm ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white";

  return (
    <section className="space-y-4">

      {/* Toolbar */}
      <div className={`rounded-2xl border p-3 ${card}`}>
        <div className="flex flex-wrap items-center gap-2">

          {/* Search */}
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm flex-1 min-w-[160px] max-w-xs ${
            dm ? "border-slate-700 bg-slate-800/80" : "border-slate-200 bg-slate-50"
          }`}>
            <SearchIcon className={`h-3.5 w-3.5 shrink-0 ${dm ? "text-slate-500" : "text-slate-400"}`} />
            <input
              type="text"
              placeholder="Search all columns…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className={`bg-transparent outline-none text-xs w-full placeholder:opacity-50 ${dm ? "text-slate-200" : "text-slate-800"}`}
            />
            {search && (
              <button onClick={() => { setSearch(""); setPage(1); }}>
                <CloseIcon className={`h-3 w-3 ${dm ? "text-slate-500" : "text-slate-400"}`} />
              </button>
            )}
          </div>

          {/* Stage filter */}
          <select
            value={stageFilter}
            onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
            className={`rounded-lg border px-3 py-2 text-xs outline-none cursor-pointer ${
              dm ? "border-slate-700 bg-slate-800/80 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {stageNames.map((s) => <option key={s} value={s}>{s === "All" ? "All stages" : s}</option>)}
          </select>

          {/* count */}
          <span className={`text-xs tabular-nums ${dm ? "text-slate-500" : "text-slate-400"}`}>
            <strong className={dm ? "text-slate-300" : "text-slate-700"}>{filtered.length}</strong>
            {" / "}{stats.totalRows} rows
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onDownloadCSV}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                dm ? "border-slate-700 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400" : "border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              CSV
            </button>
            <button
              onClick={onDownloadXLSX}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 shadow-sm shadow-indigo-600/30"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              XLSX
            </button>
            <div className={`w-px h-5 ${dm ? "bg-slate-800" : "bg-slate-200"}`} />
            <button
              onClick={onReset}
              title="Clear data"
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
                dm ? "border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/40" : "border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200"
              }`}
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 380px)", minHeight: "400px" }}>
          <table className="min-w-full text-sm border-collapse">
            <thead className={`sticky top-0 z-20 ${dm ? "bg-slate-900" : "bg-slate-50"}`}>
              <tr>
                {columns.map((col, ci) => (
                  <th
                    key={col}
                    className={`border-b px-3 py-3 text-left text-xs font-semibold whitespace-nowrap ${
                      ci === 0 ? `sticky left-0 z-30 ${dm ? "bg-slate-900" : "bg-slate-50"}` : ""
                    } ${dm ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"}`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className={`px-4 py-16 text-center text-sm ${dm ? "text-slate-600" : "text-slate-400"}`}>
                    No rows match your filters.
                  </td>
                </tr>
              ) : pageRows.map((row, ri) => {
                const stageName = row["Stage Name"] || "";
                const stageColor = stageColorMap[stageName] || STAGE_COLORS[0];
                const rowBg = ri % 2 === 1
                  ? dm ? "bg-slate-800/25" : "bg-slate-50/60"
                  : dm ? "bg-transparent" : "bg-white";

                return (
                  <tr
                    key={`${stageFilter}-${safePage}-${ri}`}
                    className={`group transition-colors ${rowBg} ${dm ? "hover:bg-indigo-500/5" : "hover:bg-indigo-50/40"}`}
                  >
                    {columns.map((col, ci) => {
                      const val = row[col] ?? "";
                      const isBadge = BADGE_COLS.has(col) && val && val !== "N/A" && !val.includes("\n");
                      const isLongCol = LONG_COLS.has(col);
                      const isFirst = ci === 0;

                      const stickyBg = isFirst
                        ? ri % 2 === 1
                          ? dm ? "bg-slate-800/25 group-hover:bg-indigo-500/5" : "bg-slate-50/60 group-hover:bg-indigo-50/40"
                          : dm ? "bg-[#0d1117] group-hover:bg-indigo-500/5" : "bg-white group-hover:bg-indigo-50/40"
                        : "";

                      return (
                        <td
                          key={col}
                          className={`px-3 py-2.5 align-top border-b ${
                            isFirst ? `sticky left-0 z-10 ${stickyBg}` : ""
                          } ${dm ? "border-slate-800/60" : "border-slate-100"}`}
                          style={{ maxWidth: isLongCol ? 220 : undefined }}
                        >
                          {isFirst ? (
                            <div className="flex items-center gap-2">
                              <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${stageColor}`} />
                              <span className={`text-xs font-medium leading-5 ${dm ? "text-slate-200" : "text-slate-800"}`}>
                                {val || <span className={`${dm ? "text-slate-700" : "text-slate-300"}`}>—</span>}
                              </span>
                            </div>
                          ) : isBadge ? (
                            <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${badgeCls(col, val)}`}>
                              {val}
                            </span>
                          ) : isLongCol && val && val !== "N/A" ? (
                            <ExpandableCell value={val} dm={dm} />
                          ) : (
                            <span className={`text-xs leading-5 whitespace-pre-wrap ${
                              val && val !== "N/A"
                                ? dm ? "text-slate-300" : "text-slate-700"
                                : dm ? "text-slate-700" : "text-slate-300"
                            }`}>
                              {val || "—"}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 px-1">
          <span className={`text-xs ${dm ? "text-slate-500" : "text-slate-400"}`}>
            Page <strong className={dm ? "text-slate-300" : "text-slate-700"}>{safePage}</strong> of {totalPages}
            <span className="ml-2 opacity-60">({filtered.length} rows)</span>
          </span>
          <div className="flex items-center gap-1">
            <PagBtn onClick={() => go(1)} disabled={safePage === 1} dm={dm} title="First">«</PagBtn>
            <PagBtn onClick={() => go(safePage - 1)} disabled={safePage === 1} dm={dm}>
              <ChevronIcon className="h-3.5 w-3.5 rotate-180" />
            </PagBtn>
            {paginationRange(safePage, totalPages).map((item, idx) =>
              item === "…" ? (
                <span key={`e${idx}`} className={`px-1 text-xs ${dm ? "text-slate-600" : "text-slate-400"}`}>…</span>
              ) : (
                <PagBtn key={item} onClick={() => go(item)} active={item === safePage} dm={dm}>
                  {item}
                </PagBtn>
              )
            )}
            <PagBtn onClick={() => go(safePage + 1)} disabled={safePage === totalPages} dm={dm}>
              <ChevronIcon className="h-3.5 w-3.5" />
            </PagBtn>
            <PagBtn onClick={() => go(totalPages)} disabled={safePage === totalPages} dm={dm} title="Last">»</PagBtn>
          </div>
        </div>
      )}
    </section>
  );
}

function PagBtn({ onClick, disabled, active, dm, children, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-7 min-w-[28px] items-center justify-center rounded-lg px-1 text-xs font-medium transition-colors disabled:opacity-25 ${
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : dm
          ? "border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          : "border border-slate-200 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function paginationRange(current, total) {
  return Array.from({ length: total }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === total || Math.abs(n - current) <= 1)
    .reduce((acc, n, idx, arr) => {
      if (idx > 0 && n - arr[idx - 1] > 1) acc.push("…");
      acc.push(n);
      return acc;
    }, []);
}
