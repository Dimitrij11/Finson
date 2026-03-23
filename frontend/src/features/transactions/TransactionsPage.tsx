import { useState, useMemo, useEffect, useRef } from "react"
import type { FormEvent } from "react"
import { Trash2, Pencil, X, ChevronDown } from "lucide-react"
import { createPortal } from "react-dom"

import { useCreateTransaction, useTransactions, useDeleteTransaction, useUpdateTransaction } from "./hooks"
import { useSearch } from "../../context/SearchContext"
import { useLanguage } from "../../i18n"
import { useAuth } from "../../hooks/useAuth"
import type { Transaction } from "../../api/types"
import { ExportActionMenu } from "../../components/ui/ExportActionMenu"
import { buildDateRangeFromRows, sumMinor, toMinorUnits, type ExportColumn } from "../../utils/exportManager"

// Format date based on language
const formatDate = (dateString: string, lang: string): string => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return lang === "mk" ? `${day}.${month}.${year}` : `${month}/${day}/${year}`
}

// Title Case helper for categories
const toTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export const TransactionsPage = () => {
  const { data, isLoading, isError } = useTransactions()
  const createMutation = useCreateTransaction()
  const deleteMutation = useDeleteTransaction()
  const updateMutation = useUpdateTransaction()
  const { searchTerm } = useSearch()
  const { language, t } = useLanguage()
  const { user } = useAuth()
  const userCurrency = user?.currency || "EUR"
  const isEmailVerified = Boolean(user?.is_email_verified)

  // Transactions period state
  const [transactionsPeriod, setTransactionsPeriod] =
    useState<"day" | "month" | "year" | "all">("month")

  // Function to check if transaction is in selected period
  const isWithinPeriod = (
    occurredAt: string,
    period: "day" | "month" | "year" | "all"
  ): boolean => {
    if (period === "all") return true

    const txDate = new Date(occurredAt)
    const now = new Date()

    if (period === "day") {
      return (
        txDate.getFullYear() === now.getFullYear() &&
        txDate.getMonth() === now.getMonth() &&
        txDate.getDate() === now.getDate()
      )
    }

    if (period === "month") {
      return (
        txDate.getFullYear() === now.getFullYear() &&
        txDate.getMonth() === now.getMonth()
      )
    }

    if (period === "year") {
      return txDate.getFullYear() === now.getFullYear()
    }

    return true
  }

  // Filtered transactions using period + search term
  const filteredData = useMemo(() => {
    if (!data) return data

    return data.filter((tx) => {
      const matchesPeriod = isWithinPeriod(tx.occurred_at, transactionsPeriod)
      if (!matchesPeriod) return false

      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      return (
        tx.category.toLowerCase().includes(term) ||
        tx.note?.toLowerCase().includes(term) ||
        tx.amount.toString().includes(term) ||
        formatDate(tx.occurred_at, language).includes(term)
      )
    })
  }, [data, searchTerm, language, transactionsPeriod])

  // Edit modal state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editFormState, setEditFormState] = useState({
    category: "",
    amount: "",
    transaction_type: "expense" as "income" | "expense",
    occurred_at: "",
    note: "",
  })

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (editingTransaction) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [editingTransaction])

  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx)
    setEditFormState({
      category: tx.category,
      amount: String(tx.amount),
      transaction_type: tx.transaction_type,
      occurred_at: tx.occurred_at.slice(0, 10),
      note: tx.note || "",
    })
  }

  const closeEditModal = () => {
    setEditingTransaction(null)
  }

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingTransaction) return
    try {
      await updateMutation.mutateAsync({
        id: editingTransaction.id,
        category: toTitleCase(editFormState.category.trim()),
        amount: editFormState.amount,
        transaction_type: editFormState.transaction_type,
        occurred_at: new Date(editFormState.occurred_at + "T12:00:00").toISOString(),
        note: editFormState.note || undefined,
      })
      closeEditModal()
    } catch (err) {
      console.error("Failed to update transaction:", err)
    }
  }

  const handleDelete = (id: number) => {
    if (window.confirm(t("confirmDelete"))) {
      deleteMutation.mutate(id)
    }
  }

  // const filteredData = useMemo(() => {
  //   if (!data || !searchTerm.trim()) return data
  //   const term = searchTerm.toLowerCase()
  //   return data.filter(
  //     (tx) =>
  //       tx.category.toLowerCase().includes(term) ||
  //       tx.note?.toLowerCase().includes(term) ||
  //       tx.amount.toString().includes(term) ||
  //       formatDate(tx.occurred_at, language).includes(term)
  //   )
  // }, [data, searchTerm, language])

  type TransactionFormState = {
    category: string
    amount: string
    transaction_type: "income" | "expense"
    occurred_at: string
    note: string
  }
  const [formState, setFormState] = useState<TransactionFormState>({
    category: "",
    amount: "",
    transaction_type: "expense",
    occurred_at: new Date().toISOString().slice(0, 10),
    note: "",
  })
  const [error, setError] = useState<string | null>(null)

  // Custom dropdown state for create form
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const typeDropdownRef = useRef<HTMLDivElement>(null)

  // Custom dropdown state for edit form
  const [showEditTypeDropdown, setShowEditTypeDropdown] = useState(false)
  const editTypeDropdownRef = useRef<HTMLDivElement>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setShowTypeDropdown(false)
      }
      if (editTypeDropdownRef.current && !editTypeDropdownRef.current.contains(e.target as Node)) {
        setShowEditTypeDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const TYPE_COLORS: Record<string, string> = {
    income: "#22c55e",
    expense: "#ef4444",
  }

  useEffect(() => {
    if (!filteredData) return
    const visibleIds = new Set(filteredData.map((tx) => tx.id))
    setSelectedIds((prev) => {
      const next = new Set<number>()
      prev.forEach((id) => {
        if (visibleIds.has(id)) next.add(id)
      })
      return next
    })
  }, [filteredData])

  const columns: ExportColumn<Transaction>[] = [
    { id: "category", label: "Category", kind: "text", value: (tx) => toTitleCase(tx.category) },
    { id: "type", label: "Type", kind: "text", value: (tx) => tx.transaction_type },
    { id: "amount", label: "Amount", kind: "currency", value: (tx) => Number(toMinorUnits(tx.amount)) / 10000 },
    { id: "currency", label: "Currency", kind: "text", value: (tx) => tx.currency },
    { id: "date", label: "Date", kind: "date", value: (tx) => tx.occurred_at },
    { id: "note", label: "Note", kind: "text", value: (tx) => tx.note ?? "" },
  ]

  const selectedRows = useMemo(() => {
    if (!filteredData) return []
    return filteredData.filter((tx) => selectedIds.has(tx.id))
  }, [filteredData, selectedIds])

  const totalIncomeMinor = useMemo(
    () => sumMinor((filteredData ?? []).filter((tx) => tx.transaction_type === "income").map((tx) => tx.amount)),
    [filteredData],
  )

  const totalExpenseMinor = useMemo(
    () => sumMinor((filteredData ?? []).filter((tx) => tx.transaction_type === "expense").map((tx) => tx.amount)),
    [filteredData],
  )

  const dateRangeLabel = useMemo(
    () => buildDateRangeFromRows((filteredData ?? []).map((tx) => tx.occurred_at)),
    [filteredData],
  )

  const exportConfig = useMemo(
    () => ({
      type: "Transactions",
      rows: filteredData ?? [],
      columns,
      dateRangeLabel,
      locale: language === "mk" ? "mk-MK" : "en-US",
      filters: {
        date: transactionsPeriod,
        search: searchTerm || undefined,
      },
      summary: {
        currency: userCurrency,
        totalIncomeMinor,
        totalExpenseMinor,
      },
    }),
    [filteredData, columns, dateRangeLabel, language, transactionsPeriod, searchTerm, userCurrency, totalIncomeMinor, totalExpenseMinor],
  )

  const exportSelectedConfig = useMemo(
    () => ({
      ...exportConfig,
      rows: selectedRows,
      dateRangeLabel: buildDateRangeFromRows(selectedRows.map((tx) => tx.occurred_at)),
      summary: {
        currency: userCurrency,
        totalIncomeMinor: sumMinor(selectedRows.filter((tx) => tx.transaction_type === "income").map((tx) => tx.amount)),
        totalExpenseMinor: sumMinor(selectedRows.filter((tx) => tx.transaction_type === "expense").map((tx) => tx.amount)),
      },
    }),
    [exportConfig, selectedRows, userCurrency],
  )

  const allVisibleSelected = Boolean(filteredData?.length) && (filteredData?.every((tx) => selectedIds.has(tx.id)) ?? false)

  const toggleSelectAll = () => {
    if (!filteredData) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const everySelected = filteredData.every((tx) => next.has(tx.id))
      if (everySelected) {
        filteredData.forEach((tx) => next.delete(tx.id))
      } else {
        filteredData.forEach((tx) => next.add(tx.id))
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isEmailVerified) {
      setError("Verify email to enable.")
      return
    }
    setError(null)
    try {
      await createMutation.mutateAsync({
        ...formState,
        category: toTitleCase(formState.category.trim()),
        amount: formState.amount,
        currency: userCurrency,
        occurred_at: new Date(formState.occurred_at + "T12:00:00").toISOString(),
      })
      setFormState((prev) => ({ ...prev, category: "", amount: "", note: "" }))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"))
    }
  }

  return (
    <section>
      <h2 className="section-title">{t("newTransaction")}</h2>
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
          placeholder={t("amount")}
          value={formState.amount}
          onChange={(e) => setFormState((prev) => ({ ...prev, amount: e.target.value }))}
          required
        />
        <div className="custom-dropdown" ref={typeDropdownRef}>
          <button
            type="button"
            className="custom-dropdown__trigger"
            onClick={() => setShowTypeDropdown((v) => !v)}
          >
            <span className="custom-dropdown__dot" style={{ background: TYPE_COLORS[formState.transaction_type] }} />
            <span className="custom-dropdown__text">{t(formState.transaction_type)}</span>
            <ChevronDown size={14} className={`custom-dropdown__chevron${showTypeDropdown ? " custom-dropdown__chevron--open" : ""}`} />
          </button>
          {showTypeDropdown && (
            <div className="custom-dropdown__menu">
              {(["income", "expense"] as const).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  className={`custom-dropdown__item${formState.transaction_type === tp ? " custom-dropdown__item--active" : ""}`}
                  onClick={() => { setFormState((prev) => ({ ...prev, transaction_type: tp })); setShowTypeDropdown(false) }}
                >
                  <span className="custom-dropdown__dot" style={{ background: TYPE_COLORS[tp] }} />
                  <span>{t(tp)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          className="input"
          type="date"
          value={formState.occurred_at}
          onChange={(e) => setFormState((prev) => ({ ...prev, occurred_at: e.target.value }))}
        />
        <input
          className="input"
          placeholder={t("note")}
          value={formState.note}
          onChange={(e) => setFormState((prev) => ({ ...prev, note: e.target.value }))}
        />
        {error && <p className="auth-error">{error}</p>}
        <div title={!isEmailVerified ? "Verify email to enable." : undefined}>
          <button className="primary-button" disabled={createMutation.isPending || !isEmailVerified}>
            {createMutation.isPending ? t("saving") : t("saveTransaction")}
          </button>
        </div>
      </form>
      <div className="dashboard__split">
        <div className="panel">
          <h3 className="panel__title">
            {t("history")}
            {searchTerm && <span className="search-indicator"> — {t("searchingFor")}: "{searchTerm}"</span>}
          </h3>
          <div className="panel__toolbar">
            <ExportActionMenu
              config={exportConfig}
              hasSelected={selectedRows.length > 0}
              selectedConfig={exportSelectedConfig}
            />
          </div>
          <div className="period-selector">
  <button
    className={`period-btn ${transactionsPeriod === "day" ? "period-btn--active" : ""}`}
    onClick={() => setTransactionsPeriod("day")}
  >
    {t("day")}
  </button>
    
  <button
    className={`period-btn ${transactionsPeriod === "month" ? "period-btn--active" : ""}`}
    onClick={() => setTransactionsPeriod("month")}
  >
    {t("month")}
  </button>

  <button
    className={`period-btn ${transactionsPeriod === "year" ? "period-btn--active" : ""}`}
    onClick={() => setTransactionsPeriod("year")}
  >
    {t("year")}
  </button>

  <button
    className={`period-btn ${transactionsPeriod === "all" ? "period-btn--active" : ""}`}
    onClick={() => setTransactionsPeriod("all")}
  >
    {t("all")}
  </button>
</div>
          {isLoading ? (
            <div className="page-centered">
              <div className="loader" />
            </div>
          ) : isError ? (
            <p>{t("cantShowTransactions")}</p>
          ) : filteredData && filteredData.length > 0 ? (
            <div className="table-responsive"><div className="table-responsive"><table className="table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      className="row-selector"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all filtered transactions"
                    />
                  </th>
                  <th>{t("category")}</th>
                  <th>{t("type")}</th>
                  <th className="amount-header">{t("amount")}</th>
                  <th>{t("date")}</th>
                  <th>{t("note")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="row-selector"
                        checked={selectedIds.has(tx.id)}
                        onChange={() => toggleSelection(tx.id)}
                        aria-label={`Select transaction ${tx.id}`}
                      />
                    </td>
                    <td>{toTitleCase(tx.category)}</td>
                    <td>
                      <span className={tx.transaction_type === "income" ? "badge badge--income" : "badge badge--expense"}>
                        {tx.transaction_type === "income" ? t("income") : t("expense")}
                      </span>
                    </td>
                    <td className="amount-cell">
                      {Number(tx.amount).toFixed(2)} {tx.currency}
                    </td>
                    <td>{formatDate(tx.occurred_at, language)}</td>
                    <td>{tx.note ?? "-"}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="edit-button"
                          onClick={() => openEditModal(tx)}
                          title={t("edit")}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => handleDelete(tx.id)}
                          disabled={deleteMutation.isPending}
                          title={t("deleteTransaction")}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div></div>
          ) : (
            <p className="no-results">
              {searchTerm ? `${t("noResults")} "${searchTerm}"` : t("noTransactions")}
            </p>
          )}
        </div>
        <div className="panel">
          <h3 className="panel__title">{t("quickInsight")}</h3>
          <ul className="insight-list">
            <li className="insight-list__item">
              <span>{t("totalExpenses")}</span>
              <strong>
                {new Intl.NumberFormat(language === "mk" ? "mk-MK" : "en-US", { style: "currency", currency: userCurrency }).format(
                  filteredData
                    ?.filter((tx) => tx.transaction_type === "expense")
                    .reduce((acc, tx) => acc + Number(tx.amount), 0) ?? 0
                )}
              </strong>
            </li>
            <li className="insight-list__item">
  <span>{t("mostFrequentCategory")}</span>
  <strong>
    {(() => {
      if (!filteredData || filteredData.length === 0) return "—"

      // Count how many times each category appears
      const counts: Record<string, number> = {}
      filteredData.forEach((tx) => {
        const category = tx.category
        counts[category] = (counts[category] || 0) + 1
      })

      // Find the category with the highest count
      let mostFrequent = ""
      let maxCount = 0
      for (const [category, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count
          mostFrequent = category
        }
      }

      return mostFrequent ? `${mostFrequent} (${maxCount})` : "—"
    })()}
  </strong>
</li>
            <li className="insight-list__item">
              <span>{t("lastTransaction")}</span>
              <strong>
                {(() => {
                  if (!filteredData || filteredData.length === 0) return "—"
                  // Find the most recent transaction by date
                  const mostRecent = filteredData.reduce((latest, tx) => {
                    return new Date(tx.occurred_at) > new Date(latest.occurred_at) ? tx : latest
                  })
                  return formatDate(mostRecent.occurred_at, language)
                })()}
              </strong>
            </li>
          </ul>
        </div>
      </div>

      {/* Edit Transaction Modal (portal to document.body) */}
      {editingTransaction &&
        createPortal(
          <div className="modal-overlay" onClick={closeEditModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal__header">
                <h3>{t("editTransaction")}</h3>
                <button className="modal__close" onClick={closeEditModal}>
                  <X size={20} />
                </button>
              </div>
              <form className="modal__form" onSubmit={handleEditSubmit}>
                <div className="input-group">
                  <label>{t("category")}</label>
                  <input
                    className="input"
                    value={editFormState.category}
                    onChange={(e) => setEditFormState((prev) => ({ ...prev, category: e.target.value }))}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>{t("amount")}</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={editFormState.amount}
                    onChange={(e) => setEditFormState((prev) => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>{t("type")}</label>
                  <div className="custom-dropdown" ref={editTypeDropdownRef}>
                    <button
                      type="button"
                      className="custom-dropdown__trigger"
                      onClick={() => setShowEditTypeDropdown((v) => !v)}
                    >
                      <span className="custom-dropdown__dot" style={{ background: TYPE_COLORS[editFormState.transaction_type] }} />
                      <span className="custom-dropdown__text">{t(editFormState.transaction_type)}</span>
                      <ChevronDown size={14} className={`custom-dropdown__chevron${showEditTypeDropdown ? " custom-dropdown__chevron--open" : ""}`} />
                    </button>
                    {showEditTypeDropdown && (
                      <div className="custom-dropdown__menu">
                        {(["income", "expense"] as const).map((tp) => (
                          <button
                            key={tp}
                            type="button"
                            className={`custom-dropdown__item${editFormState.transaction_type === tp ? " custom-dropdown__item--active" : ""}`}
                            onClick={() => { setEditFormState((prev) => ({ ...prev, transaction_type: tp })); setShowEditTypeDropdown(false) }}
                          >
                            <span className="custom-dropdown__dot" style={{ background: TYPE_COLORS[tp] }} />
                            <span>{t(tp)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="input-group">
                  <label>{t("date")}</label>
                  <input
                    className="input"
                    type="date"
                    value={editFormState.occurred_at}
                    onChange={(e) => setEditFormState((prev) => ({ ...prev, occurred_at: e.target.value }))}
                  />
                </div>
                <div className="input-group">
                  <label>{t("note")}</label>
                  <input
                    className="input"
                    value={editFormState.note}
                    onChange={(e) => setEditFormState((prev) => ({ ...prev, note: e.target.value }))}
                  />
                </div>
                <div className="modal__actions">
                  <button type="button" className="secondary-button" onClick={closeEditModal}>
                    {t("cancel")}
                  </button>
                  <button type="submit" className="primary-button" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? t("saving") : t("save")}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </section>
  )
}
