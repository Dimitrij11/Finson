import { useState, useRef, useEffect, useMemo } from "react"
import type { FormEvent } from "react"
import { Trash2, ChevronDown } from "lucide-react"

import { useBudgets, useCreateBudget, useDeleteBudget } from "./hooks"
import { useLanguage } from "../../i18n"
import { useAuth } from "../../hooks/useAuth"
import { useSearch } from "../../context/SearchContext"
import { ExportActionMenu } from "../../components/ui/ExportActionMenu"
import { buildDateRangeFromRows, sumMinor, type ExportColumn } from "../../utils/exportManager"
import type { BudgetGoal } from "../../api/types"

export const BudgetsPage = () => {
  const { data, isLoading, isError } = useBudgets()
  const createBudget = useCreateBudget()
  const deleteBudget = useDeleteBudget()
  const { language, t } = useLanguage()
  const { user } = useAuth()
  const { searchTerm } = useSearch()
  const userCurrency = user?.currency || "EUR"
  const [listPeriodFilter, setListPeriodFilter] = useState<"all" | "monthly" | "weekly" | "yearly">("all")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  
  const handleDelete = (id: number) => {
    if (window.confirm(t("confirmDelete"))) {
      deleteBudget.mutate(id)
    }
  }
  
  type BudgetFormState = {
    category: string
    limit_amount: string
    period: "monthly" | "weekly" | "yearly"
    starts_on: string
  }

  const [formState, setFormState] = useState<BudgetFormState>({
    category: "",
    limit_amount: "",
    period: "monthly",
    starts_on: new Date().toISOString().slice(0, 10),
  })

  const [error, setError] = useState<string | null>(null)

  // Custom dropdown state
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false)
  const periodDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) {
        setShowPeriodDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const PERIOD_COLORS: Record<string, string> = {
    monthly: "#6366f1",
    weekly: "#06b6d4",
    yearly: "#f59e0b",
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    try {
      await createBudget.mutateAsync({
        ...formState,
        limit_amount: formState.limit_amount,
      })
      setFormState((prev) => ({ ...prev, category: "", limit_amount: "" }))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createFailed"))
    }
  }

  const filteredBudgets = useMemo(() => {
    const source = data ?? []
    const globalSearch = searchTerm.trim().toLowerCase()
    const categorySearch = categoryFilter.trim().toLowerCase()

    return source.filter((budget) => {
      if (listPeriodFilter !== "all" && budget.period !== listPeriodFilter) return false
      if (dateFilter && budget.starts_on !== dateFilter) return false

      const matchesGlobal = !globalSearch || [budget.category, budget.period, budget.starts_on, budget.limit_amount]
        .join(" ")
        .toLowerCase()
        .includes(globalSearch)

      if (!matchesGlobal) return false

      if (categorySearch && !budget.category.toLowerCase().includes(categorySearch)) return false

      return true
    })
  }, [data, searchTerm, categoryFilter, dateFilter, listPeriodFilter])

  useEffect(() => {
    const visibleIds = new Set(filteredBudgets.map((item) => item.id))
    setSelectedIds((prev) => {
      const next = new Set<number>()
      prev.forEach((id) => {
        if (visibleIds.has(id)) next.add(id)
      })
      return next
    })
  }, [filteredBudgets])

  const columns: ExportColumn<BudgetGoal>[] = [
    { id: "category", label: "Category", kind: "text", value: (b) => b.category },
    { id: "limit", label: "Limit", kind: "currency", value: (b) => b.limit_amount },
    { id: "period", label: "Period", kind: "text", value: (b) => b.period },
    { id: "startDate", label: "Start Date", kind: "date", value: (b) => b.starts_on },
  ]

  const selectedRows = useMemo(() => filteredBudgets.filter((item) => selectedIds.has(item.id)), [filteredBudgets, selectedIds])
  const dateRangeLabel = useMemo(() => buildDateRangeFromRows(filteredBudgets.map((item) => item.starts_on)), [filteredBudgets])

  const exportConfig = useMemo(
    () => ({
      type: "Budgets",
      rows: filteredBudgets,
      columns,
      dateRangeLabel,
      locale: language === "mk" ? "mk-MK" : "en-US",
      filters: {
        date: dateFilter || undefined,
        category: categoryFilter || undefined,
        search: searchTerm || undefined,
      },
      summary: {
        currency: userCurrency,
        totalIncomeMinor: 0n,
        totalExpenseMinor: sumMinor(filteredBudgets.map((b) => b.limit_amount)),
      },
    }),
    [filteredBudgets, columns, dateRangeLabel, language, dateFilter, categoryFilter, searchTerm, userCurrency],
  )

  const exportSelectedConfig = useMemo(
    () => ({
      ...exportConfig,
      rows: selectedRows,
      dateRangeLabel: buildDateRangeFromRows(selectedRows.map((item) => item.starts_on)),
      summary: {
        currency: userCurrency,
        totalIncomeMinor: 0n,
        totalExpenseMinor: sumMinor(selectedRows.map((b) => b.limit_amount)),
      },
    }),
    [exportConfig, selectedRows, userCurrency],
  )

  const allVisibleSelected = filteredBudgets.length > 0 && filteredBudgets.every((item) => selectedIds.has(item.id))

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const everySelected = filteredBudgets.every((item) => next.has(item.id))
      if (everySelected) {
        filteredBudgets.forEach((item) => next.delete(item.id))
      } else {
        filteredBudgets.forEach((item) => next.add(item.id))
      }
      return next
    })
  }

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <section>
      <h2 className="section-title">{t("newBudget")}</h2>

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <input
          className="input"
          placeholder={t("category")}
          value={formState.category}
          onChange={(e) => setFormState((prev) => ({ ...prev, category: e.target.value }))}
          required
        />

        <input
          className="input"
          type="number"
          step="0.01"
          placeholder={t("limit")}
          value={formState.limit_amount}
          onChange={(e) => setFormState((prev) => ({ ...prev, limit_amount: e.target.value }))}
          required
        />

        <div className="custom-dropdown" ref={periodDropdownRef}>
          <button
            type="button"
            className="custom-dropdown__trigger"
            onClick={() => setShowPeriodDropdown((v) => !v)}
          >
            <span className="custom-dropdown__dot" style={{ background: PERIOD_COLORS[formState.period] }} />
            <span className="custom-dropdown__text">{t(formState.period)}</span>
            <ChevronDown size={14} className={`custom-dropdown__chevron${showPeriodDropdown ? " custom-dropdown__chevron--open" : ""}`} />
          </button>
          {showPeriodDropdown && (
            <div className="custom-dropdown__menu">
              {(["monthly", "weekly", "yearly"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`custom-dropdown__item${formState.period === p ? " custom-dropdown__item--active" : ""}`}
                  onClick={() => { setFormState((prev) => ({ ...prev, period: p })); setShowPeriodDropdown(false) }}
                >
                  <span className="custom-dropdown__dot" style={{ background: PERIOD_COLORS[p] }} />
                  <span>{t(p)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          className="input"
          type="date"
          value={formState.starts_on}
          onChange={(e) => setFormState((prev) => ({ ...prev, starts_on: e.target.value }))}
        />

        {error && <p className="auth-error">{error}</p>}

        <button className="primary-button" disabled={createBudget.isPending}>
          {createBudget.isPending ? t("saving") : t("saveBudget")}
        </button>
      </form>

      <div className="dashboard__split">
        <div className="panel">
          <h3 className="panel__title">{t("activeBudgets")}</h3>
          <div className="panel__toolbar budget-toolbar">
            <div className="budget-filters">
              <input
                className="input"
                placeholder="Category filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
              <input
                className="input"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
              <select
                className="input"
                value={listPeriodFilter}
                onChange={(e) => setListPeriodFilter(e.target.value as "all" | "monthly" | "weekly" | "yearly")}
              >
                <option value="all">All periods</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <ExportActionMenu
              config={exportConfig}
              hasSelected={selectedRows.length > 0}
              selectedConfig={exportSelectedConfig}
            />
          </div>

          {isLoading ? (
            <div className="page-centered">
              <div className="loader" />
            </div>
          ) : isError ? (
            <p>{language === "mk" ? "Не можеме да ги прикажеме буџетите." : "Cannot display budgets."}</p>
          ) : filteredBudgets.length === 0 ? (
            <p className="no-results">{searchTerm ? `No matching budgets for "${searchTerm}"` : "No budgets match the selected filters."}</p>
          ) : (
            <div className="table-responsive"><table className="table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      className="row-selector"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all filtered budgets"
                    />
                  </th>
                  <th>{t("category")}</th>
                  <th>{t("limit")}</th>
                  <th>{t("period")}</th>
                  <th>{t("startDate")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBudgets.map((budget) => (
                  <tr key={budget.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="row-selector"
                        checked={selectedIds.has(budget.id)}
                        onChange={() => toggleSelection(budget.id)}
                        aria-label={`Select budget ${budget.id}`}
                      />
                    </td>
                    <td>{budget.category}</td>
                    <td>
                      {new Intl.NumberFormat(language === "mk" ? "mk-MK" : "en-US", { style: "currency", currency: userCurrency }).format(Number(budget.limit_amount))}
                    </td>
                    <td>
                      {budget.period === "monthly"
                        ? t("monthly")
                        : budget.period === "weekly"
                        ? t("weekly")
                        : t("yearly")}
                    </td>
                    <td>{budget.starts_on}</td>
                    <td>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(budget.id)}
                        disabled={deleteBudget.isPending}
                        title={t("deleteBudget")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>

        {/* <div className="panel">
          <h3 className="panel__title">
            {language === "mk" ? "Предлог акции" : "Suggested Actions"}
          </h3>

          <ul>
            <li>
              → {language === "mk"
                ? "Преуреди лимит за „Забава“ (30% над просек)."
                : 'Adjust "Entertainment" limit (30% above average).'}
            </li>

            <li>
              → {language === "mk"
                ? "Активирај автоматско известување при 80% искористеност."
                : "Enable automatic notification at 80% usage."}
            </li>

            <li>
              → {language === "mk"
                ? "Додади буџет за „Патувања“ за март."
                : 'Add a "Travel" budget for March.'}
            </li>
          </ul>
        </div> */}
      </div>
    </section>
  )
}
