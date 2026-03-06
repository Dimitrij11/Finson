import { useState, useRef, useEffect } from "react"
import { Search, User as UserIcon, LogOut, Settings, ChevronDown } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { mk, enUS } from "date-fns/locale"

import { useAuth } from "../../hooks/useAuth"
import { useSearch } from "../../context/SearchContext"
import { useLanguage } from "../../i18n"
import { NotificationDropdown } from "./NotificationDropdown"

export const TopBar = () => {
  const { user, logout } = useAuth()
  const { searchTerm, handleSearch } = useSearch()
  const { language, t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleProfileClick = () => {
    setIsProfileOpen(false)
    navigate("/profile")
  }

  const handleLogout = () => {
    setIsProfileOpen(false)
    logout()
  }

  const showSearch = location.pathname.startsWith("/transactions")

  const dateLocale = language === "mk" ? mk : enUS
  const dateFormat = language === "mk" ? "dd.MM.yyyy" : "MM/dd/yyyy"

  return (
    <header className="topbar">
      <div>
        <p className="topbar__title">{t("welcomeBack")}</p>
        <p className="topbar__date">{format(new Date(), dateFormat, { locale: dateLocale })}</p>
      </div>
      <div className="topbar__actions">
        {showSearch && (
          <div className="topbar__search">
            <Search size={18} />
            <input
              placeholder={t("searchTransactions")}
              aria-label="Search"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        )}
        <NotificationDropdown />
        <div className="topbar__badge">{user?.currency ?? "EUR"}</div>
        <div className="profile-dropdown-container" ref={profileRef}>
          <button
            className="topbar__profile"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            aria-expanded={isProfileOpen}
            type="button"
          >
            <span className="topbar__profile-name" style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)' }}>
              {user?.full_name ?? user?.email?.split('@')[0]}
            </span>
            <div className="topbar__profile-avatar">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" />
              ) : (
                <UserIcon size={18} />
              )}
            </div>
            <ChevronDown size={14} style={{ color: 'var(--muted)', marginLeft: '-2px' }} />
          </button>

          {isProfileOpen && (
            <div className="profile-dropdown-panel">
              <div className="profile-dropdown-header">
                <p>{user?.full_name ?? (language === "mk" ? "Корисник" : "User")}</p>
                {/* <span>{user?.email}</span> */}
              </div>
              
              <button 
                className="profile-dropdown-item" 
                onClick={handleProfileClick}
              >
                <Settings size={16} />
                {t("profileSettings") || (language === "mk" ? "Подесувања" : "Profile Settings")}
              </button>
              
              <div className="profile-dropdown-separator"></div>
              
              <button 
                className="profile-dropdown-item danger" 
                onClick={handleLogout}
              >
                <LogOut size={16} />
                {t("logout") || (language === "mk" ? "Одјави се" : "Logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
