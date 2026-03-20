import { useCallback, useEffect, useRef, useState, useMemo } from "react"
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
interface CryptoRow {
  symbol: string
  name: string
  price: number | null
  change: number | null
  change_percent: number | null
  market_cap: number | null
  volume: number | null
  exchange: string
  image: string
}

interface CryptoListResponse {
  total: number
  quotes: CryptoRow[]
}

interface CryptoSearchResult {
  symbol: string
  name: string
  exchange: string
  quoteType: string
}

interface ChartPoint { t: number; price: number }

type ChartRange = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y"
type CryptoFilter = "all" | "gainers" | "losers"

// Constants
const CHART_RANGES: { value: ChartRange; label: string }[] = [
  { value: "1d",  label: "1D" },
  { value: "5d",  label: "5D" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y",  label: "1Y" },
  { value: "5y",  label: "5Y" },
]

const PAGE_SIZE = 50

// Helpers
function fmtPrice(n: number | null): string {
  if (n == null) return "—"
  if (n >= 1) return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (n >= 0.001) return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 })
  return "$" + n.toExponential(4)
}

function fmtMillions(n: number | null): string {
  if (n == null) return "—"
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T"
  if (n >= 1e9)  return "$" + (n / 1e9).toFixed(2) + "B"
  if (n >= 1e6)  return "$" + (n / 1e6).toFixed(2) + "M"
  return "$" + n.toLocaleString("en-US")
}

// Chart Modal
const CryptoChartModal = ({ coin, onClose }: { coin: CryptoRow; onClose: () => void }) => {
  const [chartRange, setChartRange] = useState<ChartRange>("1mo")
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [chartLoading, setChartLoading] = useState(true)
  const { token } = useAuth()

  useEffect(() => {
    let active = true
    setChartLoading(true)
    apiClient
      .get<ChartPoint[]>(`/market/crypto/chart/${coin.symbol}?range=${chartRange}`, { token })
      .then((d) => { if (active) { setChartData(d); setChartLoading(false) } })
      .catch(() => { if (active) setChartLoading(false) })
    return () => { active = false }
  }, [coin.symbol, chartRange, token])

  const isUp = (coin.change_percent ?? 0) >= 0
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
            {coin.image ? <img src={coin.image} alt={coin.name} width={28} height={28} className="coin-icon" /> : null}
            <div>
              <h2>{coin.name}</h2>
              <span className="eyebrow">{coin.symbol}</span>
            </div>
          </div>
          <button className="modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="coin-chart-modal__meta">
          <span className="coin-chart-modal__price">{fmtPrice(coin.price)}</span>
          {coin.change_percent != null && (
            <span className={`market-badge ${isUp ? "market-badge--up" : "market-badge--down"}`}>
              {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {Math.abs(coin.change_percent).toFixed(2)}%
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
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} dot={false} fill="url(#chartGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="coin-chart-modal__stats">
          <div className="coin-stat"><span>Market Cap</span><strong>{fmtMillions(coin.market_cap)}</strong></div>
          <div className="coin-stat"><span>Volume</span><strong>{fmtMillions(coin.volume)}</strong></div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Main Page
export const CryptoPage = () => {
  const { language } = useLanguage()
  const { token } = useAuth()

  const [coins, setCoins] = useState<CryptoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [start, setStart] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<CryptoFilter>("all")

  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<CryptoSearchResult[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedCoin, setSelectedCoin] = useState<CryptoRow | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const fetchList = useCallback(
    async (currentStart: number, reset: boolean) => {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      if (reset) { setLoading(true); setError(null) } else setLoadingMore(true)

      try {
        const res = await apiClient.get<CryptoListResponse>(`/market/crypto/list?count=${PAGE_SIZE}&start=${currentStart}`, { token })
        setHasMore((currentStart + PAGE_SIZE) < res.total)
        if (reset) setCoins(res.quotes || [])
        else        setCoins((prev) => [...prev, ...(res.quotes || [])])
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return
        setError(language === "mk" ? "Неуспешно вчитување на монети." : "Failed to load crypto prices.")
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [language, token],
  )

  useEffect(() => {
    if (query.trim()) {
      const debounce = setTimeout(async () => {
        setSearchLoading(true)
        setError(null)
        try {
          const data = await apiClient.get<CryptoSearchResult[]>(`/market/crypto/search?q=${encodeURIComponent(query)}`, { token })
          if (data.length > 0) {
            setSearchResults(data)
          } else {
            const q = query.trim().toLowerCase()
            const fallback = coins
              .filter((coin) => coin.symbol.toLowerCase().includes(q) || coin.name.toLowerCase().includes(q))
              .slice(0, 10)
              .map((coin) => ({
                symbol: coin.symbol,
                name: coin.name,
                exchange: coin.exchange,
                quoteType: "CRYPTOCURRENCY",
              }))
            setSearchResults(fallback)
          }
        } catch {
          const q = query.trim().toLowerCase()
          const fallback = coins
            .filter((coin) => coin.symbol.toLowerCase().includes(q) || coin.name.toLowerCase().includes(q))
            .slice(0, 10)
            .map((coin) => ({
              symbol: coin.symbol,
              name: coin.name,
              exchange: coin.exchange,
              quoteType: "CRYPTOCURRENCY",
            }))
          setSearchResults(fallback)
        } finally {
          setSearchLoading(false)
        }
      }, 400)
      return () => clearTimeout(debounce)
    }

    setSearchResults(null)
    setStart(0)
    fetchList(0, true)
  }, [query, fetchList, token])

  const handleCoinSelect = useCallback((coin: CryptoRow) => {
    setSelectedCoin(coin)
    setSearchResults(null)
    setQuery("")
  }, [])

  const handleSelectCoinSymbol = useCallback(
    async (symbol: string) => {
      const normalized = symbol.toUpperCase()
      const existing = coins.find((coin) => coin.symbol.toUpperCase() === normalized)
      if (existing) {
        handleCoinSelect(existing)
        return
      }

      try {
        const quotesData = await apiClient.get<CryptoRow[]>(`/market/crypto/quote?symbols=${encodeURIComponent(symbol)}`, { token })
        const selected = quotesData.find((q) => q.symbol.toUpperCase() === normalized) ?? quotesData[0]
        if (selected) handleCoinSelect(selected)
      } catch {
        // Ignore selection failures and keep the current list visible.
      }
    },
    [coins, handleCoinSelect, token],
  )

  const sortedCoins = useMemo(() => {
    let arr = [...coins]
    if (filter === "gainers") {
      arr.sort((a, b) => (b.change_percent || 0) - (a.change_percent || 0))
    } else if (filter === "losers") {
      arr.sort((a, b) => (a.change_percent || 0) - (b.change_percent || 0))
    }
    return arr
  }, [coins, filter])

  const handleLoadMore = () => { 
      const nextStart = start + PAGE_SIZE
      setStart(nextStart)
      fetchList(nextStart, false) 
  }

  return (
    <section className="market-page">
      <div className="dashboard__header">
        <div>
          <p className="eyebrow">{language === "mk" ? "пазар" : "market"}</p>
          <h1 className="hero-title">{language === "mk" ? "Крипто Пазар" : "Crypto Market"}</h1>
        </div>
        <div className="dashboard__badge">
          <span>Yahoo Finance Data</span>
        </div>
      </div>

      <div className="market-controls">
        <div className="market-search-wrap" style={{ position: "relative" }}>
          <Search size={15} className="market-search-icon" />
          <input className="input market-search" placeholder={language === "mk" ? "Барај по симбол..." : "Search by symbol..."} value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <button className="market-clear-btn" onClick={() => { setQuery(""); setSearchResults(null) }}><X size={13} /></button>}

          {searchResults !== null && query.trim() && (
            <div className="market-search-dropdown">
              {searchLoading ? (
                <div style={{ padding: "0.75rem", textAlign: "center", color: "var(--muted)" }}>Searching&hellip;</div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: "0.75rem", textAlign: "center", color: "var(--muted)" }}>No results</div>
              ) : (
                searchResults.map((result) => (
                  <button type="button" key={`${result.symbol}-${result.exchange}`} className="market-search-result" onClick={() => void handleSelectCoinSymbol(result.symbol)}>
                    <strong>{result.symbol}</strong>
                    <span>{result.name}</span>
                    <span className="eyebrow">{result.exchange}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="market-row-filters">
        <div className="market-chips">
          <button className={`market-chip ${filter === "all" ? "market-chip--active" : ""}`} onClick={() => setFilter("all")}>
            {language === "mk" ? "Сите" : "All"}
          </button>
          <button className={`market-chip ${filter === "gainers" ? "market-chip--active" : ""}`} onClick={() => setFilter("gainers")}>
            {language === "mk" ? "Добивки" : "Top Gainers"}
          </button>
          <button className={`market-chip ${filter === "losers" ? "market-chip--active" : ""}`} onClick={() => setFilter("losers")}>
            {language === "mk" ? "Загуби" : "Top Losers"}
          </button>
        </div>
      </div>

      <div className="panel market-table-panel">
        {loading && coins.length === 0 ? (
          <div className="page-centered" style={{ minHeight: 300 }}><div className="loader" /><p>{language === "mk" ? "Се вчитуваат податоци..." : "Loading data…"}</p></div>
        ) : error ? (
          <div className="page-centered" style={{ minHeight: 200 }}>
            <p style={{ color: "var(--negative)" }}>{error}</p>
            <button className="primary-button" onClick={() => fetchList(start, true)}>{language === "mk" ? "Обиди повторно" : "Retry"}</button>
          </div>
        ) : coins.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem 0" }}>{language === "mk" ? "Нема резултати." : "No results."}</p>
        ) : (
          <>
            <div className="market-table-wrap">
              <table className="table market-table">
                <thead>
                  <tr>
                    <th>{language === "mk" ? "Монета" : "Coin"}</th>
                    <th className="amount-header">{language === "mk" ? "Цена" : "Price"}</th>
                    <th className="amount-header">{language === "mk" ? "Промена" : "Change"}</th>
                    <th className="amount-header hide-sm">{language === "mk" ? "Пазарна кап." : "Market Cap"}</th>
                    <th className="amount-header hide-sm">{language === "mk" ? "Волумен" : "Volume"}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCoins.map((coin, idx) => {
                    const isUp = (coin.change_percent ?? 0) >= 0
                    return (
                      <tr key={`${coin.symbol}-${idx}`} className="market-row" onClick={() => void handleSelectCoinSymbol(coin.symbol)}>
                        <td>
                          <div className="coin-name-cell">
                            {coin.image ? <img src={coin.image} alt={coin.name} className="coin-icon" width={24} height={24} /> : <div className="coin-icon" style={{width: 24, height: 24, background: 'var(--border)', borderRadius: '50%'}}></div>}
                            <div>
                              <span className="coin-name">{coin.name || coin.symbol}</span>
                              <span className="coin-sym">{coin.symbol}</span>
                            </div>
                          </div>
                        </td>
                        <td className="amount-cell">{fmtPrice(coin.price)}</td>
                        <td className={`amount-cell ${isUp ? "market-up" : "market-down"}`}>
                          {isUp ? <TrendingUp size={12} className="inline-icon" /> : <TrendingDown size={12} className="inline-icon" />}
                          {coin.change_percent !== null ? `${Math.abs(coin.change_percent).toFixed(2)}%` : "—"}
                        </td>
                        <td className="amount-cell hide-sm">{fmtMillions(coin.market_cap)}</td>
                        <td className="amount-cell hide-sm">{fmtMillions(coin.volume)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {hasMore && !query.trim() && (
              <div className="market-load-more">
                <button className="primary-button" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? (language === "mk" ? "Се вчитува..." : "Loading…") : (language === "mk" ? "Вчитај повеќе" : `Load ${PAGE_SIZE} more`)}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedCoin && <CryptoChartModal coin={selectedCoin} onClose={() => setSelectedCoin(null)} />}
    </section>
  )
}
