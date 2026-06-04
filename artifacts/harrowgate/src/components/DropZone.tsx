import { useRef, useState, useCallback } from "react";
import { Upload, Loader2 } from "lucide-react";

interface DropZoneProps {
  onFile: (file: File) => void;
  loading?: boolean;
  accept?: string;
  label?: string;
  sublabel?: string;
  accentColor?: string;
  accentBg?: string;
  accentBorder?: string;
  compact?: boolean;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
}

export default function DropZone({
  onFile,
  loading = false,
  accept = "image/*,.pdf,.doc,.docx",
  label,
  sublabel,
  accentColor = "#a28959",
  accentBg = "rgba(162,137,89,0.06)",
  accentBorder = "rgba(162,137,89,0.25)",
  compact = false,
  multiple = false,
  onFiles,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (loading) return;
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    if (multiple && onFiles) {
      onFiles(files);
    } else {
      onFile(files[0]);
    }
  }, [loading, onFile, onFiles, multiple]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loading) setDragging(true);
  }, [loading]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (multiple && onFiles) {
      onFiles(files);
    } else {
      onFile(files[0]);
    }
    e.target.value = "";
  };

  const activeBg = dragging ? `rgba(${hexToRgb(accentColor)},0.12)` : accentBg;
  const activeBorder = dragging ? accentColor : accentBorder;

  if (compact) {
    return (
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !loading && inputRef.current?.click()}
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-all select-none"
        style={{
          background: activeBg,
          borderColor: activeBorder,
          color: accentColor,
          opacity: loading ? 0.5 : 1,
          cursor: loading ? "not-allowed" : "pointer",
          borderStyle: dragging ? "solid" : "dashed",
        }}
        title="Click or drop file here"
      >
        {loading
          ? <Loader2 size={11} className="animate-spin shrink-0" style={{ color: accentColor }} />
          : <Upload size={11} className="shrink-0" style={{ color: accentColor }} />
        }
        <span className="text-xs font-medium" style={{ color: accentColor }}>
          {loading ? "Uploading…" : (label ?? "Upload")}
        </span>
        <input ref={inputRef} type="file" className="hidden" accept={accept} multiple={multiple} onChange={handleChange} />
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !loading && inputRef.current?.click()}
      className="w-full rounded-2xl border-2 transition-all select-none flex flex-col items-center justify-center gap-2 py-6 px-4"
      style={{
        background: activeBg,
        borderColor: activeBorder,
        borderStyle: "dashed",
        cursor: loading ? "not-allowed" : "pointer",
        transform: dragging ? "scale(1.01)" : "scale(1)",
      }}
    >
      {loading ? (
        <>
          <Loader2 size={22} className="animate-spin" style={{ color: accentColor }} />
          <p className="text-sm font-semibold" style={{ color: accentColor }}>Uploading…</p>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgba(${hexToRgb(accentColor)},0.12)` }}>
            <Upload size={18} style={{ color: accentColor }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: accentColor }}>
              {dragging ? "Drop file here" : (label ?? "Drag & drop or click to upload")}
            </p>
            {sublabel && !dragging && (
              <p className="text-xs mt-0.5" style={{ color: `rgba(${hexToRgb(accentColor)},0.55)` }}>{sublabel}</p>
            )}
          </div>
        </>
      )}
      <input ref={inputRef} type="file" className="hidden" accept={accept} multiple={multiple} onChange={handleChange} />
    </div>
  );
}

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r},${g},${b}`;
}
