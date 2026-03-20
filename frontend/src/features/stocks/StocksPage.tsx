import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Search, TrendingDown, TrendingUp, X } from "lucide-react"

import { useLanguage } from "../../i18n"
import { useAuth } from "../../hooks/useAuth"
import { apiClient } from "../../api/client"

// Types
interface StockRow {
  symbol: string
  name: string
  price: number | null
  change: number | null
  change_percent: number | null
  market_cap: number | null
  volume: number | null
  day_high: number | null
  day_low: number | null
  fifty_two_week_low: number | null
  fifty_two_week_high: number | null
  avg_volume: number | null
  exchange: string
}

interface StockListResponse {
  total: number
  quotes: StockRow[]
}

interface SearchResult {
  symbol: string
  name: string
  exchange: string
  quoteType: string
}

interface ChartPoint { t: number; price: number }

type Screener = "all" | "day_gainers" | "day_losers" | "most_actives" | "growth_technology_stocks"
type ChartRange = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y"

// Constants
const SCREENERS: { id: Screener; en: string; mk: string }[] = [
  { id: "all",                       en: "Most Active",  mk: "\u041d\u0430\u0458\u0430\u043a\u0442\u0438\u0432\u043d\u0438" },
  { id: "day_gainers",               en: "Day Gainers",  mk: "\u0414\u043d\u0435\u0432\u043d\u0438 \u0434\u043e\u0431\u0438\u0432\u043a\u0438" },
  { id: "day_losers",                en: "Day Losers",   mk: "\u0414\u043d\u0435\u0432\u043d\u0438 \u0433\u0443\u0431\u0438\u0442\u043d\u0438\u0446\u0438" },
  { id: "most_actives",              en: "Top Volume",   mk: "\u0422\u043e\u043f \u0432\u043e\u043b\u0443\u043c\u0435\u043d" },
  { id: "growth_technology_stocks",  en: "Tech Growth",  mk: "\u0422\u0435\u0445 \u0440\u0430\u0441\u0442" },
]

const CHART_RANGES: { value: ChartRange; label: string }[] = [
  { value: "1d",  label: "1D" },
  { value: "5d",  label: "5D" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y",  label: "1Y" },
  { value: "5y",  label: "5Y" },
]

const PAGE_SIZE = 30

// Helpers
function pickDefined<T>(preferred: T | null | undefined, fallback: T | null | undefined): T | null {
  if (preferred !== null && preferred !== undefined) return preferred
  return fallback ?? null
}

function fmtPrice(n: number | null): string {
  if (n == null) return "\u2014"
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtLarge(n: number | null): string {
  if (n == null) return "\u2014"
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T"
  if (n >= 1e9)  return "$" + (n / 1e9).toFixed(2) + "B"
  if (n >= 1e6)  return "$" + (n / 1e6).toFixed(2) + "M"
  return "$" + n.toLocaleString("en-US")
}

function fmtVol(n: number | null): string {
  if (n == null) return "\u2014"
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + "B"
  if (n >= 1e6)  return (n / 1e6).toFixed(2) + "M"
  if (n >= 1e3)  return (n / 1e3).toFixed(1) + "K"
  return String(n)
}

// Stock Chart Modal
const StockChartModal = ({ stock, onClose }: { stock: StockRow; onClose: () => void }) => {
  const [displayStock, setDisplayStock] = useState<StockRow>(stock)
  const [chartRange, setChartRange] = useState<ChartRange>("1mo")
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [chartLoading, setChartLoading] = useState(true)
  const { token } = useAuth()

  useEffect(() => {
    setDisplayStock(stock)
  }, [stock])

  useEffect(() => {
    let active = true
    apiClient
      .get<StockRow[]>(`/market/stocks/quote?symbols=${encodeURIComponent(stock.symbol)}`, { token })
      .then((quotes) => {
        if (!active || quotes.length === 0) return

        const exact = quotes.find((q) => q.symbol.toUpperCase() === stock.symbol.toUpperCase()) ?? quotes[0]
        setDisplayStock((prev) => ({
          ...prev,
          ...exact,
          name: exact.name || prev.name,
          exchange: exact.exchange || prev.exchange,
          price: pickDefined(exact.price, prev.price),
          change: pickDefined(exact.change, prev.change),
          change_percent: pickDefined(exact.change_percent, prev.change_percent),
          market_cap: pickDefined(exact.market_cap, prev.market_cap),
          volume: pickDefined(exact.volume, prev.volume),
          day_high: pickDefined(exact.day_high, prev.day_high),
          day_low: pickDefined(exact.day_low, prev.day_low),
          fifty_two_week_low: pickDefined(exact.fifty_two_week_low, prev.fifty_two_week_low),
          fifty_two_week_high: pickDefined(exact.fifty_two_week_high, prev.fifty_two_week_high),
          avg_volume: pickDefined(exact.avg_volume, prev.avg_volume),
        }))
      })
      .catch(() => {
        // Keep existing modal data when quote refresh fails.
      })
    return () => {
      active = false
    }
  }, [stock.symbol, token])

  useEffect(() => {
    let active = true
    setChartLoading(true)
    apiClient
      .get<ChartPoint[]>(`/market/stocks/chart/${stock.symbol}?range=${chartRange}`, { token })
      .then((d) => { if (active) { setChartData(d); setChartLoading(false) } })
      .catch(() => { if (active) setChartLoading(false) })
    return () => { active = false }
  }, [stock.symbol, chartRange, token])

  const isUp = (displayStock.change_percent ?? 0) >= 0
  const color = isUp ? "#22c55e" : "#fb7185"
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })

  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [])

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal coin-chart-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="coin-chart-modal__title">
            <div>
              <h2>{displayStock.symbol}</h2>
              <span className="eyebrow">{displayStock.name} &middot; {displayStock.exchange}</span>
            </div>
          </div>
          <button className="modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="coin-chart-modal__meta">
          <span className="coin-chart-modal__price">{fmtPrice(displayStock.price)}</span>
          {displayStock.change_percent != null && (
            <span className={`market-badge ${isUp ? "market-badge--up" : "market-badge--down"}`}>
              {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {Math.abs(displayStock.change_percent).toFixed(2)}%
            </span>
          )}
        </div>

        <div className="period-selector" style={{ marginBottom: "1rem" }}>
          {CHART_RANGES.map((r) => (
            <button key={r.value} className={`period-btn ${chartRange === r.value ? "period-btn--active" : ""}`} onClick={() => setChartRange(r.value)}>{r.label}</button>
          ))}
        </div>

        <div className="coin-chart-modal__chart">
          {chartLoading ? (
            <div className="page-centered" style={{ minHeight: 220 }}><div className="loader" /></div>
          ) : chartData.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--muted)" }}>No chart data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="sChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tickFormatter={formatDate} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} minTickGap={40} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtPrice(v)} width={80} />
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <Tooltip
                  labelFormatter={(l) => formatDate(l as number)}
                  formatter={(v: number) => [fmtPrice(v), "Price"]}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} dot={false} fill="url(#sChartGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="coin-chart-modal__stats">
          <div className="coin-stat"><span>Market Cap</span><strong>{fmtLarge(displayStock.market_cap)}</strong></div>
          <div className="coin-stat"><span>Volume</span><strong>{fmtVol(displayStock.volume)}</strong></div>
          <div className="coin-stat"><span>Day Range</span><strong>{fmtPrice(displayStock.day_low)} - {fmtPrice(displayStock.day_high)}</strong></div>
          <div className="coin-stat"><span>52w Low</span><strong>{fmtPrice(displayStock.fifty_two_week_low)}</strong></div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Main Page
export const StocksPage = () => {
  const { language } = useLanguage()
  const { token } = useAuth()

  const [stocks, setStocks] = useState<StockRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [start, setStart] = useState(0)

  const [screener, setScreener] = useState<Screener>("all")
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedStock, setSelectedStock] = useState<StockRow | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch stocks from screener
  const fetchStocks = useCallback(
    async (startIdx: number, reset: boolean) => {
      if (reset) { setLoading(true); setError(null) } else setLoadingMore(true)
      try {
        const params = new URLSearchParams({
          screener,
          count: String(PAGE_SIZE),
          start: String(startIdx),
        })
        const data = await apiClient.get<StockListResponse>(`/market/stocks/list?${params}`, { token })
        setTotal(data.total)
        if (reset) setStocks(data.quotes)
        else        setStocks((prev) => [...prev, ...data.quotes])
      } catch (e) {
        let errMsg = "Failed to load stocks."
        if (e instanceof Error) {
          try {
            const parsed = JSON.parse(e.message)
            if (parsed?.status?.error_code === 429 || parsed?.error?.code === 429) {
              errMsg = language === "mk" ? "Надминат лимит. Обидете се повторно подоцна." : "Rate limit exceeded. Please try again later."
            } else {
              errMsg = e.message
            }
          } catch {
            if (e.message.includes("429")) {
               errMsg = language === "mk" ? "Надминат лимит. Обидете се повторно подоцна." : "Rate limit exceeded. Please try again later."
            } else {
               errMsg = e.message
            }
          }
        }
        setError(errMsg)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [screener, token],
  )

  useEffect(() => {
    setStart(0)
    setSearchResults(null)
    setQuery("")
    fetchStocks(0, true)
  }, [screener]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = () => {
    const next = start + PAGE_SIZE
    setStart(next)
    fetchStocks(next, false)
  }

  // Search as user types
  useEffect(() => {
    if (!query.trim()) { setSearchResults(null); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const data = await apiClient.get<SearchResult[]>(`/market/stocks/search?q=${encodeURIComponent(query)}`, { token })
        setSearchResults(data)
      } catch { setSearchResults([]) }
      finally { setSearchLoading(false) }
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, token])

  const handleStockSelect = useCallback((stock: StockRow) => {
    setSelectedStock(stock)
    setSearchResults(null)
    setQuery("")
  }, [])

  const buildFallbackStock = useCallback((result: SearchResult): StockRow => ({
    symbol: result.symbol,
    name: result.name,
    exchange: result.exchange,
    price: null,
    change: null,
    change_percent: null,
    market_cap: null,
    volume: null,
    day_high: null,
    day_low: null,
    fifty_two_week_low: null,
    fifty_two_week_high: null,
    avg_volume: null,
  }), [])

  // Single selection path used by both table rows and search results.
  const handleSelectStockSymbol = useCallback(
    async (symbol: string, searchItem?: SearchResult) => {
      const normalized = symbol.toUpperCase()
      const existing = stocks.find((s) => s.symbol.toUpperCase() === normalized)
      if (existing) {
        handleStockSelect(existing)
        return
      }

      try {
        const quotes = await apiClient.get<StockRow[]>(`/market/stocks/quote?symbols=${encodeURIComponent(symbol)}`, { token })
        const selected = quotes.find((q) => q.symbol.toUpperCase() === normalized) ?? quotes[0]
        if (selected) {
          handleStockSelect(selected)
          return
        }
      } catch {
        // Ignore selection failures and keep current state.
      }

      if (searchItem) handleStockSelect(buildFallbackStock(searchItem))
    },
    [buildFallbackStock, handleStockSelect, stocks, token],
  )

  const hasMore = stocks.length < total

  return (
    <section className="market-page">
      <div className="dashboard__header">
        <div>
          <p className="eyebrow">{language === "mk" ? "\u043f\u0430\u0437\u0430\u0440" : "market"}</p>
          <h1 className="hero-title">{language === "mk" ? "\u0410\u043a\u0446\u0438\u0438" : "Stocks"}</h1>
        </div>
        <div className="dashboard__badge">
          <span>Yahoo Finance Data</span>
        </div>
      </div>

      <div className="market-controls">
        <div className="market-search-wrap" style={{ position: "relative" }}>
          <Search size={15} className="market-search-icon" />
          <input className="input market-search" placeholder={language === "mk" ? "\u0411\u0430\u0440\u0430\u0458 \u0430\u043a\u0446\u0438\u0458\u0430..." : "Search stock / ticker..."} value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <button className="market-clear-btn" onClick={() => { setQuery(""); setSearchResults(null) }}><X size={13} /></button>}

          {/* Search dropdown */}
          {searchResults !== null && query.trim() && (
            <div className="market-search-dropdown">
              {searchLoading ? (
                <div style={{ padding: "0.75rem", textAlign: "center", color: "var(--muted)" }}>Searching&hellip;</div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: "0.75rem", textAlign: "center", color: "var(--muted)" }}>No results</div>
              ) : (
                searchResults.map((r) => (
                  <button
                    type="button"
                    key={`${r.symbol}-${r.exchange}`}
                    className="market-search-result"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void handleSelectStockSymbol(r.symbol, r)}
                  >
                    <strong>{r.symbol}</strong>
                    <span>{r.name}</span>
                    <span className="eyebrow">{r.exchange}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Screener chips */}
      <div className="market-row-filters">
        <div className="market-chips">
          {SCREENERS.map((s) => (
            <button key={s.id} className={`market-chip ${screener === s.id ? "market-chip--active" : ""}`} onClick={() => setScreener(s.id)}>
              {language === "mk" ? s.mk : s.en}
            </button>
          ))}
        </div>
      </div>

      <div className="panel market-table-panel">
        {loading ? (
          <div className="page-centered" style={{ minHeight: 300 }}><div className="loader" /><p>{language === "mk" ? "\u0421\u0435 \u0432\u0447\u0438\u0442\u0443\u0432\u0430\u0430\u0442 \u0430\u043a\u0446\u0438\u0438..." : "Loading stocks\u2026"}</p></div>
        ) : error ? (
          <div className="page-centered" style={{ minHeight: 200 }}>
            <p style={{ color: "var(--negative)" }}>{error}</p>
            <button className="primary-button" onClick={() => fetchStocks(0, true)}>{language === "mk" ? "\u041e\u0431\u0438\u0434\u0438 \u043f\u043e\u0432\u0442\u043e\u0440\u043d\u043e" : "Retry"}</button>
          </div>
        ) : stocks.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem 0" }}>{language === "mk" ? "\u041d\u0435\u043c\u0430 \u0440\u0435\u0437\u0443\u043b\u0442\u0430\u0442\u0438." : "No results."}</p>
        ) : (
          <>
            <div className="market-table-wrap">
              <table className="table market-table">
                <thead>
                  <tr>
                    <th>{language === "mk" ? "\u0421\u0438\u043c\u0431\u043e\u043b" : "Symbol"}</th>
                    <th>{language === "mk" ? "\u0418\u043c\u0435" : "Name"}</th>
                    <th className="amount-header">{language === "mk" ? "\u0426\u0435\u043d\u0430" : "Price"}</th>
                    <th className="amount-header">{language === "mk" ? "\u041f\u0440\u043e\u043c\u0435\u043d\u0430" : "Change"}</th>
                    <th className="amount-header hide-sm">{language === "mk" ? "\u041f\u0430\u0437\u0430\u0440\u043d\u0430 \u043a\u0430\u043f." : "Market Cap"}</th>
                    <th className="amount-header hide-sm">{language === "mk" ? "\u0412\u043e\u043b\u0443\u043c\u0435\u043d" : "Volume"}</th>
                    <th className="amount-header hide-md">{language === "mk" ? "\u0414\u043d\u0435\u0432\u0435\u043d \u0440\u0430\u0441\u043f\u043e\u043d" : "Day Range"}</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s) => {
                    const isUp = (s.change_percent ?? 0) >= 0
                    return (
                      <tr key={s.symbol} className="market-row" onClick={() => void handleSelectStockSymbol(s.symbol)}>
                        <td><strong className="stock-symbol">{s.symbol}</strong></td>
                        <td className="stock-name-cell">{s.name}</td>
                        <td className="amount-cell">{fmtPrice(s.price)}</td>
                        <td className={`amount-cell ${isUp ? "market-up" : "market-down"}`}>
                          {isUp ? <TrendingUp size={12} className="inline-icon" /> : <TrendingDown size={12} className="inline-icon" />}
                          {s.change_percent != null ? `${Math.abs(s.change_percent).toFixed(2)}%` : "\u2014"}
                        </td>
                        <td className="amount-cell hide-sm">{fmtLarge(s.market_cap)}</td>
                        <td className="amount-cell hide-sm">{fmtVol(s.volume)}</td>
                        <td className="amount-cell hide-md">
                          {s.day_low != null && s.day_high != null ? `${fmtPrice(s.day_low)} - ${fmtPrice(s.day_high)}` : "\u2014"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="market-load-more">
                <button className="primary-button" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? (language === "mk" ? "\u0421\u0435 \u0432\u0447\u0438\u0442\u0443\u0432\u0430..." : "Loading\u2026") : (language === "mk" ? "\u0412\u0447\u0438\u0442\u0430\u0458 \u043f\u043e\u0432\u0435\u045c\u0435" : `Load ${PAGE_SIZE} more`)}
                </button>
                <span className="market-count">{language === "mk" ? `\u041f\u0440\u0438\u043a\u0430\u0436\u0430\u043d\u043e: ${stocks.length} / ${total}` : `Showing ${stocks.length} / ${total}`}</span>
              </div>
            )}
          </>
        )}
      </div>

      {selectedStock && <StockChartModal stock={selectedStock} onClose={() => setSelectedStock(null)} />}
    </section>
  )
}
