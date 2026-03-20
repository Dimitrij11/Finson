import { useState, useRef, useEffect } from "react"
import type { FormEvent } from "react"
import { User, Lock, Mail, Calendar, Wallet, AlertTriangle, RefreshCw, Camera, ChevronDown, Search, Check } from "lucide-react"

import { useAuth } from "../../hooks/useAuth"
import { apiClient } from "../../api/client"
import { useLanguage } from "../../i18n"

// Format date based on language
const formatDate = (dateString: string, lang: string): string => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return lang === "mk" ? `${day}.${month}.${year}` : `${month}/${day}/${year}`
}

const SUPPORTED_CURRENCIES = [
  "EUR", "USD", "MKD", "GBP", "CHF", "JPY", "CAD", "AUD", "CNY",
  "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK",
  "TRY", "RUB", "BRL", "MXN", "ARS", "ZAR", "INR"
]

const PREDEFINED_CURRENCIES = ["EUR", "USD", "MKD"]
const POPULAR_QUICK_SELECT = ["EUR", "USD", "MKD", "GBP", "CHF"]

const CURRENCY_FLAGS: Record<string, string> = {
  EUR: "🇪🇺",
  USD: "🇺🇸",
  MKD: "🇲🇰",
  GBP: "🇬🇧",
  CHF: "🇨🇭",
  JPY: "🇯🇵",
  CAD: "🇨🇦",
  AUD: "🇦🇺",
  CNY: "🇨🇳",
  SEK: "🇸🇪",
  NOK: "🇳🇴",
  DKK: "🇩🇰",
  PLN: "🇵🇱",
  CZK: "🇨🇿",
  HUF: "🇭🇺",
  RON: "🇷🇴",
  BGN: "🇧🇬",
  HRK: "🇭🇷",
  TRY: "🇹🇷",
  RUB: "🇷🇺",
  BRL: "🇧🇷",
  MXN: "🇲🇽",
  ARS: "🇦🇷",
  ZAR: "🇿🇦",
  INR: "🇮🇳"
}

const getCurrencyName = (code: string): string => {
  const names: Record<string, string> = {
    EUR: "currency_EUR",
    USD: "currency_USD",
    MKD: "currency_MKD",
    GBP: "currency_GBP",
    CHF: "currency_CHF",
    JPY: "currency_JPY",
    CAD: "currency_CAD",
    AUD: "currency_AUD",
    CNY: "currency_CNY",
    SEK: "currency_SEK",
    NOK: "currency_NOK",
    DKK: "currency_DKK",
    PLN: "currency_PLN",
    CZK: "currency_CZK",
    HUF: "currency_HUF",
    RON: "currency_RON",
    BGN: "currency_BGN",
    HRK: "currency_HRK",
    TRY: "currency_TRY",
    RUB: "currency_RUB",
    BRL: "currency_BRL",
    MXN: "currency_MXN",
    ARS: "currency_ARS",
    ZAR: "currency_ZAR",
    INR: "currency_INR"
  }
  return names[code] || code
}

export const ProfilePage = () => {
  const { user, token, refreshUser } = useAuth()
  const { language, t } = useLanguage()
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isChangingCurrency, setIsChangingCurrency] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState(user?.currency ?? "EUR")
  const [currencySearch, setCurrencySearch] = useState("")
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false)

  const currencyDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
        setShowCurrencyDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCurrencies = SUPPORTED_CURRENCIES.filter(curr =>
    curr.toLowerCase().includes(currencySearch.toLowerCase())
  )
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currencyError, setCurrencyError] = useState<string | null>(null)
  const [currencySuccess, setCurrencySuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [currencyLoading, setCurrencyLoading] = useState(false)
  const [isEmailBlurred, setIsEmailBlurred] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Limit to 2MB to match backend
    if (file.size > 2 * 1024 * 1024) {
      setError(t("imageTooLarge"))
      return
    }

    setIsUploadingPhoto(true)
    setError(null)
    setSuccess(null)

    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string
          await apiClient.post(
            "/users/me/profile-picture",
            { image_data: base64String },
            { token: token ?? undefined }
          )
          if (refreshUser) {
            await refreshUser()
          }
          setSuccess(t("profilePictureUpdated"))
        } catch (err) {
          setError(err instanceof Error ? err.message : t("saveFailed"))
        } finally {
          setIsUploadingPhoto(false)
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        }
      }
      reader.onerror = () => {
        setError(t("errorReadingImage"))
        setIsUploadingPhoto(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"))
      setIsUploadingPhoto(false)
    }
  }

  const handlePasswordChange = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError(t("passwordsDontMatch"))
      return
    }

    if (passwordForm.new_password.length < 8) {
      setError(t("passwordTooShort"))
      return
    }

    setIsLoading(true)
    try {
      await apiClient.post(
        "/users/me/change-password",
        {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        },
        { token: token ?? undefined }
      )
      setSuccess(t("passwordChanged"))
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" })
      setIsChangingPassword(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!user?.email) return
    setResendingEmail(true)
    try {
      await apiClient.post("/auth/resend-verification", { email: user.email })
      setSuccess(t("verificationEmailSent"))
    } catch {
      setError(t("saveFailed"))
    } finally {
      setResendingEmail(false)
    }
  }

  const handleCurrencyChange = async () => {
    if (selectedCurrency === user?.currency) {
      setIsChangingCurrency(false)
      return
    }

    // Validate that the selected currency is supported
    if (!SUPPORTED_CURRENCIES.includes(selectedCurrency)) {
      setCurrencyError(t("unsupportedCurrency"))
      return
    }
    
    setCurrencyError(null)
    setCurrencySuccess(null)
    setCurrencyLoading(true)
    
    try {
      const result = await apiClient.post<{
        success: boolean
        old_currency: string
        new_currency: string
        transactions_converted: number
        budgets_converted: number
        message: string
      }>(
        "/users/me/change-currency",
        {
          new_currency: selectedCurrency,
          convert_values: true,
        },
        { token: token ?? undefined }
      )
      
      // Refresh user data
      if (refreshUser) {
        await refreshUser()
      }
      
      const conversionMsg = result.transactions_converted > 0 || result.budgets_converted > 0
        ? ` ${t("convertedItems", { transactions: result.transactions_converted, budgets: result.budgets_converted })}`
        : ""
      
      setCurrencySuccess(
        t("currencyChanged", { old: result.old_currency, new: result.new_currency }) + conversionMsg
      )
      setIsChangingCurrency(false)
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : t("saveFailed")
      
      // Handle Macedonian error message for unsupported currency
      if (errorMessage.includes("Валутата не е поддржана")) {
        errorMessage = t("unsupportedCurrency")
      }
      
      setCurrencyError(errorMessage)
    } finally {
      setCurrencyLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="page-centered">
        <div className="loader" />
      </div>
    )
  }

  return (
    <section>
      <div className="dashboard__header">
        <div>
          <p className="eyebrow">{t("yourProfile")}</p>
          <h1 className="hero-title">{t("profileSettings")}</h1>
        </div>
      </div>

      {!user.is_email_verified && (
        <div className="verification-banner">
          <AlertTriangle size={20} />
          <div>
            <strong>{t("emailNotVerified")}</strong>
            <p>{t("checkInbox")}</p>
          </div>
          <button
            className="secondary-button"
            onClick={handleResendVerification}
            disabled={resendingEmail}
          >
            {resendingEmail ? t("sending") : t("resend")}
          </button>
        </div>
      )}

      <div className="profile-grid">
        {/* User Info Card */}
        <div className="panel profile-card">
          <div 
            className="profile-avatar" 
            onClick={!isUploadingPhoto ? handleAvatarClick : undefined}
            style={{ cursor: isUploadingPhoto ? "wait" : "pointer", position: "relative", overflow: "hidden" }}
            title={t("changeProfilePicture")}
          >
            {user.profile_picture ? (
              <img 
                src={user.profile_picture} 
                alt="Profile" 
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: isUploadingPhoto ? 0.5 : 1 }} 
              />
            ) : (
              <User size={48} style={{ opacity: isUploadingPhoto ? 0.5 : 1 }} />
            )}
            <div 
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                justifyContent: "center",
                padding: "4px 0",
                color: "white"
              }}
            >
              <Camera size={16} />
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/jpeg,image/png,image/gif"
            style={{ display: "none" }}
          />
          <h2 className="profile-name">{user.full_name || t("user")}</h2>
          <p 
            className="profile-email"
            onClick={() => setIsEmailBlurred(false)}
            style={{ 
              cursor: isEmailBlurred ? "pointer" : "default", 
              filter: isEmailBlurred ? "blur(5px)" : "none",
              transition: "filter 0.3s ease",
              userSelect: isEmailBlurred ? "none" : "auto"
            }}
            title={isEmailBlurred ? t("clickToRevealEmail") : ""}
          >
            {user.email}
          </p>

          <div className="profile-details">
            <div className="profile-detail-item">
              <Mail size={18} />
              <div>
                <span className="detail-label">{t("email")}</span>
                <span 
                  className="detail-value"
                  onClick={() => setIsEmailBlurred(false)}
                  style={{ 
                    cursor: isEmailBlurred ? "pointer" : "default", 
                    filter: isEmailBlurred ? "blur(5px)" : "none",
                    transition: "filter 0.3s ease",
                    display: "inline-block",
                    userSelect: isEmailBlurred ? "none" : "auto"
                  }}
                  title={isEmailBlurred ? t("clickToRevealEmail") : ""}
                >
                  {user.email}
                </span>
              </div>
            </div>
            <div className="profile-detail-item">
              <Wallet size={18} />
              <div>
                <span className="detail-label">{t("currency")}</span>
                <span className="detail-value">{user.currency}</span>
              </div>
            </div>
            <div className="profile-detail-item">
              <Calendar size={18} />
              <div>
                <span className="detail-label">{t("memberSince")}</span>
                <span className="detail-value">{formatDate(user.created_at, language)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Currency Change Card */}
        <div className="panel">
          <h3 className="panel__title">
            <RefreshCw size={20} />
            {t("changeCurrency")}
          </h3>
          <p className="panel__subtitle">
            {t("changeCurrencyDesc")}
          </p>

          {currencySuccess && <p className="auth-success">{currencySuccess}</p>}
          {currencyError && <p className="auth-error">{currencyError}</p>}

          {!isChangingCurrency ? (
            <button
              className="primary-button"
              onClick={() => {
                setSelectedCurrency(user.currency)
                setCurrencySearch("")
                setCurrencyError(null)
                setCurrencySuccess(null)
                setIsChangingCurrency(true)
              }}
            >
              {t("changeCurrency")}
            </button>
          ) : (
            <div className="currency-form">
              <div className="currency-select-row">
                <label className="currency-label">{t("newCurrency")}</label>
                <div className="currency-selector-modern" ref={currencyDropdownRef}>
                  <div 
                    className={`currency-input-container ${showCurrencyDropdown ? 'focused' : ''}`}
                    onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                  >
                    <div className="currency-display">
                      <div className="currency-flag-circle">
                         {CURRENCY_FLAGS[selectedCurrency] || "🏳️"}
                      </div>
                      <span className="currency-code">{selectedCurrency}</span>
                    </div>
                    <ChevronDown size={16} className={`dropdown-arrow ${showCurrencyDropdown ? 'rotated' : ''}`} />
                  </div>
                  
                  {showCurrencyDropdown && (
                    <div className="currency-dropdown-modern">
                      <div className="currency-quick-row">
                        {POPULAR_QUICK_SELECT.map(curr => (
                           <div 
                              key={curr}
                              className={`currency-quick-item ${selectedCurrency === curr ? 'active' : ''}`}
                              onClick={() => {
                                setSelectedCurrency(curr)
                                setCurrencySearch(curr)
                                setShowCurrencyDropdown(false)
                              }}
                              title={t(getCurrencyName(curr))}
                           >
                              {CURRENCY_FLAGS[curr]}
                           </div>
                        ))}
                      </div>

                      <div className="currency-search-container">
                        <Search size={14} className="search-icon" />
                        <input
                          type="text"
                          className="currency-search-input"
                          placeholder={t("searchCurrency")}
                          value={currencySearch}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase()
                            setCurrencySearch(value)
                            // If exact match, select it (optional, maybe distracting)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      
                      <div className="currency-options">
                        
                        {filteredCurrencies.length > 0 && currencySearch && (
                          <div className="currency-section">
                            <div className="currency-section-title">{t("allCurrencies")}</div>
                            {filteredCurrencies.slice(0, 8).map((curr) => (
                              <div
                                key={curr}
                                className={`currency-option-modern ${selectedCurrency === curr ? 'selected' : ''}`}
                                onClick={() => {
                                  setSelectedCurrency(curr)
                                  setCurrencySearch(curr)
                                  setShowCurrencyDropdown(false)
                                }}
                              >
                                <span className="currency-option-flag">{CURRENCY_FLAGS[curr] || "🏳️"}</span>
                                <div className="currency-option-details">
                                  <span className="currency-option-code">{curr}</span>
                                  <span className="currency-option-name">{t(getCurrencyName(curr))}</span>
                                </div>
                                {selectedCurrency === curr && (
                                  <span className="currency-check">
                                     <Check size={16} />
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="password-form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setIsChangingCurrency(false)
                    setCurrencyError(null)
                  }}
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleCurrencyChange}
                  disabled={currencyLoading}
                >
                  {currencyLoading 
                    ? t("converting") 
                    : t("save")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Password Change Card */}
        <div className="panel">
          <h3 className="panel__title">
            <Lock size={20} />
            {t("changePassword")}
          </h3>
          <p className="panel__subtitle">
            {t("updatePasswordDesc")}
          </p>

          {success && <p className="auth-success">{success}</p>}
          {error && <p className="auth-error">{error}</p>}

          {!isChangingPassword ? (
            <button
              className="primary-button"
              onClick={() => setIsChangingPassword(true)}
            >
              {t("changePassword")}
            </button>
          ) : (
            <form className="password-form" onSubmit={handlePasswordChange}>
              <input
                className="input"
                type="password"
                placeholder={t("currentPassword")}
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))
                }
                required
              />
              <input
                className="input"
                type="password"
                placeholder={t("newPassword")}
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))
                }
                required
              />
              <input
                className="input"
                type="password"
                placeholder={t("confirmNewPassword")}
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))
                }
                required
              />
              <div className="password-form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setIsChangingPassword(false)
                    setError(null)
                    setPasswordForm({ current_password: "", new_password: "", confirm_password: "" })
                  }}
                >
                  {t("cancel")}
                </button>
                <button className="primary-button" type="submit" disabled={isLoading}>
                  {isLoading ? t("saving") : t("save")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
