import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useLanguage } from "../../i18n"
import { useTheme } from "../../hooks/useTheme"
import { Mail, Github, Heart, Users, Target, Shield, Zap, Lock, Sparkles, Code, Server, LayoutDashboard } from "lucide-react"

const ENTHUSIASM_DATA = [
  { month: "Jan", enthusiasm: 10 },
  { month: "Feb", enthusiasm: 30 },
  { month: "Mar", enthusiasm: 60 },
  { month: "Apr", enthusiasm: 120 },
  { month: "May", enthusiasm: 250 },
  { month: "Jun", enthusiasm: 500 },
  { month: "Jul", enthusiasm: 1000 },
]

export const AboutPage = () => {
  const { t } = useLanguage()
  const { mode } = useTheme()
  const isDark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  const chartColor = isDark ? "#ffffff" : "#000000"
  const chartFill = isDark ? "#ffffff" : "#000000"

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
      <header className="page-header">
        <h1 className="page-title">{t("aboutUs")}</h1>
        <p className="page-description">
          {t("aboutUsDesc")}
        </p>
      </header>

      <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
        
        {/* Mission Panel */}
        <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <h3 className="panel__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Target size={22} color="var(--accent)" />
            {t("ourMission")}
          </h3>
          <p style={{ marginTop: "1rem", lineHeight: "1.6", flex: 1 }}>
            {t("ourMissionDesc")}
          </p>
        </div>

        {/* Vision Panel */}
        <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <h3 className="panel__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Shield size={22} color="var(--accent)" />
            {t("ourVision")}
          </h3>
          <p style={{ marginTop: "1rem", lineHeight: "1.6", flex: 1 }}>
            {t("ourVisionDesc")}
          </p>
        </div>

        {/* Contact Panel */}
        <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <h3 className="panel__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Users size={22} color="var(--accent)" />
            {t("contactUs")}
          </h3>
          <p style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
            {t("contactUsDesc")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <a href="mailto:hello@finson.app" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent)", textDecoration: "none" }}>
              <Mail size={20} />
              finsonfinances@gmail.com
            </a>
            <a href="https://github.com/dimitrij22026/Finson" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent)", textDecoration: "none" }}>
              <Github size={20} />
              GitHub Repository
            </a>
            {/* <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text)" }}>
              <Heart size={20} color="var(--negative)" />
              {t("madeWithLove")}
            </div> */}
          </div>
        </div>
      </div>

      {/* Core Values Section */}
      <div className="panel">
        <h3 className="panel__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <Sparkles size={22} color="var(--accent)" />
          {t("ourCoreValues")}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
          <div style={{ padding: "1.5rem", backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <Zap size={28} color="var(--accent)" style={{ marginBottom: "1rem" }} />
            <h4 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>{t("speedEfficiency")}</h4>
            <p style={{ fontSize: "0.95rem", color: "var(--muted)", lineHeight: "1.5" }}>
              {t("speedEfficiencyDesc")}
            </p>
          </div>
          <div style={{ padding: "1.5rem", backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <Lock size={28} color="var(--accent)" style={{ marginBottom: "1rem" }} />
            <h4 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>{t("privacySecurity")}</h4>
            <p style={{ fontSize: "0.95rem", color: "var(--muted)", lineHeight: "1.5" }}>
              {t("privacySecurityDesc")}
            </p>
          </div>
          <div style={{ padding: "1.5rem", backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <Users size={28} color="var(--accent)" style={{ marginBottom: "1rem" }} />
            <h4 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>{t("intuitiveDesign")}</h4>
            <p style={{ fontSize: "0.95rem", color: "var(--muted)", lineHeight: "1.5" }}>
              {t("intuitiveDesignDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* Chart Panel */}
      <div className="panel">
        <h3 className="panel__title">
          🚀 {t("projectEnthusiasm")}
        </h3>
        <p className="panel__subtitle" style={{ marginBottom: "2rem" }}>
          {t("projectEnthusiasmDesc")}
        </p>
        
        <div style={{ height: "400px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ENTHUSIASM_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEnthusiasm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartFill} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={chartFill} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.1)" : "var(--border)"} />
              <XAxis dataKey="month" stroke={isDark ? "rgba(255,255,255,0.7)" : "var(--muted)"} />
              <YAxis stroke={isDark ? "rgba(255,255,255,0.7)" : "var(--muted)"} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDark ? "#333" : "var(--surface)", 
                  borderColor: isDark ? "#444" : "var(--border)",
                  color: isDark ? "#fff" : "var(--text)"
                }}
                itemStyle={{ color: chartColor }}
              />
              <Area 
                type="monotone" 
                dataKey="enthusiasm" 
                stroke={chartColor} 
                fillOpacity={1} 
                fill="url(#colorEnthusiasm)" 
                name={t("enthusiasmLevel")}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tech Stack & Community Section */}
      <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
        
        <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <h3 className="panel__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Code size={22} color="var(--accent)" />
            {t("techStack")}
          </h3>
          <p style={{ marginBottom: "1.5rem", lineHeight: "1.6", color: "var(--muted)" }}>
            {t("techStackDesc")}
          </p>
          <ul style={{ listStyleType: "none", padding: 0, display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
            <li style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.05rem" }}>
              <div style={{ padding: "0.5rem", backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderRadius: "8px" }}>
                <LayoutDashboard size={20} color="var(--text)" />
              </div>
              <span>React, TypeScript & Vite (Frontend)</span>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.05rem" }}>
              <div style={{ padding: "0.5rem", backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderRadius: "8px" }}>
                <Server size={20} color="var(--text)" />
              </div>
              <span>Python & FastAPI (Backend)</span>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.05rem" }}>
              <div style={{ padding: "0.5rem", backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderRadius: "8px" }}>
                <Sparkles size={20} color="var(--text)" />
              </div>
              <span>{t("advancedAIIntegration")}</span>
            </li>
          </ul>
        </div>

        <div className="panel" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", minHeight: "250px" }}>
            <div style={{ padding: "1rem", backgroundColor: "var(--accent)", borderRadius: "50%", marginBottom: "1.5rem" }}>
              <Github size={36} color="white" />
            </div>
            <h3 style={{ fontSize: "1.6rem", marginBottom: "1rem", color: "var(--text)", fontWeight: 600 }}>
               {t("openSourceProject")}
            </h3>
            <p style={{ color: "var(--muted)", marginBottom: "1.5rem", maxWidth: "80%", lineHeight: "1.6" }}>
              {t("openSourceDesc")}
            </p>
            <a 
              href="https://github.com/dimitrij22026/Finson" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                display: "inline-flex", 
                alignItems: "center", 
                gap: "0.5rem", 
                padding: "0.8rem 1.5rem", 
                backgroundColor: "var(--accent)", 
                color: "white", 
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: 600
              }}
            >
              <Github size={20} />
              {t("goToGitHub")}
            </a>
        </div>

      </div>
    </div>
  )
}
