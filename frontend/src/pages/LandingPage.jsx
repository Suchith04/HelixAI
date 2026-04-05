import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThunderLogo } from "../assets/ThunderLogo";

/* ══════════════════════════════════════
   HOOKS
══════════════════════════════════════ */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

function useCounter(end, duration = 2000, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let t0 = null;
    const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const step = (ts) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setVal(Math.floor(ease(p) * end));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return val;
}

function useMouse() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const h = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);
  return pos;
}

/* ══════════════════════════════════════
   MICRO COMPONENTS
══════════════════════════════════════ */
function Reveal({ children, delay = 0, dir = "up" }) {
  const [ref, inView] = useInView();
  const transforms = { up: "translateY(32px)", left: "translateX(-32px)", right: "translateX(32px)" };
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "none" : transforms[dir] || transforms.up,
      transition: `opacity 0.7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.7s cubic-bezier(.16,1,.3,1) ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

function StatCounter({ n, suffix, label, start }) {
  const val = useCounter(n, 1800, start);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontFamily: "'Bebas Neue', 'Impact', sans-serif",
        fontSize: "clamp(3rem, 5.5vw, 4.5rem)",
        lineHeight: 1, letterSpacing: "0.02em",
        background: "linear-gradient(160deg, #fff 20%, #7dd3fc 80%)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>
        {val.toLocaleString()}{suffix}
      </div>
      <div style={{ color: "#64748b", fontSize: "0.75rem", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: "0.5rem", fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

function GlowCard({ children, accent = "#38bdf8", style = {}, onClick }) {
  const ref = useRef(null);
  const [glow, setGlow] = useState({ x: "50%", y: "50%", opacity: 0 });
  const onMove = useCallback((e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setGlow({ x: `${e.clientX - r.left}px`, y: `${e.clientY - r.top}px`, opacity: 0.15 });
  }, []);
  const onLeave = useCallback(() => setGlow(g => ({ ...g, opacity: 0 })), []);
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}
      style={{
        position: "relative", overflow: "hidden",
        background: "rgba(15,23,42,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "16px",
        backdropFilter: "blur(8px)",
        transition: "border-color 0.3s, transform 0.25s",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}55`; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave2={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(260px circle at ${glow.x} ${glow.y}, ${accent}${Math.round(glow.opacity * 255).toString(16).padStart(2,"0")}, transparent 70%)`,
        transition: "opacity 0.3s",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function Tag({ children, color = "#38bdf8" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.35rem",
      background: `${color}12`, border: `1px solid ${color}35`,
      color, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em",
      textTransform: "uppercase", padding: "0.3rem 0.75rem", borderRadius: "9999px",
    }}>{children}</span>
  );
}

function PermissionRow({ service, icon, perms, color }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: `1px solid ${open ? color + "44" : "rgba(255,255,255,0.06)"}`,
      borderRadius: "12px", overflow: "hidden", transition: "border-color 0.25s",
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.1rem 1.5rem", background: "transparent", border: "none", cursor: "pointer",
        color: "#e2e8f0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{
            width: "34px", height: "34px", borderRadius: "8px",
            background: `${color}18`, border: `1px solid ${color}35`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem",
          }}>{icon}</div>
          <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "#e2e8f0" }}>{service}</span>
          <Tag color={color}>{perms.length} permissions</Tag>
        </div>
        <div style={{
          width: "22px", height: "22px", borderRadius: "50%",
          background: open ? `${color}20` : "rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: open ? color : "#64748b",
          transition: "all 0.25s", transform: open ? "rotate(180deg)" : "none",
          fontSize: "0.65rem", flexShrink: 0,
        }}>▼</div>
      </button>
      <div style={{ maxHeight: open ? "400px" : 0, overflow: "hidden", transition: "max-height 0.35s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ padding: "0 1.5rem 1.25rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {perms.map(p => (
            <code key={p} style={{
              background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.07)",
              color: "#94a3b8", fontSize: "0.73rem", padding: "0.3rem 0.65rem",
              borderRadius: "6px", fontFamily: "'JetBrains Mono', monospace",
            }}>{p}</code>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Animated canvas background ── */
function HeroCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H, raf;
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const ORBS = Array.from({ length: 5 }, (_, i) => ({
      x: Math.random() * W, y: Math.random() * H, r: 180 + Math.random() * 140,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
      hue: [200, 240, 260, 280, 210][i],
    }));
    const PTS = Array.from({ length: 55 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.2 + 0.4,
    }));
    const GRID = 60;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(148,163,184,0.035)"; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ORBS.forEach(o => {
        o.x += o.vx; o.y += o.vy;
        if (o.x < -o.r || o.x > W + o.r) o.vx *= -1;
        if (o.y < -o.r || o.y > H + o.r) o.vy *= -1;
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        g.addColorStop(0, `hsla(${o.hue},80%,60%,0.065)`); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
      });
      PTS.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(125,211,252,0.38)"; ctx.fill();
      });
      for (let i = 0; i < PTS.length; i++) {
        for (let j = i + 1; j < PTS.length; j++) {
          const dx = PTS[i].x - PTS[j].x, dy = PTS[i].y - PTS[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.beginPath(); ctx.strokeStyle = `rgba(125,211,252,${0.1 * (1 - d / 100)})`; ctx.lineWidth = 0.5;
            ctx.moveTo(PTS[i].x, PTS[i].y); ctx.lineTo(PTS[j].x, PTS[j].y); ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const mouse = useMouse();
  const [statsRef, statsInView] = useInView(0.3);
  const [activeAgent, setActiveAgent] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveStep(s => (s + 1) % 7), 2400);
    return () => clearInterval(id);
  }, []);

  const agents = [
    { icon: "📊", name: "Log Intelligence", role: "Log Analyzer", color: "#38bdf8",
      caps: ["Categorises logs by severity in real-time","Detects time-based spike patterns","Groups errors by semantic signature","LLM semantic analysis on filtered logs","Sends high-confidence findings to CrashDiagnostic"] },
    { icon: "🔍", name: "Crash Diagnostic", role: "Crash Investigator", color: "#a78bfa",
      caps: ["Parses full stack traces automatically","Correlates errors across microservices","Checks known-issue database","Creates incidents for human review","Routes root causes to Recovery Agent"] },
    { icon: "⚡", name: "Resource Optimizer", role: "Resource Monitor", color: "#34d399",
      caps: ["Monitors CPU, memory and disk metrics","Detects resource bottlenecks instantly","Recommends scaling actions","Runs continuous monitoring loops","Alerts on threshold breaches"] },
    { icon: "🎯", name: "Anomaly Detection", role: "Anomaly Detector", color: "#fb923c",
      caps: ["Z-score statistical anomaly detection","Linear-regression trend analysis","Pattern recognition across services","Failure prediction before it happens","Adaptive baseline learning"] },
    { icon: "🔄", name: "Recovery Agent", role: "Auto-Healer", color: "#f472b6",
      caps: ["Restart, scale-up, scale-out and rollback","Takes infrastructure snapshots first","Health checks after every action","Auto-rollback on failed healing","Failover to backup regions"] },
    { icon: "💡", name: "Recommendation", role: "Insight Generator", color: "#facc15",
      caps: ["Aggregates findings from all agents","Generates prioritised action items","Estimates business impact per fix","Learns from past resolutions","Exports reports for stakeholders"] },
    { icon: "💰", name: "Cost Optimizer", role: "Cost Analyzer", color: "#4ade80",
      caps: ["Analyses per-resource cloud spend","Identifies under-utilised instances","Suggests right-sizing opportunities","Forecasts monthly cost projections","Integrates AWS Cost Explorer"] },
  ];

  const pipelineSteps = [
    { n: "01", title: "Fetch", body: "AWS CloudWatch streams up to 5,000 log events per run via paginated FilterLogEvents API calls.", icon: "☁️" },
    { n: "02", title: "Tier & Filter", body: "Intelligent tiering splits logs into Critical, Warning and Noise. 98.8% noise collapse — ~60 signals remain.", icon: "🔽" },
    { n: "03", title: "Analyse", body: "LogIntelligence Agent categorises, clusters by error signature and extracts time/service/keyword patterns.", icon: "📊" },
    { n: "04", title: "LLM Insights", body: "Filtered log summary is sent to your chosen LLM (Gemini / GPT-4o / Claude / Groq) for semantic root-cause analysis.", icon: "🤖" },
    { n: "05", title: "Anomaly Detect", body: "AnomalyDetection applies z-score and linear-regression trend analysis across all metric streams.", icon: "🎯" },
    { n: "06", title: "Diagnose", body: "CrashDiagnostic parses stack traces, correlates across services, and routes high-confidence findings to Recovery.", icon: "🔍" },
    { n: "07", title: "Auto-Heal", body: "Recovery Agent restarts, scales or rolls back with a safety snapshot. Health checks confirm resolution.", icon: "🔄" },
  ];

  const iamPerms = [
    { service: "Amazon EC2", icon: "🖥️", color: "#fb923c", perms: ["ec2:DescribeInstances","ec2:DescribeInstanceStatus","ec2:RebootInstances","ec2:StartInstances","ec2:StopInstances"] },
    { service: "AWS Lambda", icon: "λ", color: "#a78bfa", perms: ["lambda:ListFunctions","lambda:GetFunction","lambda:InvokeFunction","lambda:GetFunctionConfiguration"] },
    { service: "Amazon RDS", icon: "🗄️", color: "#38bdf8", perms: ["rds:DescribeDBInstances","rds:DescribeDBClusters","rds:RebootDBInstance","rds:DescribeEvents"] },
    { service: "CloudWatch", icon: "📡", color: "#34d399", perms: ["logs:DescribeLogGroups","logs:FilterLogEvents","cloudwatch:GetMetricData","cloudwatch:ListMetrics","cloudwatch:DescribeAlarms"] },
    { service: "Cost Explorer", icon: "💰", color: "#facc15", perms: ["ce:GetCostAndUsage","ce:GetCostForecast"] },
    { service: "STS / General", icon: "🔑", color: "#f472b6", perms: ["sts:GetCallerIdentity"] },
  ];

  const llmProviders = [
    { name: "Google Gemini", logo: "G", color: "#4285F4", model: "gemini-2.0-flash", note: "Fastest for real-time analysis" },
    { name: "OpenAI GPT", logo: "◆", color: "#10a37f", model: "gpt-4o-mini", note: "Best reasoning quality" },
    { name: "Anthropic Claude", logo: "◉", color: "#d97706", model: "claude-3.5-sonnet", note: "Best for long log analysis" },
    { name: "Groq", logo: "⚡", color: "#f43f5e", model: "llama-3.3-70b", note: "Ultra-low latency inference" },
  ];

  /* ── style tokens ── */
  const heading = {
    fontFamily: "'Manrope', sans-serif", fontWeight: 800,
    fontSize: "clamp(2rem, 4vw, 3rem)", color: "#f1f5f9",
    lineHeight: 1.15, letterSpacing: "-0.02em",
  };
  const sec = { padding: "7rem clamp(1.5rem, 8vw, 8rem)", position: "relative" };

  const btnP = {
    background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
    color: "#fff", fontWeight: 700, fontSize: "0.9rem",
    padding: "0.7rem 1.65rem", borderRadius: "10px",
    border: "none", cursor: "pointer", textDecoration: "none",
    display: "inline-flex", alignItems: "center", gap: "0.45rem",
    fontFamily: "'Manrope', sans-serif", letterSpacing: "0.01em",
    boxShadow: "0 0 0 1px rgba(99,102,241,0.3), 0 4px 24px rgba(14,165,233,0.18)",
    transition: "transform 0.18s, box-shadow 0.18s",
  };
  const btnO = {
    background: "transparent", color: "#7dd3fc", fontWeight: 600, fontSize: "0.9rem",
    padding: "0.7rem 1.5rem", borderRadius: "10px",
    border: "1px solid rgba(125,211,252,0.25)",
    cursor: "pointer", textDecoration: "none",
    display: "inline-flex", alignItems: "center", gap: "0.45rem",
    fontFamily: "'Manrope', sans-serif", letterSpacing: "0.01em",
    transition: "border-color 0.2s, background 0.2s",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Bebas+Neue&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; overflow-x: hidden; }
        body { background: #050c1a; overflow-x: hidden; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:0.25} }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes shimmer { from{background-position:-200% center} to{background-position:200% center} }
        .hbtn:hover { transform:translateY(-2px)!important; box-shadow: 0 0 0 1px rgba(99,102,241,0.5),0 8px 32px rgba(14,165,233,0.3)!important; }
        .obtn:hover { border-color:rgba(125,211,252,0.5)!important; background:rgba(125,211,252,0.06)!important; }
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:#050c1a} ::-webkit-scrollbar-thumb{background:orange;border-radius:3px}
      `}</style>

      <HeroCanvas />
      <div style={{ position: "fixed", zIndex: 0, pointerEvents: "none", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)", transform: `translate(${mouse.x - 250}px, ${mouse.y - 250}px)`, transition: "transform 0.1s linear" }} />

      <div style={{ minHeight: "100vh", background: "transparent", color: "#e2e8f0", fontFamily: "'Manrope', sans-serif", position: "relative", zIndex: 1, overflowX: "hidden" }}>

        {/* ══ NAV ══ */}
        <nav style={{ position: "sticky", top: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(1.5rem,6vw,5rem)", height: "64px", background: "rgba(5,12,26,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
            <ThunderLogo size={40} />
            <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: "1.15rem", color: "orange", letterSpacing: "-0.01em" }}>HelixAI</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
            {[["#agents","Agents"],["#pipeline","How It Works"],["#aws","AWS Setup"],["#llm","LLM Providers"]].map(([href,label]) => (
              <a key={href} href={href} style={{ color: "#64748b", fontSize: "0.84rem", fontWeight: 500, padding: "0.45rem 0.8rem", textDecoration: "none", borderRadius: "8px" }}
                onMouseEnter={e=>e.target.style.color="#cbd5e1"} onMouseLeave={e=>e.target.style.color="#64748b"}>{label}</a>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            {isAuthenticated
              ? <Link to="/dashboard" className="hbtn" style={btnP}>Dashboard →</Link>
              : (<><Link to="/login" className="obtn" style={btnO}>Sign In</Link><Link to="/register" className="hbtn" style={btnP}>Get Started →</Link></>)
            }
          </div>
        </nav>

        {/* ══ HERO ══ */}
        <section style={{ minHeight: "calc(100vh - 64px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "5rem clamp(1.5rem,8vw,10rem) 4rem", position: "relative" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "700px", height: "700px", borderRadius: "50%", border: "1px solid rgba(56,189,248,0.05)", pointerEvents: "none", animation: "spin-slow 45s linear infinite" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "980px", height: "980px", borderRadius: "50%", border: "1px solid rgba(99,102,241,0.03)", pointerEvents: "none", animation: "spin-slow 75s linear infinite reverse" }} />
          <div style={{ animation: "fadeUp 0.8s ease both" }}>
            <Tag color="#38bdf8"><span style={{ width: "6px", height: "6px", background: "#38bdf8", borderRadius: "50%", display: "inline-block", animation: "blink 1.8s infinite" }} />Multi-Agent AI Infrastructure Intelligence</Tag>
          </div>
          <h1 style={{ ...heading, fontSize: "clamp(3rem,7.5vw,6.2rem)", marginTop: "1.5rem", marginBottom: "1.25rem", animation: "fadeUp 0.8s 0.08s ease both", maxWidth: "900px" }}>
            Your cloud infra,<br />
            <span style={{ background: "linear-gradient(135deg,#38bdf8 0%,#818cf8 50%,#c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200% auto", animation: "shimmer 4s linear infinite" }}>autonomously guarded</span>
          </h1>
          <p style={{ color: "#64748b", fontSize: "clamp(1rem,1.8vw,1.2rem)", lineHeight: 1.78, maxWidth: "640px", marginBottom: "2.75rem", animation: "fadeUp 0.8s 0.16s ease both" }}>
            HelixAI deploys 7 specialised AI agents that collaborate in real-time — ingesting AWS CloudWatch logs, detecting anomalies, diagnosing crashes and self-healing your infrastructure before you ever notice a problem.
          </p>
          <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", justifyContent: "center", animation: "fadeUp 0.8s 0.24s ease both" }}>
            {isAuthenticated
              ? <Link to="/dashboard" className="hbtn" style={{ ...btnP, padding: "0.9rem 2.2rem", fontSize: "1rem" }}>Open Dashboard →</Link>
              : (<><Link to="/register" className="hbtn" style={{ ...btnP, padding: "0.9rem 2.2rem", fontSize: "1rem" }}>Start for free →</Link><Link to="/login" className="obtn" style={{ ...btnO, padding: "0.9rem 2rem", fontSize: "1rem" }}>Sign In</Link></>)
            }
          </div>
          <div style={{ marginTop: "3.5rem", display: "flex", alignItems: "center", gap: "1.25rem", color: "orange", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", animation: "fadeUp 0.8s 0.32s ease both", flexWrap: "wrap", justifyContent: "center" }}>
            {["AES-256-GCM Encrypted","JWT Auth","4 LLM Providers","Real-time WebSocket","Multi-tenant"].map((t, i) => (
              <span key={t} style={{ display: "flex", alignItems: "center", gap: i > 0 ? "1.25rem" : 0 }}>
                {i > 0 && <span style={{ width: "3px", height: "3px", background: "orange", borderRadius: "50%" }} />}
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* ══ STATS ══ */}
        <div ref={statsRef} style={{ margin: "0 clamp(1.5rem,8vw,8rem)", background: "rgba(14,165,233,0.03)", border: "1px solid rgba(56,189,248,0.1)", borderRadius: "20px", padding: "3rem clamp(2rem,5vw,5rem)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "2.5rem" }}>
          <StatCounter n={98} suffix="%" label="Log noise eliminated" start={statsInView} />
          <div style={{ width: "1px", background: "rgba(56,189,248,0.1)", alignSelf: "stretch" }} />
          <StatCounter n={7} suffix="" label="Specialised agents" start={statsInView} />
          <div style={{ width: "1px", background: "rgba(56,189,248,0.1)", alignSelf: "stretch" }} />
          <StatCounter n={5000} suffix="+" label="Logs per run" start={statsInView} />
          <div style={{ width: "1px", background: "rgba(56,189,248,0.1)", alignSelf: "stretch" }} />
          <StatCounter n={4} suffix="" label="LLM providers" start={statsInView} />
          <div style={{ width: "1px", background: "rgba(56,189,248,0.1)", alignSelf: "stretch" }} />
          <StatCounter n={256} suffix="-bit" label="AES encryption" start={statsInView} />
        </div>

        {/* ══ AGENTS ══ */}
        <section id="agents" style={sec}>
          <Reveal>
            <Tag color="#a78bfa">The Agent Team</Tag>
            <h2 style={{ ...heading, marginTop: "0.85rem", marginBottom: "0.5rem" }}>7 agents. One mission.</h2>
            <p style={{ color: "#475569", fontSize: "1rem", lineHeight: 1.7, maxWidth: "520px" }}>Each agent has its own LLM system prompt, memory, and confidence scoring. Together they form an autonomous SRE team that never sleeps.</p>
          </Reveal>

          {/* tab row */}
          <div style={{ display: "flex", marginTop: "2.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto", gap: 0 }}>
            {agents.map((a, i) => (
              <button key={a.name} onClick={() => setActiveAgent(i)} style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "0.85rem 1rem",
                color: activeAgent === i ? "#f1f5f9" : "#475569",
                fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: "0.8rem",
                whiteSpace: "nowrap", letterSpacing: "0.01em",
                borderBottom: `2px solid ${activeAgent === i ? a.color : "transparent"}`,
                transition: "all 0.2s",
              }}>{a.icon} {a.name}</button>
            ))}
          </div>

          {/* agent panel */}
          {agents.map((a, i) => i === activeAgent && (
            <div key={a.name} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
              <GlowCard accent={a.color} style={{ padding: "2.25rem" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: `${a.color}15`, border: `1px solid ${a.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", marginBottom: "1.1rem", animation: "float 3s ease-in-out infinite" }}>{a.icon}</div>
                <Tag color={a.color}>{a.role}</Tag>
                <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: "1.45rem", color: "#f1f5f9", marginTop: "0.7rem", marginBottom: "1.1rem", letterSpacing: "-0.01em" }}>{a.name}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  {a.caps.map((c, ci) => (
                    <div key={ci} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                      <div style={{ width: "17px", height: "17px", borderRadius: "50%", background: `${a.color}20`, border: `1px solid ${a.color}50`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                        <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: a.color }} />
                      </div>
                      <span style={{ color: "#94a3b8", fontSize: "0.86rem", lineHeight: 1.6 }}>{c}</span>
                    </div>
                  ))}
                </div>
              </GlowCard>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                {agents.map((ag, j) => (
                  <GlowCard key={ag.name} accent={ag.color} onClick={() => setActiveAgent(j)} style={{ padding: "1rem", cursor: "pointer", background: j === i ? `${ag.color}10` : "rgba(15,23,42,0.5)", borderColor: j === i ? `${ag.color}50` : "rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                      <span style={{ fontSize: "1rem" }}>{ag.icon}</span>
                      <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: "0.76rem", color: j === i ? "#f1f5f9" : "#64748b", lineHeight: 1.3 }}>{ag.name}</span>
                    </div>
                  </GlowCard>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ══ PIPELINE ══ */}
        <section id="pipeline" style={{ ...sec, background: "rgba(13,22,40,0.5)" }}>
          <Reveal>
            <Tag color="#34d399">Data Flow</Tag>
            <h2 style={{ ...heading, marginTop: "0.85rem", marginBottom: "0.5rem" }}>From raw logs to healed infra in seconds</h2>
            <p style={{ color: "#475569", fontSize: "1rem", lineHeight: 1.7, maxWidth: "540px" }}>The entire 7-stage pipeline is observable in real-time on your dashboard. Click a step to learn more.</p>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", marginTop: "2.75rem", alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {pipelineSteps.map((s, i) => (
                <div key={s.title} onClick={() => setActiveStep(i)} style={{
                  padding: "0.9rem 1.15rem", borderRadius: "12px", cursor: "pointer",
                  background: activeStep === i ? "rgba(56,189,248,0.08)" : "transparent",
                  border: `1px solid ${activeStep === i ? "rgba(56,189,248,0.3)" : "transparent"}`,
                  display: "flex", alignItems: "center", gap: "0.9rem",
                  transition: "all 0.25s",
                }}>
                  <code style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 500, fontSize: "0.7rem", color: activeStep === i ? "#38bdf8" : "#334155", letterSpacing: "0.05em" }}>{s.n}</code>
                  <span style={{ fontSize: "1rem" }}>{s.icon}</span>
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: "0.88rem", color: activeStep === i ? "#f1f5f9" : "#64748b" }}>{s.title}</span>
                </div>
              ))}
            </div>
            <GlowCard accent="#34d399" style={{ padding: "2.25rem", minHeight: "240px" }}>
              {(() => {
                const s = pipelineSteps[activeStep];
                return (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.25rem" }}>
                      <code style={{ fontFamily: "'JetBrains Mono',monospace", color: "#38bdf8", fontSize: "0.8rem" }}>STEP {s.n}</code>
                      <div style={{ flex: 1, height: "1px", background: "rgba(56,189,248,0.15)" }} />
                    </div>
                    <div style={{ fontSize: "2.25rem", marginBottom: "0.85rem" }}>{s.icon}</div>
                    <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: "1.35rem", color: "#f1f5f9", marginBottom: "0.65rem", letterSpacing: "-0.01em" }}>{s.title}</h3>
                    <p style={{ color: "#64748b", lineHeight: 1.75, fontSize: "0.9rem" }}>{s.body}</p>
                    <div style={{ marginTop: "1.75rem", height: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "9999px", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: "9999px", background: "linear-gradient(90deg,#38bdf8,#818cf8)", width: `${((activeStep + 1) / 7) * 100}%`, transition: "width 0.4s ease" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem", color: "#334155", fontSize: "0.68rem" }}>
                      <span>Step {activeStep + 1} of 7</span><span>{Math.round(((activeStep + 1) / 7) * 100)}%</span>
                    </div>
                  </>
                );
              })()}
            </GlowCard>
          </div>

          {/* noise callout */}
          <Reveal delay={100}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginTop: "2.5rem" }}>
              {[["5,000","Raw logs ingested","#ef4444"],["~60","After intelligent filtering","#f59e0b"],["98.8%","Noise eliminated","#34d399"]].map(([v,l,c]) => (
                <GlowCard key={l} accent={c} style={{ padding: "1.75rem", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "2.5rem", background: `linear-gradient(135deg,${c},#fff)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 }}>{v}</div>
                  <div style={{ color: "#475569", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "0.5rem" }}>{l}</div>
                </GlowCard>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ══ LLM PROVIDERS ══ */}
        <section id="llm" style={sec}>
          <Reveal>
            <Tag color="#818cf8">AI Backbone</Tag>
            <h2 style={{ ...heading, marginTop: "0.85rem", marginBottom: "0.5rem" }}>Plug in any LLM — per tenant</h2>
            <p style={{ color: "#475569", fontSize: "1rem", lineHeight: 1.7, maxWidth: "560px" }}>Each company can configure a different LLM provider. Keys are encrypted with AES-256-GCM and cached for 5 minutes. Swap providers without touching a line of code.</p>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: "1rem", marginTop: "2.5rem" }}>
            {llmProviders.map((p, i) => (
              <Reveal key={p.name} delay={i * 65}>
                <GlowCard accent={p.color} style={{ padding: "2rem" }}>
                  <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: `${p.color}18`, border: `1px solid ${p.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.35rem", color: p.color, fontWeight: 900, marginBottom: "1.15rem" }}>{p.logo}</div>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: "0.98rem", color: "#f1f5f9", marginBottom: "0.3rem" }}>{p.name}</div>
                  <code style={{ fontFamily: "'JetBrains Mono',monospace", color: "#475569", fontSize: "0.73rem" }}>{p.model}</code>
                  <div style={{ marginTop: "0.7rem", color: "#64748b", fontSize: "0.81rem", lineHeight: 1.55 }}>{p.note}</div>
                </GlowCard>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <div style={{ marginTop: "1.5rem", padding: "1.4rem 1.85rem", background: "rgba(129,140,248,0.05)", border: "1px solid rgba(129,140,248,0.15)", borderRadius: "14px", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ fontSize: "1.4rem", flexShrink: 0 }}>🔗</div>
              <div>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, color: "#c4b5fd", marginBottom: "0.3rem", fontSize: "0.9rem" }}>Powered by LangChain</div>
                <div style={{ color: "#475569", fontSize: "0.85rem", lineHeight: 1.65 }}>All agents use LangChain as a unified abstraction layer. Each agent has its own tuned system prompt and can use structured output parsing with schema validation for reliable JSON responses from any provider.</div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ══ AWS SETUP ══ */}
        <section id="aws" style={{ ...sec, background: "rgba(13,22,40,0.5)" }}>
          <Reveal>
            <Tag color="#fb923c">AWS Integration</Tag>
            <h2 style={{ ...heading, marginTop: "0.85rem", marginBottom: "0.5rem" }}>Least-privilege IAM setup</h2>
            <p style={{ color: "#475569", fontSize: "1rem", lineHeight: 1.7, maxWidth: "620px" }}>HelixAI only requests the minimum permissions needed for each service. Your AWS credentials are encrypted at rest with AES-256-GCM and never stored in plaintext. Click each service to expand its exact permission set.</p>
          </Reveal>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginTop: "2.5rem" }}>
            {iamPerms.map((item, i) => (
              <Reveal key={item.service} delay={i * 45}>
                <PermissionRow {...item} />
              </Reveal>
            ))}
          </div>

          {/* IAM JSON block */}
          <Reveal delay={150}>
            <div style={{ marginTop: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "0.7rem" }}>
                <Tag color="#fb923c">Quick Setup</Tag>
                <span style={{ color: "#334155", fontSize: "0.78rem" }}>Create an IAM user and attach this JSON policy</span>
              </div>
              <div style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "1.5rem 1.75rem", overflowX: "auto" }}>
                <pre style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.74rem", color: "#94a3b8", lineHeight: 1.8, margin: 0 }}>{`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "ec2:DescribeInstances", "ec2:DescribeInstanceStatus",
      "ec2:RebootInstances", "ec2:StartInstances", "ec2:StopInstances",
      "lambda:ListFunctions", "lambda:GetFunction",
      "lambda:InvokeFunction", "lambda:GetFunctionConfiguration",
      "rds:DescribeDBInstances", "rds:DescribeDBClusters",
      "rds:RebootDBInstance", "rds:DescribeEvents",
      "logs:DescribeLogGroups", "logs:FilterLogEvents",
      "cloudwatch:GetMetricData", "cloudwatch:ListMetrics",
      "cloudwatch:DescribeAlarms",
      "ce:GetCostAndUsage", "ce:GetCostForecast",
      "sts:GetCallerIdentity"
    ],
    "Resource": "*"
  }]
}`}</pre>
              </div>
            </div>
          </Reveal>

          {/* 5-step onboarding */}
          <Reveal delay={100}>
            <div style={{ marginTop: "2.5rem" }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#e2e8f0", marginBottom: "1.15rem" }}>First-time Setup — 5 minutes</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: "0.8rem" }}>
                {[
                  ["1","Register","Create your account at /register","#38bdf8"],
                  ["2","AWS Credentials","Paste Access Key + Secret in Settings","#fb923c"],
                  ["3","Add LLM Key","Add a Gemini / GPT / Claude API key","#a78bfa"],
                  ["4","Init Agents","Click \"Initialize Agents\" in the Agents page","#34d399"],
                  ["5","Analyse Logs","Select a CloudWatch log group → Analyse with AI 🎉","#f472b6"],
                ].map(([n,t,b,c]) => (
                  <GlowCard key={n} accent={c} style={{ padding: "1.25rem" }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "2rem", color: c, lineHeight: 1 }}>{n}</div>
                    <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, color: "#e2e8f0", marginTop: "0.5rem", marginBottom: "0.3rem", fontSize: "0.88rem" }}>{t}</div>
                    <div style={{ color: "#475569", fontSize: "0.78rem", lineHeight: 1.55 }}>{b}</div>
                  </GlowCard>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* ══ FEATURES ══ */}
        <section style={sec}>
          <Reveal>
            <Tag color="#34d399">Built for Production</Tag>
            <h2 style={{ ...heading, marginTop: "0.85rem", marginBottom: "2.75rem" }}>Everything you need to trust your infra</h2>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1rem" }}>
            {[
              ["📡","Real-time WebSocket","Agent state changes flow Redis → Socket.IO → UI in milliseconds. The dashboard breathes with your infrastructure — no polling ever.","#34d399"],
              ["🔐","AES-256-GCM Encryption","Every credential and API key is encrypted at rest. JWT endpoints, bcrypt password hashing. Keys never appear in logs or responses.","#a78bfa"],
              ["🏢","True Multi-tenancy","Each company gets its own agent instances, credentials, and LLM configs. A dedicated orchestrator singleton per company with full isolation.","#38bdf8"],
              ["🧠","Agent Memory & Learning","Agents store outcomes and prune memory by importance score. Confidence scoring improves with each analysis run using weighted metrics.","#fb923c"],
              ["🔁","Resilient by Design","Every agent action wraps in executeWithTracking() with automatic retry and exponential backoff. Fails gracefully and rolls back.","#f472b6"],
              ["📊","Rich Dashboard","Recharts-powered area/bar/pie charts for incidents, anomalies, agent performance, cost breakdowns, and resource health scores.","#facc15"],
            ].map(([icon,title,body,color], i) => (
              <Reveal key={title} delay={i * 55}>
                <GlowCard accent={color} style={{ padding: "2rem", height: "100%" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `${color}15`, border: `1px solid ${color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", marginBottom: "1rem" }}>{icon}</div>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: "0.98rem", color: "#f1f5f9", marginBottom: "0.5rem", letterSpacing: "-0.01em" }}>{title}</div>
                  <div style={{ color: "#475569", fontSize: "0.83rem", lineHeight: 1.7 }}>{body}</div>
                </GlowCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══ CTA ══ */}
        <section style={{ padding: "4rem clamp(1.5rem,8vw,8rem) 8rem" }}>
          <Reveal>
            <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg,rgba(14,165,233,0.07),rgba(99,102,241,0.07))", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "24px", textAlign: "center", padding: "6rem clamp(2rem,8vw,8rem)" }}>
              <div style={{ position: "absolute", top: "-80px", left: "50%", transform: "translateX(-50%)", width: "500px", height: "500px", background: "radial-gradient(circle,rgba(99,102,241,0.12),transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
                <Tag color="#818cf8">Ship it</Tag>
                <h2 style={{ ...heading, fontSize: "clamp(2.2rem,5vw,3.5rem)", marginTop: "1.25rem", marginBottom: "1rem" }}>Let your AI team take the night shift</h2>
                <p style={{ color: "#475569", fontSize: "1rem", lineHeight: 1.75, maxWidth: "460px", margin: "0 auto 2.5rem" }}>Connect AWS, add an LLM key, and watch 7 agents keep your infrastructure healthy — automatically, 24/7.</p>
                <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
                  {isAuthenticated
                    ? <Link to="/dashboard" className="hbtn" style={{ ...btnP, padding: "1rem 2.5rem", fontSize: "1rem" }}>Open Dashboard →</Link>
                    : (<><Link to="/register" className="hbtn" style={{ ...btnP, padding: "1rem 2.5rem", fontSize: "1rem" }}>Get started — it's free →</Link><Link to="/login" className="obtn" style={{ ...btnO, padding: "1rem 2rem", fontSize: "1rem" }}>Sign In</Link></>)
                  }
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ══ FOOTER ══ */}
        <footer style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "2rem clamp(1.5rem,8vw,8rem)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ThunderLogo size={24} />
            <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, color: "orange", fontSize: "0.88rem" }}>HelixAI</span>
          </div>
          <div style={{ color: "orange", fontSize: "0.76rem" }}>© {new Date().getFullYear()} HelixAI. All rights reserved.</div>
          <div style={{ display: "flex", gap: "1.4rem" }}>
            {[["#agents","Agents"],["#pipeline","Pipeline"],["#aws","AWS Setup"],["#llm","LLM"]].map(([h,l]) => (
              <a key={h} href={h} style={{ color: "orange", textDecoration: "none", fontSize: "0.76rem", transition: "color 0.2s" }}
                onMouseEnter={e=>e.target.style.color="#475569"} onMouseLeave={e=>e.target.style.color="orange"}>{l}</a>
            ))}
            <Link to="/login" style={{ color: "orange", textDecoration: "none", fontSize: "0.76rem" }}>Sign In</Link>
          </div>
        </footer>

      </div>
    </>
  );
}