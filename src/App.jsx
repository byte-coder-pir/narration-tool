import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import ExcelJS from "exceljs";

import { processWorkflow } from "./utils/processWorkflow.js";
import { findUnresolvedIds, summariseIssues } from "./utils/validateRows.js";
import Toast from "./components/Toast.jsx";
import StatsGrid from "./components/StatsGrid.jsx";
import DropZone from "./components/DropZone.jsx";
import DataTable from "./components/DataTable.jsx";
import { SunIcon, MoonIcon, WorkflowIcon } from "./components/Icons.jsx";

export default function App() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [toast, setToast]       = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const stats = useMemo(() => {
    const stageSet = new Set();
    let mandatory = 0, automations = 0, dependencies = 0, validations = 0;
    rows.forEach((row) => {
      if (row["Stage Name"]) stageSet.add(row["Stage Name"]);
      if ((row["Field Type"] || "").toLowerCase() === "mandatory") mandatory++;
      if (row["Automation Details"]) automations++;
      if (row["Dependencies"] && row["Dependencies"] !== "N/A") dependencies++;
      if (row["Validations"]   && row["Validations"]   !== "N/A") validations++;
    });
    return { totalRows: rows.length, stages: stageSet.size, mandatory, automations, dependencies, validations };
  }, [rows]);

  const handleFile = async (file) => {
    setLoading(true);
    setToast({ type: "info", message: `Processing ${file.name}…` });
    const csvRows = [];
    try {
      if (file.name.toLowerCase().endsWith(".zip")) {
        const zip = await JSZip.loadAsync(file);
        const jsonFiles = Object.keys(zip.files).filter((f) => /\.json$/i.test(f));
        if (!jsonFiles.length) throw new Error("No JSON files found inside the ZIP archive.");
        for (const filename of jsonFiles) {
          const content = await zip.files[filename].async("string");
          let parsed;
          try { parsed = JSON.parse(content); }
          catch { throw new Error(`"${filename}" contains invalid JSON.`); }
          (Array.isArray(parsed) ? parsed : [parsed]).forEach((wf) => processWorkflow(wf, csvRows));
        }
      } else {
        let parsed;
        try { parsed = JSON.parse(await file.text()); }
        catch { throw new Error("File is not valid JSON."); }
        (Array.isArray(parsed) ? parsed : [parsed]).forEach((wf) => processWorkflow(wf, csvRows));
      }
      if (!csvRows.length) throw new Error("No workflow data could be extracted from this file.");
      const sorted = [
        ...csvRows.filter((r) => r["Stage Name"] === "Create Job Form"),
        ...csvRows.filter((r) => r["Stage Name"] !== "Create Job Form"),
      ];
      setRows(sorted);
      setToast({ type: "success", message: `${sorted.length} rows extracted from ${file.name}.` });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: err.message || "Unexpected error. Check the console." });
    } finally {
      setLoading(false);
    }
  };

  // Guard rail: scan rows for unresolved IDs before any export.
  // Returns true when it is safe to proceed, false when issues were found
  // (a warning toast is shown but the caller still decides whether to abort).
  const runIdGuard = () => {
    const issues = findUnresolvedIds(rows);
    const summary = summariseIssues(issues);
    if (summary) {
      console.warn("[ID Guard] Unresolved IDs detected before export:", issues);
      setToast({
        type: "error",
        message: `Export blocked — ${summary}. Check the console for details.`,
      });
      return false;
    }
    return true;
  };

  const downloadCSV = () => {
    if (!runIdGuard()) return;
    const csv = Papa.unparse(rows, { delimiter: ";" });
    saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "workflow_extracted.csv");
  };
  const downloadXLSX = async () => {
    if (!rows.length) return;
    if (!runIdGuard()) return;

    const COLUMNS = [
      "Stage Name",
      "Activity Name",
      "Performer",
      "Activity Description in detail",
      "Instruction Title",
      "Options / Values",
      "Field Type",
      "Activity / Parameter Type",
      "Dependencies",
      "Executor Lock",
      "Branching",
      "Filters",
      "Validations",
      "Automation Details",
      "Configuration Feasibility",
      "Configuration Feasibility Notes",
      "Configuration Status",
      "IS SELF VERIFICATION PRESENT?",
      "Tester Comments",
      "IS PEER VERIFICATION PRESENT?",
      "Tester Comments (B)",
    ];

    // Column widths in Excel character units, matched from formatted reference file
    const COL_WIDTHS = [23.66, 30, 16.66, 78, 53.16, 144.66, 10, 22.33, 255.83, 133.16, 43.66, 6.33, 10.33, 17.16, 21.16, 26.83, 18, 28.66, 15.66, 29, 18.83];

    const THIN_BORDER = {
      top:    { style: "thin" },
      bottom: { style: "thin" },
      left:   { style: "thin" },
      right:  { style: "thin" },
    };

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Workflow");

    // Set column widths
    COLUMNS.forEach((_, i) => {
      ws.getColumn(i + 1).width = COL_WIDTHS[i];
    });

    // Header row
    const headerRow = ws.addRow(COLUMNS);
    headerRow.eachCell((cell) => {
      cell.font      = { name: "Calibri", size: 12, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border    = THIN_BORDER;
    });

    // Data rows
    rows.forEach((row) => {
      const dataRow = ws.addRow(COLUMNS.map((col) => row[col] ?? ""));
      dataRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font      = { name: "Calibri", size: 12, bold: false };
        cell.alignment = { horizontal: "left", vertical: "top" };
        cell.border    = THIN_BORDER;
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      "workflow_extracted.xlsx"
    );
  };

  const dm = darkMode;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dm ? "bg-[#0d1117] text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* top glow */}
      <div className={`pointer-events-none fixed inset-x-0 top-0 h-64 ${
        dm
          ? "bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.15),transparent)]"
          : "bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.08),transparent)]"
      }`} />

      {/* Navbar */}
      <nav className={`sticky top-0 z-30 border-b backdrop-blur-md ${dm ? "bg-[#0d1117]/80 border-slate-800" : "bg-white/80 border-slate-200"}`}>
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-5 sm:px-8 py-3">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${dm ? "bg-indigo-500/20 ring-1 ring-indigo-500/30" : "bg-indigo-50 ring-1 ring-indigo-200"}`}>
              <WorkflowIcon className={`h-4 w-4 ${dm ? "text-indigo-400" : "text-indigo-600"}`} />
            </div>
            <span className={`text-sm font-semibold ${dm ? "text-slate-200" : "text-slate-800"}`}>Workflow Extractor</span>
            <span className={`hidden sm:inline-block rounded-full px-2 py-0.5 text-xs font-medium ${dm ? "bg-indigo-500/15 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
              Leucine
            </span>
          </div>
          <button
            onClick={() => setDarkMode((p) => !p)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              dm ? "border-slate-700 hover:bg-slate-800 text-slate-400" : "border-slate-200 hover:bg-slate-100 text-slate-500"
            }`}
          >
            {dm ? <SunIcon className="h-3.5 w-3.5" /> : <MoonIcon className="h-3.5 w-3.5" />}
            {dm ? "Light" : "Dark"}
          </button>
        </div>
      </nav>

      <main className="relative mx-auto max-w-screen-xl px-5 sm:px-8 py-8 sm:py-12 space-y-7">
        {/* Hero */}
        <div className="space-y-3">
          <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
            dm ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400" : "border-indigo-200 bg-indigo-50 text-indigo-600"
          }`}>
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            JSON → Spreadsheet
          </div>
          <h1 className={`text-3xl font-bold tracking-tight sm:text-4xl ${dm ? "text-white" : "text-slate-900"}`}>
            Extract workflow data{" "}
            <span className={dm ? "text-indigo-400" : "text-indigo-600"}>instantly</span>
          </h1>
          <p className={`text-sm max-w-xl leading-relaxed ${dm ? "text-slate-400" : "text-slate-500"}`}>
            Upload a Leucine workflow JSON or ZIP to extract stages, tasks, branching logic, validations, dependencies, and automations into a formatted spreadsheet.
          </p>
        </div>

        {/* Upload */}
        <DropZone onFile={handleFile} loading={loading} darkMode={dm} />

        {/* Stats */}
        <StatsGrid stats={stats} darkMode={dm} />

        {/* Table or empty state */}
        {rows.length > 0 ? (
          <DataTable
            rows={rows}
            stats={stats}
            darkMode={dm}
            onReset={() => setRows([])}
            onDownloadCSV={downloadCSV}
            onDownloadXLSX={downloadXLSX}
          />
        ) : (
          <div className={`rounded-2xl border border-dashed p-14 text-center ${dm ? "border-slate-800" : "border-slate-200"}`}>
            <div className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${dm ? "bg-slate-800" : "bg-slate-100"}`}>
              <WorkflowIcon className={`h-5 w-5 ${dm ? "text-slate-600" : "text-slate-400"}`} />
            </div>
            <p className={`font-medium text-sm ${dm ? "text-slate-500" : "text-slate-500"}`}>No data extracted yet</p>
            <p className={`mt-1 text-xs ${dm ? "text-slate-600" : "text-slate-400"}`}>
              Upload a JSON or ZIP file above to get started.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
