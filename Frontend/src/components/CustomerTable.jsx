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
      lo
