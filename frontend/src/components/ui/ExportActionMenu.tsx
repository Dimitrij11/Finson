import { useEffect, useMemo, useRef, useState } from "react"
import { CheckSquare, Copy, Download, FileJson, FileText, Link2, Loader2, Share } from "lucide-react"

import type { ExportConfig, ExportFormat, ExportProgress, ExportScope } from "../../utils/exportManager"
import { createWebQueryHint, handleExport } from "../../utils/exportManager"
import { useNotifications } from "../../hooks/useNotifications"

interface ExportActionMenuProps<T> {
  config: ExportConfig<T>
  hasSelected: boolean
  selectedConfig: ExportConfig<T>
}

export function ExportActionMenu<T>({ config, hasSelected, selectedConfig }: ExportActionMenuProps<T>) {
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<ExportScope>(hasSelected ? "selected" : "filtered")
  const [isBusy, setIsBusy] = useState(false)
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [hint, setHint] = useState<string>("")
  const rootRef = useRef<HTMLDivElement>(null)
  const { addNotification } = useNotifications()

  useEffect(() => {
    if (!hasSelected && scope === "selected") {
      setScope("filtered")
    }
  }, [hasSelected, scope])

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (!rootRef.current || rootRef.current.contains(event.target as Node)) return
      setOpen(false)
    }

    if (open) {
      document.addEventListener("mousedown", onOutside)
    }

    return () => {
      document.removeEventListener("mousedown", onOutside)
    }
  }, [open])

  const activeConfig = useMemo(() => (scope === "selected" ? selectedConfig : config), [scope, config, selectedConfig])

  const runExport = async (format: ExportFormat) => {
    const effectiveConfig = hasSelected ? selectedConfig : config

    if (!effectiveConfig.rows.length) {
      addNotification({
        type: "warning",
        title: "Nothing to export",
        message: "No rows match your current filtered view.",
      })
      return
    }

    setIsBusy(true)
    setProgress(format === "pdf" ? { progress: 0, message: "Generating report" } : null)

    try {
      const result = await handleExport({
        format,
        filteredConfig: config,
        selectedConfig,
        onProgress: (next) => setProgress(next),
      })

      addNotification({
        type: "success",
        title: "Export complete",
        message:
          format === "tsv"
            ? `Copied ${result.rowCount} ${result.scopeUsed === "selected" ? "selected" : "filtered"} rows to clipboard.`
            : `Your ${format.toUpperCase()} export is ready (${result.rowCount} ${result.scopeUsed} rows).`,
      })

      if (format !== "tsv") {
        setOpen(false)
      }
    } catch (error) {
      addNotification({
        type: "warning",
        title: "Export failed",
        message: error instanceof Error ? error.message : "Failed to export data.",
      })
    } finally {
      setIsBusy(false)
      setTimeout(() => setProgress(null), 500)
    }
  }

  const handleWebQueryHint = async () => {
    const hintScope: ExportScope = hasSelected ? "selected" : "filtered"
    const source = hasSelected ? selectedConfig : config
    const text = createWebQueryHint(source.type, hintScope, source.filters)
    setHint(text)
    try {
      await navigator.clipboard.writeText(text)
      addNotification({
        type: "info",
        title: "Web Query copied",
        message: "Google Sheets query instructions are copied to clipboard.",
      })
    } catch {
      addNotification({
        type: "warning",
        title: "Clipboard blocked",
        message: "Copy failed. You can still copy the hint manually.",
      })
    }
  }

  return (
    <div className="export-menu" ref={rootRef}>
      <button
        type="button"
        className="export-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        disabled={isBusy}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {isBusy ? <Loader2 size={16} className="spin" /> : <Share size={16} />}
        <span>Share / Export</span>
      </button>

      {open && (
        <div className="export-menu__panel" role="menu">
          <div className="export-menu__section">
            <p className="export-menu__label">Scope</p>
            <div className="export-menu__scope-toggle">
              <button
                type="button"
                className={`export-menu__scope-btn${scope === "filtered" ? " export-menu__scope-btn--active" : ""}`}
                onClick={() => setScope("filtered")}
              >
                <Download size={14} /> Export All Filtered
              </button>
              <button
                type="button"
                className={`export-menu__scope-btn${scope === "selected" ? " export-menu__scope-btn--active" : ""}`}
                disabled={!hasSelected}
                onClick={() => setScope("selected")}
              >
                <CheckSquare size={14} /> Export Selected
              </button>
            </div>
          </div>

          <div className="export-menu__section">
            <p className="export-menu__label">Formats</p>
            <div className="export-menu__actions">
              <button type="button" onClick={() => runExport("pdf")} disabled={isBusy}>
                <FileText size={14} /> Professional PDF
              </button>
              <button type="button" onClick={() => runExport("csv")} disabled={isBusy}>
                <Download size={14} /> Standard CSV
              </button>
              <button type="button" onClick={() => runExport("json")} disabled={isBusy}>
                <FileJson size={14} /> Developer JSON
              </button>
              <button type="button" onClick={() => runExport("tsv")} disabled={isBusy}>
                <Copy size={14} /> Copy for Spreadsheet
              </button>
            </div>
          </div>

          <div className="export-menu__section">
            <button type="button" className="export-menu__hint-btn" onClick={handleWebQueryHint}>
              <Link2 size={14} /> Web Query URL Hint
            </button>
            {hint && <pre className="export-menu__hint">{hint}</pre>}
          </div>
        </div>
      )}

      {progress && (
        <div className="export-progress" aria-live="polite">
          <span>{progress.message}...</span>
          <div className="export-progress__track">
            <div className="export-progress__bar" style={{ width: `${Math.max(3, progress.progress)}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
