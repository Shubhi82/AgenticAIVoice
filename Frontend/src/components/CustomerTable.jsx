import { useState, useEffect } from "react";
import { apiService } from "../services/apiService";

const RISK_COLORS   = { low: "#22c55e", medium: "#fbbf24", high: "#f87171" };
const STATUS_COLORS = {
  pending: "#fbbf24", paid: "#22c55e", overdue: "#ef4444",
  at_risk: "#f97316", high_risk: "#dc2626", calling: "#3b82f6",
  called: "#a78bfa", payment_promised: "#22c55e",
  no_answer: "#64748b", voicemail: "#94a3b8",
};

function getRiskLabel(score) {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

function Badge({ text, color }) {
  return (
    <span style={{
      background: `${color}22`, color, border: `1px solid ${color}55`,
      borderRadius: 12, padding: "2px 10px", fontSize: 11, fontWeight: 600
    }}>
      {text}
    </span>
  );
}

export default function CustomerTable() {
  const [customers, setCustomers]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState("all");
  const [calling, setCalling]         = useState({});
  const [callResult, setCallResult]   = useState({});
  const [preview, setPreview]         = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const data = await apiService.getCustomers();
    setCustomers(data.customers || []);
    setLoading(false);
  }

  async function triggerCall(customer) {
    setCalling(p => ({ ...p, [customer.customer_id]: true }));
    try {
      const r = await apiService.triggerCall(customer.customer_id);
      setCallResult(p => ({
        ...p, [customer.customer_id]: { success: true, msg: `Call placed! SID: ${r.call_sid}` }
      }));
      load();
    } catch (e) {
      setCallResult(p => ({
        ...p, [customer.customer_id]: { success: false, msg: e.message }
      }));
    }
    setCalling(p => ({ ...p, [customer.customer_id]: false }));
  }

  async function playPreview(customer) {
    setPreview(p => ({ ...p, [customer.customer_id]: "loading" }));
    try {
      const r = await apiService.previewCall(customer.customer_id);
      new Audio(`data:audio/mp3;base64,${r.audio_base64}`).play();
      setPreview(p => ({ ...p, [customer.customer_id]: "played" }));
    } catch (e) {
      setPreview(p => ({ ...p, [customer.customer_id]: "error" }));
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const displayed = customers.filter(c => {
    if (filter === "due")       return c.emi_due_date <= today;
    if (filter === "high_risk") return c.risk_score >= 0.7;
    if (filter === "uncalled")  return !["called", "payment_promised"].includes(c.call_status);
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Customers ({customers.length})</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "due", "high_risk", "uncalled"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? "#3b82f6" : "#1e293b",
              border: "1px solid #334155", color: filter === f ? "#fff" : "#94a3b8",
              borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12
            }}>
              {f === "all" ? "All" : f === "due" ? "⏰ Due" : f === "high_risk" ? "⚠️ High Risk" : "📞 Uncalled"}
            </button>
          ))}
          <button onClick={load} style={{
            background: "#1e293b", border: "1px solid #334155",
            color: "#94a3b8", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12
          }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "#64748b", textAlign: "center", padding: 40 }}>Loading...</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#1e293b", borderBottom: "2px solid #334155" }}>
                {["Customer", "Phone", "EMI (₹)", "Due Date", "Risk", "Status", "Call Status", "Actions"].map(h => (
                  <th key={h} style={{
                    padding: "10px 14px", textAlign: "left",
                    fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: 1
                  }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((c, i) => {
                const riskLabel = getRiskLabel(c.risk_score);
                const cr = callResult[c.customer_id];
                return (
                  <tr key={c.customer_id} style={{
                    background: i % 2 === 0 ? "#0f172a" : "#111827",
                    borderBottom: "1px solid #1e293b"
                  }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{c.customer_id}</div>
                    </td>
                    <td style={{ padding: "12px 14px", color: "#94a3b8", fontSize: 13 }}>{c.phone}</td>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "#60a5fa" }}>
                      ₹{c.emi_amount?.toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#94a3b8", fontSize: 13 }}>{c.emi_due_date}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <Badge text={`${riskLabel} (${c.risk_score})`} color={RISK_COLORS[riskLabel]} />
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <Badge text={c.status} color={STATUS_COLORS[c.status] || "#94a3b8"} />
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <Badge text={c.call_status || "not_called"} color={STATUS_COLORS[c.call_status] || "#64748b"} />
                      {c.agent_decision && (
                        <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>→ {c.agent_decision}</div>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6, flexDirection: "column" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => triggerCall(c)}
                            disabled={calling[c.customer_id]}
                            title="Make real phone call (requires Twilio)"
                            style={{
                              background: calling[c.customer_id] ? "#374151" : "#1d4ed8",
                              color: "#fff", border: "none", borderRadius: 6,
                              padding: "6px 10px",
                              cursor: calling[c.customer_id] ? "not-allowed" : "pointer",
                              fontSize: 12, fontWeight: 600
                            }}
                          >
                            {calling[c.customer_id] ? "📞..." : "📞 Call"}
                          </button>
                          <button
                            onClick={() => playPreview(c)}
                            title="Preview call script in browser"
                            style={{
                              background: "#1e3a5f", color: "#60a5fa",
                              border: "1px solid #1d4ed8", borderRadius: 6,
                              padding: "6px 10px", cursor: "pointer", fontSize: 12
                            }}
                          >
                            {preview[c.customer_id] === "loading" ? "⏳" : "🔊 Preview"}
                          </button>
                        </div>
                        {cr && (
                          <div style={{ fontSize: 10, color: cr.success ? "#22c55e" : "#ef4444" }}>
                            {cr.success ? "✅" : "❌"} {cr.msg}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
