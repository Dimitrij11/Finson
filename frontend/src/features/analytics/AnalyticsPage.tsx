import { useState, useMemo } from "react"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts"
import { useTranslation } from "react-i18next"

import { useTransactions } from "../transactions/hooks"
import { useAuth } from "../../hooks/useAuth"

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"]

// Investment Calculator Component
const InvestmentCalculator = () => {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const language = i18n.resolvedLanguage ?? i18n.language ?? "en"
  const userCurrency = user?.currency || "EUR"

  const investmentTypes = [
    { id: "stocks", name: t("stocksSP500"), avgReturn: 10 },
    { id: "bonds", name: t("bonds"), avgReturn: 5 },
    { id: "etf", name: t("etfFunds"), avgReturn: 8 },
    { id: "crypto", name: t("cryptocurrency"), avgReturn: 15 },
    { id: "savings", name: t("savingsAccount"), avgReturn: 2 },
    { id: "realestate", name: t("realEstateREITs"), avgReturn: 7 },
    { id: "custom", name: t("custom"), avgReturn: 7 },
  ]

  const [selectedType, setSelectedType] = useState("stocks")
  const [investment, setInvestment] = useState({
    initialAmount: "10000",
    monthlyContribution: "10000",
    annualReturn: "10",
    years: "10",
  })

  const handleTypeChange = (typeId: string) => {
    setSelectedType(typeId)
    const type = investmentTypes.find(t => t.id === typeId)
    if (type && typeId !== "custom") {
      setInvestment(prev => ({ ...prev, annualReturn: String(type.avgReturn) }))
    }
  }

  const calculateInvestment = useMemo(() => {
    const initial = parseFloat(investment.initialAmount) || 0
    const monthly = parseFloat(investment.monthlyContribution) || 0
    const rate = (parseFloat(investment.annualReturn) || 0) / 100
    const years = parseInt(investment.years) || 0

    const monthlyRate = rate / 12

    const projections = []
    let balance = initial

    for (let year = 0; year <= years; year++) {
      if (year === 0) {
        projections.push({
          year: t("yearLabel", { year }),
          balance: initial,
          contributions: initial,
          earnings: 0,
        })
      } else {
        for (let m = 0; m < 12; m++) {
          balance = balance * (1 + monthlyRate) + monthly
        }
        const totalContributions = initial + monthly * 12 * year
        projections.push({
          year: t("yearLabel", { year }),
          balance: Math.round(balance),
          contributions: Math.round(totalContributions),
          earnings: Math.round(balance - totalContributions),
        })
      }
    }

    return projections
  }, [investment, t])

  const finalBalance = calculateInvestment[calculateInvestment.length - 1]?.balance || 0
  const totalContributions = calculateInvestment[calculateInvestment.length - 1]?.contributions || 0
  const totalEarnings = finalBalance - totalContributions

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(language.startsWith("mk") ? "mk-MK" : "en-US", {
      style: "currency",
      currency: userCurrency,
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <div className="panel investment-calculator">
      <h3 className="panel__title">
         {t("investmentCalculator")}
      </h3>
      <p className="panel__subtitle">
        {t("calculateGrowth")}
      </p>

      {/* Investment Type Selector */}
      <div className="input-group" style={{ marginBottom: "1rem" }}>
        <label>{t("investmentType")}</label>
        <select
          className="input"
          value={selectedType}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          {investmentTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name} {type.id !== "custom" ? `(${type.avgReturn}% ${t("annually")})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Info box about selected investment */}
      <div className="investment-info">
        <span className="investment-info__icon"></span>
        <p>
          {t(`${selectedType}Info`)}
        </p>
      </div>

      <div className="investment-form">
        <div className="input-group">
          <label>{t("initialAmount")}</label>
          <input
            type="number"
            className="input"
            value={investment.initialAmount}
            onChange={(e) => setInvestment({ ...investment, initialAmount: e.target.value })}
          />
        </div>
        <div className="input-group">
          <label>{t("monthlyContribution")}</label>
          <input
            type="number"
            className="input"
            value={investment.monthlyContribution}
            onChange={(e) => setInvestment({ ...investment, monthlyContribution: e.target.value })}
          />
        </div>
        <div className="input-group">
          <label>{t("annualReturn")}</label>
          <input
            type="number"
            className="input"
            value={investment.annualReturn}
            onChange={(e) => setInvestment({ ...investment, annualReturn: e.target.value })}
          />
        </div>
        <div className="input-group">
          <label>{t("periodYears")}</label>
          <input
            type="number"
            className="input"
            value={investment.years}
            onChange={(e) => setInvestment({ ...investment, years: e.target.value })}
          />
        </div>
      </div>

      <div className="investment-results">
        <div className="result-card">
          <span>{t("finalBalance")}</span>
          <strong className="result-value result-value--primary">{formatCurrency(finalBalance)}</strong>
        </div>
        <div className="result-card">
          <span>{t("totalContributions")}</span>
          <strong className="result-value">{formatCurrency(totalContributions)}</strong>
        </div>
        <div className="result-card">
          <span>{t("earnings")}</span>
          <strong className="result-value result-value--success">{formatCurrency(totalEarnings)}</strong>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={calculateInvestment}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 12 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              labelStyle={{ color: "#f1f5f9", fontWeight: "bold", marginBottom: "8px" }}
              itemStyle={{ color: "#f1f5f9" }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="contributions"
              stackId="1"
              stroke="#6366f1"
              fill="#6366f1"
              name={t("totalContributions")}
            />
            <Area
              type="monotone"
              dataKey="earnings"
              stackId="1"
              stroke="#22c55e"
              fill="#22c55e"
              name={t("earnings")}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Savings Goals Component
const SavingsGoals = () => {
  const { t } = useTranslation()

  // TODO: Replace with actual savings goals from API when implemented
  const goals: { id: number; name: string; target: number; current: number }[] = []

  return (
    <div className="panel savings-goals">
      <h3 className="panel__title">
        🎯 {t("savingsGoals")}
      </h3>
      <p className="panel__subtitle">
        {t("trackProgress")}
      </p>

      {goals.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon"></span>
          <p className="empty-state__text">
            {t("savingsGoalsComingSoon")}
          </p>
        </div>
      ) : (
        <div className="goals-list">
          {goals.map((goal) => {
            const progress = (goal.current / goal.target) * 100
            return (
              <div key={goal.id} className="goal-item">
                <div className="goal-header">
                  <span className="goal-name">{goal.name}</span>
                  <span className="goal-amount">
                    {goal.current} / {goal.target}
                  </span>
                </div>
                <div className="goal-progress-bar">
                  <div
                    className="goal-progress-fill"
                    style={{
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: progress >= 100 ? "#22c55e" : "#6366f1",
                    }}
                  />
                </div>
                <span className="goal-percentage">{progress.toFixed(0)}%</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const AnalyticsPage = () => {
  const { data: transactions, isLoading } = useTransactions()
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language ?? "en"
  const { user } = useAuth()
  const userCurrency = user?.currency || "EUR"
  const [savingsPeriod, setSavingsPeriod] = useState<"day" | "month" | "year" | "all">("day")
  const [categoryPeriod, setCategoryPeriod] = useState<"day" | "month" | "year" | "all">("month")

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(language.startsWith("mk") ? "mk-MK" : "en-US", {
      style: "currency",
      currency: userCurrency,
    }).format(value)

  // Calculate spending by category
  const categoryData = useMemo(() => {
    if (!transactions) return []

    const now = new Date()
    let filteredTransactions = transactions

    if (categoryPeriod === "day") {
      // Today only
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      filteredTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.occurred_at)
        return txDate >= today && txDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
      })
    } else if (categoryPeriod === "month") {
      // Current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      filteredTransactions = transactions.filter(tx => new Date(tx.occurred_at) >= startOfMonth)
    } else if (categoryPeriod === "year") {
      // Current year
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      filteredTransactions = transactions.filter(tx => new Date(tx.occurred_at) >= startOfYear)
    }
    // For "all", use all transactions (no filtering)

    const expenses = filteredTransactions.filter((tx) => tx.transaction_type === "expense")
    const categoryTotals: Record<string, number> = {}

    expenses.forEach((tx) => {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + Number(tx.amount)
    })

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [transactions, categoryPeriod])

  // Calculate monthly income vs expenses
  const monthlyData = useMemo(() => {
    if (!transactions) return []

    const monthlyTotals: Record<string, { income: number; expense: number }> = {}

    transactions.forEach((tx) => {
      const date = new Date(tx.occurred_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = { income: 0, expense: 0 }
      }

      if (tx.transaction_type === "income") {
        monthlyTotals[monthKey].income += Number(tx.amount)
      } else {
        monthlyTotals[monthKey].expense += Number(tx.amount)
      }
    })

    return Object.entries(monthlyTotals)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, data]) => {
        const [, m] = month.split("-")
        return {
          month: new Intl.DateTimeFormat(language, { month: "short" }).format(
            new Date(2026, parseInt(m, 10) - 1, 1)
          ),
          income: data.income,
          expense: data.expense,
          savings: data.income - data.expense,
        }
      })
  }, [transactions, language])

  // Calculate current month vs previous month comparison
  const monthlyComparison = useMemo(() => {
    if (!transactions) return { incomeChange: 0, expenseChange: 0 }

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`

    const current = { income: 0, expense: 0 }
    const previous = { income: 0, expense: 0 }

    transactions.forEach((tx) => {
      const date = new Date(tx.occurred_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const amount = Number(tx.amount)

      if (monthKey === currentMonth) {
        if (tx.transaction_type === "income") current.income += amount
        else current.expense += amount
      } else if (monthKey === prevMonthKey) {
        if (tx.transaction_type === "income") previous.income += amount
        else previous.expense += amount
      }
    })

    const incomeChange = previous.income > 0 
      ? ((current.income - previous.income) / previous.income) * 100 
      : 0
    const expenseChange = previous.expense > 0 
      ? ((current.expense - previous.expense) / previous.expense) * 100 
      : 0

    return { 
      incomeChange, 
      expenseChange,
      currentIncome: current.income,
      currentExpense: current.expense,
      hasData: previous.income > 0 || previous.expense > 0
    }
  }, [transactions])

  // Calculate savings trend data based on selected period
  const savingsTrendData = useMemo(() => {
    if (!transactions) return []

    if (savingsPeriod === "day") {
      // Daily data for last 14 days
      const dailyTotals: Record<string, { income: number; expense: number }> = {}
      const now = new Date()
      
      // Get all days from start of current month to today
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      for (let d = new Date(startOfMonth); d <= today; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0]
        dailyTotals[key] = { income: 0, expense: 0 }
      }

      transactions.forEach((tx) => {
        const dateKey = tx.occurred_at.split("T")[0]
        if (dailyTotals[dateKey]) {
          if (tx.transaction_type === "income") {
            dailyTotals[dateKey].income += Number(tx.amount)
          } else {
            dailyTotals[dateKey].expense += Number(tx.amount)
          }
        }
      })

      return Object.entries(dailyTotals)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => ({
          label: new Date(date).toLocaleDateString(language, { day: "numeric" }),
          savings: data.income - data.expense,
        }))
    } else if (savingsPeriod === "year") {
      // Yearly data
      const yearlyTotals: Record<string, { income: number; expense: number }> = {}

      transactions.forEach((tx) => {
        const year = new Date(tx.occurred_at).getFullYear().toString()
        if (!yearlyTotals[year]) {
          yearlyTotals[year] = { income: 0, expense: 0 }
        }
        if (tx.transaction_type === "income") {
          yearlyTotals[year].income += Number(tx.amount)
        } else {
          yearlyTotals[year].expense += Number(tx.amount)
        }
      })

      return Object.entries(yearlyTotals)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-5)
        .map(([year, data]) => ({
          label: year,
          savings: data.income - data.expense,
        }))
    } else {
      // Monthly data (default)
      return monthlyData.map(d => ({
        label: d.month,
        savings: d.savings,
      }))
    }
  }, [transactions, savingsPeriod, monthlyData, language])

  // Calculate totals
  const totals = useMemo(() => {
    if (!transactions) return { income: 0, expense: 0, savings: 0 }

    const income = transactions
      .filter((tx) => tx.transaction_type === "income")
      .reduce((sum, tx) => sum + Number(tx.amount), 0)

    const expense = transactions
      .filter((tx) => tx.transaction_type === "expense")
      .reduce((sum, tx) => sum + Number(tx.amount), 0)

    return { income, expense, savings: income - expense }
  }, [transactions])

  if (isLoading) {
    return (
      <div className="page-centered">
        <div className="loader" />
        <p>{t("loadingAnalytics")}</p>
      </div>
    )
  }

  return (
    <section className="analytics-page">
      <div className="dashboard__header">
        <div>
          <p className="eyebrow">{t("financialAnalytics")}</p>
          <h1 className="hero-title">
            {t("visualizationsPlanning")}
          </h1>
        </div>
        <div className="dashboard__badge">
          {t("totalSavings")}
          <strong className={totals.savings >= 0 ? "text-success" : "text-danger"}>
            {formatCurrency(totals.savings)}
          </strong>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="card-grid">
        <article className="stat-card">
          <p className="stat-card__label">
            {t("incomeThisMonth")}
          </p>
          <p className="stat-card__value">{formatCurrency(monthlyComparison.currentIncome || 0)}</p>
          {monthlyComparison.hasData && (
            <p className={`stat-card__change ${monthlyComparison.incomeChange >= 0 ? "text-success" : "text-danger"}`}>
              {monthlyComparison.incomeChange >= 0 ? "+" : ""}{monthlyComparison.incomeChange.toFixed(1)}% {t("vsPreviousMonth")}
            </p>
          )}
        </article>
        <article className="stat-card stat-card--expense">
          <p className="stat-card__label">
            {t("expensesThisMonth")}
          </p>
          <p className="stat-card__value">{formatCurrency(monthlyComparison.currentExpense || 0)}</p>
          {monthlyComparison.hasData && (
            <p className={`stat-card__change ${monthlyComparison.expenseChange <= 0 ? "text-success" : "text-danger"}`}>
              {monthlyComparison.expenseChange >= 0 ? "+" : ""}{monthlyComparison.expenseChange.toFixed(1)}% {t("vsPreviousMonth")}
            </p>
          )}
        </article>
        <article className="stat-card">
          <p className="stat-card__label">{t("savingsRate")}</p>
          <p className="stat-card__value">
            {totals.income > 0 ? `${((totals.savings / totals.income) * 100).toFixed(1)}%` : "0%"}
          </p>
        </article>
      </div>

      {/* Charts Row */}
      <div className="dashboard__split">
        {/* Spending by Category Pie Chart */}
        <div className="panel">
          <div className="panel__header">
            <div>
              <h3 className="panel__title">
                 {t("spendingByCategory")}
              </h3>
              <p className="panel__subtitle">
                {t("expenseDistribution")}
              </p>
            </div>
            <div className="period-selector">
              <button
                className={`period-btn ${categoryPeriod === "day" ? "period-btn--active" : ""}`}
                onClick={() => setCategoryPeriod("day")}
              >
                {t("periodDay")}
              </button>
              <button
                className={`period-btn ${categoryPeriod === "month" ? "period-btn--active" : ""}`}
                onClick={() => setCategoryPeriod("month")}
              >
                {t("periodMonth")}
              </button>
              <button
                className={`period-btn ${categoryPeriod === "year" ? "period-btn--active" : ""}`}
                onClick={() => setCategoryPeriod("year")}
              >
                {t("periodYear")}
              </button>
              <button
                className={`period-btn ${categoryPeriod === "all" ? "period-btn--active" : ""}`}
                onClick={() => setCategoryPeriod("all")}
              >
                {t("periodAll")}
              </button>
            </div>
          </div>
          {categoryData.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(2)}%`}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    itemStyle={{ color: "#f1f5f9" }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="no-data">{t("noDataToDisplay")}</p>
          )}
        </div>

        {/* Monthly Income vs Expenses Bar Chart */}
        <div className="panel">
          <h3 className="panel__title">
             {t("monthlyOverview")}
          </h3>
          <p className="panel__subtitle">
            {t("incomeVsExpenses")}
          </p>
          {monthlyData.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" tick={{ fill: "#9ca3af" }} />
                  <YAxis tick={{ fill: "#9ca3af" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    labelStyle={{ color: "#f1f5f9", fontWeight: "bold", marginBottom: "8px" }}
                    itemStyle={{ color: "#f1f5f9" }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar
                    dataKey="income"
                    fill="#22c55e"
                    name={t("income")}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expense"
                    fill="#ef4444"
                    name={t("expenses")}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="no-data">{t("noDataToDisplay")}</p>
          )}
        </div>
      </div>

      {/* Savings Trend Line Chart */}
      <div className="panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">
               {t("savingsTrend")}
            </h3>
            <p className="panel__subtitle">
              {t("balanceOverTime")}
            </p>
          </div>
          <div className="period-selector">
            <button
              className={`period-btn ${savingsPeriod === "day" ? "period-btn--active" : ""}`}
              onClick={() => setSavingsPeriod("day")}
            >
              {t("periodDay")}
            </button>
            <button
              className={`period-btn ${savingsPeriod === "month" ? "period-btn--active" : ""}`}
              onClick={() => setSavingsPeriod("month")}
            >
              {t("periodMonth")}
            </button>
            <button
              className={`period-btn ${savingsPeriod === "year" ? "period-btn--active" : ""}`}
              onClick={() => setSavingsPeriod("year")}
            >
              {t("periodYear")}
            </button>
          </div>
        </div>
        {savingsTrendData.length > 0 ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={savingsTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="label" tick={{ fill: "#9ca3af" }} />
                <YAxis tick={{ fill: "#9ca3af" }} />
                <Tooltip
                  labelStyle={{ color: "#f1f5f9", fontWeight: "bold", marginBottom: "8px" }}
                  itemStyle={{ color: "#f1f5f9" }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Line
                  type="monotone"
                  dataKey="savings"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ fill: "#6366f1", strokeWidth: 2 }}
                  name={t("savings")}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="no-data">{t("noDataToDisplay")}</p>
        )}
      </div>

      {/* Investment Planning Section */}
      <div className="dashboard__split">
        <InvestmentCalculator />
        <SavingsGoals />
      </div>
    </section>
  )
}
