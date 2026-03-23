import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

export type ExportScope = "selected" | "filtered"
export type ExportFormat = "pdf" | "csv" | "json" | "tsv"

export type ExportColumnKind = "text" | "number" | "currency" | "date"

export interface ExportColumn<T> {
  id: string
  label: string
  kind?: ExportColumnKind
  value: (row: T) => unknown
}

export interface ExportFilters {
  date?: string
  category?: string
  search?: string
}

export interface ExportSummary {
  currency?: string
  totalIncomeMinor?: bigint
  totalExpenseMinor?: bigint
}

export interface ExportConfig<T> {
  type: string
  rows: T[]
  columns: ExportColumn<T>[]
  dateRangeLabel: string
  filters?: ExportFilters
  summary?: ExportSummary
  locale?: string
}

export interface ExportProgress {
  progress: number
  message: string
}

interface UnicodeFontCache {
  loaded: boolean
  loadingPromise?: Promise<void>
}

const MINOR_SCALE = 10000n
const UNICODE_FONT_NAME = "NotoSans"
const UNICODE_FONT_FILE = "NotoSans-Regular.ttf"
const unicodeFontCache: UnicodeFontCache = { loaded: false }

const waitFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

const pad2 = (n: number) => String(n).padStart(2, "0")

const sanitizeFilePart = (value: string): string => {
  return value
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
}

const formatDateForFile = (date: Date): string => {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}_${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`
}

export const toMinorUnits = (value: string | number | null | undefined): bigint => {
  if (value == null) return 0n
  const raw = String(value).trim().replace(/,/g, "")
  if (!raw) return 0n

  const sign = raw.startsWith("-") ? -1n : 1n
  const normalized = raw.replace(/^[-+]/, "")
  const [intPartRaw, fracPartRaw = ""] = normalized.split(".")
  const intPart = intPartRaw.replace(/\D/g, "") || "0"
  const fracDigits = fracPartRaw.replace(/\D/g, "")
  const fracPart = (fracDigits + "0000").slice(0, 4)

  const scaled = BigInt(intPart) * MINOR_SCALE + BigInt(fracPart)
  return scaled * sign
}

export const minorToDecimalString = (minor: bigint, fractionDigits = 2): string => {
  const sign = minor < 0 ? "-" : ""
  const abs = minor < 0 ? -minor : minor
  const integer = abs / MINOR_SCALE
  const fraction = String(abs % MINOR_SCALE).padStart(4, "0").slice(0, Math.min(Math.max(fractionDigits, 0), 4))

  if (!fractionDigits) {
    return `${sign}${integer}`
  }

  return `${sign}${integer}.${fraction}`
}

const formatCurrencyFromMinor = (minor: bigint, currency: string, locale: string): string => {
  const asNumber = Number(minorToDecimalString(minor, 2))
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(asNumber)
}

const formatDate = (value: unknown): string => {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

const toCellString = (value: unknown, kind: ExportColumnKind | undefined): string => {
  if (value == null) return ""
  if (kind === "date") return formatDate(value)
  if (typeof value === "bigint") return value.toString()
  return String(value)
}

const sanitizePdfText = (value: string): string => {
  return value
    .normalize("NFC")
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
}

const uint8ToBinaryString = (bytes: Uint8Array): string => {
  const chunk = 0x8000
  let result = ""
  for (let i = 0; i < bytes.length; i += chunk) {
    result += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return result
}

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  const binary = uint8ToBinaryString(bytes)
  if (typeof btoa !== "undefined") {
    return btoa(binary)
  }
  // Node-friendly fallback (shouldn't run in browser, but safe for SSR tests)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (globalThis as any).Buffer !== "undefined") {
    // @ts-ignore
    return (globalThis as any).Buffer.from(bytes).toString("base64")
  }
  throw new Error("No base64 encoder available for PDF font loading")
}

const ensureUnicodeFont = async (doc: jsPDF): Promise<void> => {
  if (unicodeFontCache.loaded) {
    doc.setFont(UNICODE_FONT_NAME, "normal")
    return
  }

  if (!unicodeFontCache.loadingPromise) {
    unicodeFontCache.loadingPromise = (async () => {
      // Try a local app-hosted font first (public/fonts), then fall back to CDN.
      const candidates = [
        `/fonts/${UNICODE_FONT_FILE}`,
        "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.0.22/files/noto-sans-cyrillic-400-normal.ttf",
      ]

      let lastErr: unknown = null
      for (const url of candidates) {
        try {
          const response = await fetch(url)
          if (!response.ok) throw new Error(`Failed to fetch ${url} (${response.status})`)
          const buffer = await response.arrayBuffer()
          const base64 = arrayBufferToBase64(buffer)

          doc.addFileToVFS(UNICODE_FONT_FILE, base64)
          doc.addFont(UNICODE_FONT_FILE, UNICODE_FONT_NAME, "normal")
          unicodeFontCache.loaded = true
          lastErr = null
          break
        } catch (err) {
          lastErr = err
          // try next candidate
        }
      }

      if (lastErr) {
        // If none of the candidates succeeded, surface an explanatory error in console
        // but allow the caller to fall back to a standard font.
        // eslint-disable-next-line no-console
        console.warn("PDF Unicode font load failed:", lastErr)
      }
    })()
  }

  await unicodeFontCache.loadingPromise
  doc.setFont(UNICODE_FONT_NAME, "normal")
}

const csvEscape = (value: string): string => {
  const escaped = value.replace(/"/g, '""')
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped
}

const downloadTextFile = (content: string, fileName: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export const buildFilename = (type: string, dateRangeLabel: string, extension: string): string => {
  const safeType = sanitizeFilePart(type)
  const safeRange = sanitizeFilePart(dateRangeLabel || "All")
  const ts = formatDateForFile(new Date())
  return `Finson_${safeType}_${safeRange}_${ts}.${extension}`
}

export const buildDateRangeFromRows = (dates: string[]): string => {
  if (!dates.length) return "All"
  const parsed = dates.map((d) => new Date(d)).filter((d) => !Number.isNaN(d.getTime()))
  if (!parsed.length) return "All"
  parsed.sort((a, b) => a.getTime() - b.getTime())
  return `${formatDate(parsed[0])}_to_${formatDate(parsed[parsed.length - 1])}`
}

export const sumMinor = (values: Array<string | number | null | undefined>): bigint => {
  return values.reduce((acc, value) => acc + toMinorUnits(value), 0n)
}

export const exportAsCsv = <T>(config: ExportConfig<T>): void => {
  const headers = config.columns.map((c) => c.label)
  const rows = config.rows.map((row) => config.columns.map((col) => csvEscape(toCellString(col.value(row), col.kind))).join(","))
  const content = [headers.join(","), ...rows].join("\n")
  const fileName = buildFilename(config.type, config.dateRangeLabel, "csv")
  downloadTextFile(`\uFEFF${content}`, fileName, "text/csv;charset=utf-8;")
}

export const exportAsJson = <T>(config: ExportConfig<T>, scope: ExportScope): void => {
  const generatedAt = new Date().toISOString()
  const data = config.rows.map((row) => {
    const out: Record<string, string> = {}
    for (const col of config.columns) {
      out[col.id] = toCellString(col.value(row), col.kind)
    }
    return out
  })

  const payload = {
    meta: {
      type: config.type,
      scope,
      generatedAt,
      dateRange: config.dateRangeLabel,
      filters: config.filters ?? {},
      rowCount: config.rows.length,
      summary: config.summary
        ? {
            currency: config.summary.currency,
            totalIncome: config.summary.totalIncomeMinor != null ? minorToDecimalString(config.summary.totalIncomeMinor) : undefined,
            totalExpense: config.summary.totalExpenseMinor != null ? minorToDecimalString(config.summary.totalExpenseMinor) : undefined,
          }
        : undefined,
    },
    data,
  }

  const fileName = buildFilename(config.type, config.dateRangeLabel, "json")
  downloadTextFile(JSON.stringify(payload, null, 2), fileName, "application/json;charset=utf-8;")
}

export const copyAsTsv = async <T>(config: ExportConfig<T>): Promise<void> => {
  const headers = config.columns.map((c) => c.label).join("\t")
  const rows = config.rows
    .map((row) => config.columns.map((col) => toCellString(col.value(row), col.kind).replace(/\t/g, " ")).join("\t"))
    .join("\n")
  await navigator.clipboard.writeText(`${headers}\n${rows}`)
}

export const exportAsPdf = async <T>(
  config: ExportConfig<T>,
  onProgress?: (progress: ExportProgress) => void,
): Promise<void> => {
  const locale = config.locale ?? "en-US"

  onProgress?.({ progress: 5, message: "Preparing report" })
  await waitFrame()

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })

  try {
    onProgress?.({ progress: 10, message: "Loading PDF fonts" })
    await ensureUnicodeFont(doc)
  } catch {
    doc.setFont("helvetica", "normal")
  }

  doc.setFillColor(22, 31, 53)
  doc.rect(0, 0, 842, 90, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.text(sanitizePdfText("Finson Financial Report"), 42, 45)
  doc.setFontSize(11)
  doc.text(sanitizePdfText(`Generated: ${new Date().toLocaleString(locale)}`), 42, 67)

  doc.setTextColor(31, 41, 55)
  doc.setFontSize(11)
  doc.text(sanitizePdfText(`Type: ${config.type}`), 42, 116)
  doc.text(sanitizePdfText(`Date Range: ${config.dateRangeLabel}`), 42, 133)

  const filterText = [
    config.filters?.date ? `Date=${config.filters.date}` : "",
    config.filters?.category ? `Category=${config.filters.category}` : "",
    config.filters?.search ? `Search=${config.filters.search}` : "",
  ].filter(Boolean).join(" | ")

  doc.text(sanitizePdfText(`Filters: ${filterText || "None"}`), 42, 150)

  if (config.summary?.currency) {
    const totalIncome = config.summary.totalIncomeMinor ?? 0n
    const totalExpense = config.summary.totalExpenseMinor ?? 0n
    const net = totalIncome - totalExpense
    doc.text(sanitizePdfText(`Total Income: ${formatCurrencyFromMinor(totalIncome, config.summary.currency, locale)}`), 460, 116)
    doc.text(sanitizePdfText(`Total Expense: ${formatCurrencyFromMinor(totalExpense, config.summary.currency, locale)}`), 460, 133)
    doc.text(sanitizePdfText(`Net: ${formatCurrencyFromMinor(net, config.summary.currency, locale)}`), 460, 150)
  }

  const totalRows = config.rows.length || 1
  const body: string[][] = []

  for (let i = 0; i < config.rows.length; i += 1) {
    const row = config.rows[i]
    body.push(config.columns.map((col) => sanitizePdfText(toCellString(col.value(row), col.kind))))

    if (i % 120 === 0) {
      const progress = Math.min(80, Math.round(((i + 1) / totalRows) * 75) + 5)
      onProgress?.({ progress, message: "Preparing table rows" })
      await waitFrame()
    }
  }

  onProgress?.({ progress: 85, message: "Rendering PDF table" })
  await waitFrame()

  autoTable(doc, {
    head: [config.columns.map((c) => sanitizePdfText(c.label))],
    body,
    startY: 176,
    styles: {
      fontSize: 9,
      cellPadding: 6,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [22, 31, 53],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [247, 249, 252],
    },
    margin: { left: 28, right: 28 },
    didDrawPage: () => {
      const page = doc.getCurrentPageInfo().pageNumber
      doc.setFontSize(9)
      doc.setTextColor(120, 120, 120)
      doc.text(sanitizePdfText(`Page ${page}`), 790, 585, { align: "right" })
    },
  })

  onProgress?.({ progress: 98, message: "Finalizing report" })
  await waitFrame()

  doc.save(buildFilename(config.type, config.dateRangeLabel, "pdf"))
  onProgress?.({ progress: 100, message: "Report ready" })
}

export const createWebQueryHint = (type: string, scope: ExportScope, filters?: ExportFilters): string => {
  const token = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  const params = new URLSearchParams({
    token,
    format: "csv",
    scope,
    expiresInMinutes: "30",
  })

  if (filters?.date) params.set("date", filters.date)
  if (filters?.category) params.set("category", filters.category)
  if (filters?.search) params.set("search", filters.search)

  const endpoint = `${window.location.origin}/api/exports/${type.toLowerCase()}?${params.toString()}`

  return [
    `Temporary Web Query URL (validity target: 30 min):`,
    endpoint,
    "",
    "Google Sheets examples:",
    `=IMPORTDATA(\"${endpoint}\")`,
    `=IMPORTHTML(\"${endpoint}&format=html\", \"table\", 1)`,
    "",
    "If this endpoint is not live yet, wire it on your backend and keep the same query contract.",
  ].join("\n")
}

export const runExportAction = async <T>(args: {
  format: ExportFormat
  scope: ExportScope
  config: ExportConfig<T>
  onProgress?: (progress: ExportProgress) => void
}): Promise<void> => {
  const { format, scope, config, onProgress } = args

  if (format === "pdf") {
    await exportAsPdf(config, onProgress)
    return
  }

  if (format === "csv") {
    exportAsCsv(config)
    return
  }

  if (format === "json") {
    exportAsJson(config, scope)
    return
  }

  await copyAsTsv(config)
}

export const handleExport = async <T>(args: {
  format: ExportFormat
  filteredConfig: ExportConfig<T>
  selectedConfig: ExportConfig<T>
  onProgress?: (progress: ExportProgress) => void
}): Promise<{ scopeUsed: ExportScope; rowCount: number }> => {
  const { format, filteredConfig, selectedConfig, onProgress } = args
  const useSelected = selectedConfig.rows.length > 0
  const scopeUsed: ExportScope = useSelected ? "selected" : "filtered"
  const config = useSelected ? selectedConfig : filteredConfig

  await runExportAction({
    format,
    scope: scopeUsed,
    config,
    onProgress,
  })

  return { scopeUsed, rowCount: config.rows.length }
}
