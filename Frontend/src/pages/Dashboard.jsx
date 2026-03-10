import { useState, useEffect } from "react";
import { apiService } from "../services/apiService";

const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    background: "#1e293b", border: `1px solid ${color}33`,
    borderRadius: 12, padding: "20px 24px", borderLeft: `4px solid ${color}`
  }}>
    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{label}</div>
  </div>
);

const FlowStep = ({ icon, title, desc, color }) => (
  <div style={{
    background: "#1e293b", border: `1px solid ${color}44`,
    borderRadius: 10, padding: "16px", textAlign: "center", flex: 1
  }}>
    <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontWeight: 600, color, fontSize: 13 }}>{title}</div>
    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{desc}</div>
  </div>
);

export default function Dashboard({ setTab }) {
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [running, setRunning]   = useState(false);
  const [runResult, setRunResult] = useState(null);

  useEffect(() => {
    apiService.getStats()
      .then(setStats)
      .catch(() => setStats({ error: true }))
      .finally(() => setLoading(false));
  }, []);

  async function loadSample() {
    setLoading(true);
    await apiService.loadSample();
    const s = await apiService.getStats();
    setStats(s);
    setLoading(false);
  }

  async function runAgent() {
    setRunning(true);
    setRunResult(null);
    try {
      const r = await apiService.manualRun();
      setRunResult({ success: true, msg: r.message });
    } catch (e) {
      setRunResult({ success: false, msg: e.message });
    }
    setRunning(false);
  }

  return (
    <div>
      <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>Agent Dashboard</h2>
      <p style={{ color: "#64748b", margin: "0 0 28px", fontSize: 14 }}>
        Real-time overview of your EMI reminder voice agent
      </p>

      {/* Agentic Loop Flow */}
      <div style={{
        background: "#1e293b", borderRadius: 12, padding: "20px 24px",
        marginBottom: 28, border: "1px solid #334155"
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#60a5fa", marginBottom: 14 }}>
          🔄 Agentic Loop
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <FlowStep icon="🗄️" title="Observe"  desc="Load customer DB"      color="#60a5fa" />
          <div style={{ color: "#334155", fontSize: 20 }}>→</div>
          <FlowStep icon="🧠" title="Reason"   desc="AI decides who to call" color="#a78bfa" />
          <div style={{ color: "#334155", fontSize: 20 }}>→</div>
          <FlowStep icon="📞" title="Act"       desc="Make real phone call"  color="#34d399" />
          <div style={{ color: "#334155", fontSize: 20 }}>→</div>
          <FlowStep icon="🎙️" title="Listen"   desc="Capture response"      color="#fbbf24" />
          <div style={{ color: "#334155", fontSize: 20 }}>→</div>
          <FlowStep icon="📝" title="Update"   desc="Log & schedule next"   color="#f87171" />
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading stats...</div>
      ) : stats?.error ? (
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ color: "#94a3b8", marginBottom: 16 }}>No data yet. Load sample data to get started.</div>
          <button onClick={loadSample} style={{
            background: "#3b82f6", color: "#fff", border: "none",
            borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 14, fontWeight: 600
          }}>
            Load Sample Dataset
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16, marginBottom: 28 }}>
            <StatCard icon="👥" label="Total Customers"    value={stats.total_customers}   color="#60a5fa" />
            <StatCard icon="⏰" label="Due This Week"      value={stats.due_this_week}     color="#fbbf24" />
            <StatCard icon="📞" label="Calls Made"         value={stats.calls_made}        color="#34d399" />
            <StatCard icon="✅" label="Payments Promised"  value={stats.payments_promised} color="#a78bfa" />
            <StatCard icon="⚠️" label="High Risk"          value={stats.high_risk_count}   color="#f87171" />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
            <button onClick={runAgent} disabled={running} style={{
              background: running ? "#374151" : "linear-gradient(135deg, #1d4ed8, #3b82f6)",
              color: "#fff", border: "none", borderRadius: 8,
              padding: "12px 28px", cursor: running ? "not-allowed" : "pointer",
              fontSize: 15, fontWeight: 600
            }}>
              {running ? "🔄 Running Agent..." : "🚀 Run Agent Now"}
            </button>
            <button onClick={() => setTab("Customers")} style={{
              background: "#1e293b", color: "#60a5fa", border: "1px solid #3b82f6",
              borderRadius: 8, padding: "12px 24px", cursor: "pointer", fontSize: 14
            }}>
              👥 View Customers
            </button>
            <button onClick={() => setTab("Upload Data")} style={{
              background: "#1e293b", color: "#a78bfa", border: "1px solid #7c3aed",
