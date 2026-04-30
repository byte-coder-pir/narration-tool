import { useRef, useState } from "react";
import { UploadIcon } from "./Icons";

export default function DropZone({ onFile, loading, darkMode: dm }) {
  const [dragActive, setDragActive] = useState(false);
  const ref = useRef(null);

  const handleDragOver  = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };
  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  };

  return (
    <section
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-all duration-200 ${
        dragActive
          ? dm
            ? "border-indigo-400 bg-indigo-500/10 scale-[1.005]"
            : "border-indigo-400 bg-indigo-50 scale-[1.005]"
          : dm
          ? "border-slate-700 bg-slate-900/40 hover:border-indigo-500/50 hover:bg-indigo-500/5"
          : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
      }`}
    >
      {/* background glow when dragging */}
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-indigo-500/5" />
      )}

      <div className="mx-auto flex max-w-sm flex-col items-center gap-5">
        {/* icon */}
        <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-200 ${
          dragActive
            ? "bg-indigo-500 shadow-lg shadow-indigo-500/30 scale-110"
            : dm ? "bg-slate-800" : "bg-slate-100"
        }`}>
          <UploadIcon className={`h-7 w-7 transition-colors ${dragActive ? "text-white" : dm ? "text-indigo-400" : "text-indigo-600"}`} />
        </div>

        {/* text */}
        <div className="space-y-1.5">
          <p className={`text-base font-semibold ${dm ? "text-slate-200" : "text-slate-800"}`}>
            {dragActive ? "Release to upload" : "Drop your workflow file here"}
          </p>
          <p className={`text-sm ${dm ? "text-slate-500" : "text-slate-400"}`}>
            JSON or ZIP · processed entirely in your browser
          </p>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => ref.current?.click()}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-150 ${
              dm
                ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/20"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
            }`}
          >
            Browse files
          </button>
          <span className={`text-xs ${dm ? "text-slate-600" : "text-slate-400"}`}>
            or drag &amp; drop
          </span>
        </div>

        {/* accepted formats */}
        <div className="flex items-center gap-2">
          {[".json", ".zip"].map((ext) => (
            <span
              key={ext}
              className={`rounded-md px-2 py-0.5 font-mono text-xs ${
                dm ? "bg-slate-800 text-slate-400 ring-1 ring-slate-700" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
              }`}
            >
              {ext}
            </span>
          ))}
        </div>

        <input ref={ref} type="file" accept=".json,.zip" className="hidden" onChange={handleChange} />
      </div>

      {/* loading overlay */}
      {loading && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl backdrop-blur-sm ${
          dm ? "bg-[#0d1117]/85" : "bg-white/85"
        }`}>
          <div className="relative h-10 w-10">
            <span className={`absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-indigo-500`} />
            <span className={`absolute inset-1 animate-spin rounded-full border-[2px] border-transparent border-t-indigo-300 [animation-duration:0.6s]`} />
          </div>
          <div className="text-center">
            <p className={`text-sm font-semibold ${dm ? "text-slate-200" : "text-slate-700"}`}>Processing…</p>
            <p className={`text-xs mt-0.5 ${dm ? "text-slate-500" : "text-slate-400"}`}>Extracting workflow data</p>
          </div>
        </div>
      )}
    </section>
  );
}
