import { useState } from "react";
import { apiService } from "../services/apiService";

export default function UploadData() {
  const [file, setFile]       = useState(null);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  async function upload() {
    if (!file) return;
    setLoading(true); setResult(null);
    try {
      const r = await apiService.uploadCSV(file);
      setResult({ success: true, ...r });
    } catch (e) {
      setResult({ success: false, error: e.message });
    }
    setLoading(false);
  }

  async function loadSample() {
    setLoading(true); setResult(null);
    try {
      const r = await apiService.loadSample();
      setResult({ success: true, ...r });
    } catch (e) {
      setResult({ success: false, error: e.message });
    }
    setLoading(false);
  }

  return (
    <div>
      <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>📁 Upload Customer Data</h2>
      <p style={{ color: "#64748b", margin: "0 0 28px", fontSize: 14 }}>
        Upload any CSV with customer loan data — from Kaggle or your own source
      </p>

      {/* Required columns info */}
      <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, marginBottom: 20, border: "1px solid #334155" }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Required CSV Columns</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {["customer_id", "name", "phone", "emi_amount", "emi_due_date"].map(col => (
            <span key={col} style={{
              background: "#dc2626", color: "#fff",
              borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600
            }}>
              {col}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>Optional:</span>
          {["email", "loan_amount", "last_payment_date", "missed_payments", "risk_score", "status"].map(col => (
            <span key={col} style={{
              background: "#1e3a5f", color: "#60a5fa",
              borderRadius: 6, padding: "3px 10px", fontSize: 12
            }}>
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* Upload area */}
      <div style={{
        background: "#1e293b", borderRadius: 12, padding: 32,
        border: "2px dashed #334155", textAlign: "center", marginBottom: 20
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
        <div style={{ color: "#94a3b8", marginBottom: 16 }}>
          Upload a CSV from Kaggle (e.g. Home Credit, Give Me Some Credit) or your own dataset
        </div>
        <input
          type="file"
          accept=".csv"
          onChange={e => setFile(e.target.files[0])}
          style={{ marginBottom: 16 }}
        />
        {file && (
          <div style={{ color: "#60a5fa", marginBottom: 16 }}>📄 {file.name}</div>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={upload} disabled={!file || loading} style={{
            background: !file ? "#374151" : "#1d4ed8",
            color: "#fff", border: "none", borderRadius: 8,
            padding: "12px 28px", cursor: !file ? "not-allowed" : "pointer",
            fontSize: 14, fontWeight: 600
          }}>
            {loading ? "Uploading..." : "📤 Upload CSV"}
          </button>
          <button onClick={loadSample} disabled={loading} style={{
            background: "#1e293b", color: "#a78bfa", border: "1px solid #7c3aed",
            borderRadius: 8, padding: "12px 24px", cursor: "pointer", fontSize: 14
          }}>
            🎯 Load Sample Data
          </button>
        </div>
      </div>

      {result && (
        <div style={{
          background: result.success ? "#14532d22" : "#7f1d1d22",
          border: `1px solid ${result.success ? "#22c55e" : "#ef4444"}`,
          borderRadius: 8, padding: "16px 20px",
          color: result.success ? "#22c55e" : "#ef4444"
        }}>
          {result.success
            ? `✅ Imported ${result.imported} customers (${result.skipped} skipped)`
            : `❌ ${result.error}`}
        </div>
      )}
    </div>
  );
}
