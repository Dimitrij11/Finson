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
  const { language } = useLanguage()
  const { mode } = useTheme()
  const isDark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  const chartColor = isDark ? "#ffffff" : "#000000"
  const chartFill = isDark ? "#ffffff" : "#000000"

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
      <header className="page-header">
        <h1 className="page-title">{language === "mk" ? "За нас" : "About Us"}</h1>
        <p className="page-description">
          {language === "mk" 
            ? "Дознајте повеќе за нашата мисија, визија и контактирајте нè." 
            : "Learn more about our mission, vision, and get in touch."}
        </p>
      </header>

      <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
        
        {/* Mission Panel */}
        <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <h3 className="panel__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Target size={22} color="var(--accent)" />
            {language === "mk" ? "Нашата Мисија" : "Our Mission"}
          </h3>
          <p style={{ marginTop: "1rem", lineHeight: "1.6", flex: 1 }}>
            {language === "mk" 
              ? "Нашата цел е финансиската писменост да ја направиме достапна за секого. Со Finson, сакаме да ви помогнеме да донесувате поумни финансиски одлуки преку моќта на вештачката интелигенција." 
              : "Our goal is to make financial literacy accessible to everyone. With Finson, we want to help you make smarter financial decisions through the power of Artificial Intelligence."}
          </p>
        </div>

        {/* Vision Panel */}
        <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <h3 className="panel__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Shield size={22} color="var(--accent)" />
            {language === "mk" ? "Нашата Визија" : "Our Vision"}
          </h3>
          <p style={{ marginTop: "1rem", lineHeight: "1.6", flex: 1 }}>
            {language === "mk"
              ? "Градиме свет каде што управувањето со пари е лесно, безбедно и достапно преку технолошки иновации кои работат во ваша корист."
              : "We are building a world where money management is easy, secure, and accessible through technological innovations that work in your favor."}
          </p>
        </div>

        {/* Contact Panel */}
        <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <h3 className="panel__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Users size={22} color="var(--accent)" />
            {language === "mk" ? "Контакт" : "Contact Us"}
          </h3>
          <p style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
            {language === "mk"
              ? "Имате прашање или идеја? Контактирајте нè преку следниве канали:"
              : "Have a question or idea? Reach out to us via the following channels:"}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <a href="mailto:hello@finson.app" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent)", textDecoration: "none" }}>
              <Mail size={20} />
              hello@finson.app
            </a>
            <a href="https://github.com/finson" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent)", textDecoration: "none" }}>
              <Github size={20} />
              GitHub Repository
            </a>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text)" }}>
              <Heart size={20} color="var(--negative)" />
              {language === "mk" ? "Направено со љубов" : "Made with love"}
            </div>
          </div>
        </div>
      </div>

      {/* Core Values Section */}
      <div className="panel">
        <h3 className="panel__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <Sparkles size={22} color="var(--accent)" />
          {language === "mk" ? "Нашите Вредности" : "Our Core Values"}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
          <div style={{ padding: "1.5rem", backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <Zap size={28} color="var(--accent)" style={{ marginBottom: "1rem" }} />
            <h4 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>{language === "mk" ? "Брзина & Ефикасност" : "Speed & Efficiency"}</h4>
            <p style={{ fontSize: "0.95rem", color: "var(--muted)", lineHeight: "1.5" }}>
              {language === "mk" ? "Инстантни финансиски увиди и анализи на вашите трошоци овозможени од напредна вештачка интелигенција." : "Instant financial insights and analysis of your expenses powered by advanced artificial intelligence."}
            </p>
          </div>
          <div style={{ padding: "1.5rem", backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <Lock size={28} color="var(--accent)" style={{ marginBottom: "1rem" }} />
            <h4 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>{language === "mk" ? "Приватност & Безбедност" : "Privacy & Security"}</h4>
            <p style={{ fontSize: "0.95rem", color: "var(--muted)", lineHeight: "1.5" }}>
              {language === "mk" ? "Вашите податоци се безбедни, енкриптирани и никогаш не се споделуваат со злонамерни трети страни." : "Your data is secure, encrypted, and never shared with malicious third parties."}
            </p>
          </div>
          <div style={{ padding: "1.5rem", backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <Users size={28} color="var(--accent)" style={{ marginBottom: "1rem" }} />
            <h4 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>{language === "mk" ? "Интуитивен Дизајн" : "Intuitive Design"}</h4>
            <p style={{ fontSize: "0.95rem", color: "var(--muted)", lineHeight: "1.5" }}>
              {language === "mk" ? "Создадено да биде лесно и минималистичко за користење, дури и за целосни почетници во финансиите." : "Created to be easy and minimalist to use, even for complete beginners in personal finance."}
            </p>
          </div>
        </div>
      </div>

      {/* Chart Panel */}
      <div className="panel">
        <h3 className="panel__title">
          🚀 {language === "mk" ? "Нашиот ентузијазам за проектот" : "Our Enthusiasm for the Project"}
        </h3>
        <p className="panel__subtitle" style={{ marginBottom: "2rem" }}>
          {language === "mk" ? "Како што расте проектот, така расте и нашата мотивација!" : "As the project grows, so does our motivation!"}
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
                name={language === "mk" ? "Ентузијазам (Level)" : "Enthusiasm (Level)"}
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
            {language === "mk" ? "Технологии" : "Tech Stack"}
          </h3>
          <p style={{ marginBottom: "1.5rem", lineHeight: "1.6", color: "var(--muted)" }}>
            {language === "mk" 
              ? "Оваа платформа е изградена со модерни мрежни технологии за да обезбеди мазно и сигурно искуство:" 
              : "This platform is built with modern web technologies to ensure a smooth and secure experience:"}
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
              <span>{language === "mk" ? "Напредна AI Интеграција" : "Advanced AI Integration"}</span>
            </li>
          </ul>
        </div>

        <div className="panel" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", minHeight: "250px" }}>
            <div style={{ padding: "1rem", backgroundColor: "var(--accent)", borderRadius: "50%", marginBottom: "1.5rem" }}>
              <Github size={36} color="white" />
            </div>
            <h3 style={{ fontSize: "1.6rem", marginBottom: "1rem", color: "var(--text)", fontWeight: 600 }}>
               {language === "mk" ? "Проект со отворен код" : "Open Source Project"}
            </h3>
            <p style={{ color: "var(--muted)", marginBottom: "1.5rem", maxWidth: "80%", lineHeight: "1.6" }}>
              {language === "mk" ? "Проверете го изворниот код, придонесете со идеи и придружете се кон заедницата на GitHub!" : "Check out the source code, contribute ideas, and join the community on GitHub!"}
            </p>
            <a 
              href="https://github.com/finson" 
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
              {language === "mk" ? "Оди на GitHub" : "Go to GitHub"}
            </a>
        </div>

      </div>
    </div>
  )
}
