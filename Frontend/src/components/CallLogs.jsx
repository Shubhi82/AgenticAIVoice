import { useState, useEffect } from "react";
import { apiService } from "../services/apiService";

const DECISION_COLORS = {
  PAYMENT_PROMISED: "#22c55e", NEED_EXTENSION: "#fbbf24",
  REFUSED: "#ef4444", ESCALATE_HUMAN: "#f97316",
  NO_ANSWER: "#64748b", initiated: "#3b82f6",
};

export default function CallLogs() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getCallLogs()
      .then(d => setLogs(d.logs || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700 }}>
        📋 Call History ({logs.length})
      </h2>

      {loading ? (
        <div style={{ color: "#64748b", textAlign: "center", padding: 40 }}>Loading...</div>
      ) : logs.length === 0 ? (
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 40, textAlign: "center", color: "#64748b" }}>
          No calls made yet. Go to Customers tab and click Call to start.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1e293b", borderBottom: "2px solid #334155" }}>
              {["#", "Customer ID", "Called At", "Transcript", "Decision", "Outcome", "Call SID"].map(h => (
                <th key={h} style={{
                  padding: "10px 14px", textAlign: "left",
                  fontSize: 11, color: "#94a3b8", fontWeight: 600
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={log.id} style={{
                background: i % 2 === 0 ? "#0f172a" : "#111827",
                borderBottom: "1px solid #1e293b"
              }}>
                <td style={{ padding: "12px 14px", color: "#64748b", fontSize: 12 }}>{log.id}</td>
                <td style={{ padding: "12px 14px", fontWeight: 600 }}>{log.customer_id}</td>
                <td style={{ padding: "12px 14px", color: "#94a3b8", fontSize: 12 }}>{log.called_at}</td>
                <td style={{ padding: "12px 14px", color: "#94a3b8", fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.transcript || "—"}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{
                    background: `${DECISION_COLORS[log.decision] || "#94a3b8"}22`,
                    color: DECISION_COLORS[log.decision] || "#94a3b8",
                    border: `1px solid ${DECISION_COLORS[log.decision] || "#94a3b8"}55`,
                    borderRadius: 12, padding: "2px 10px", fontSize: 11, fontWeight: 600
                  }}>
                    {log.decision || "—"}
                  </span>
                </td>
                <td style={{ padding: "12px 14px", color: "#94a3b8", fontSize: 12 }}>{log.outcome}</td>
                <td style={{ padding: "12px 14px", color: "#64748b", fontSize: 11, fontFamily: "monospace" }}>
                  {log.call_sid ? log.call_sid.slice(0, 16) + "..." : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
