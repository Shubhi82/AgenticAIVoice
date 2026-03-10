import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import CustomerTable from "./components/CustomerTable";
import CallLogs from "./components/CallLogs";
import UploadData from "./components/UploadData";
import VoiceTest from "./components/VoiceTest";

const TABS = ["Dashboard", "Customers", "Call Logs", "Upload Data", "Test Agent"];

export default function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>

      {/* Header */}
      <header style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
        borderBottom: "1px solid #1e40af",
        padding: "16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 28 }}>📞</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 20, color: "#60a5fa" }}>EMI Voice Agent</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Agentic AI · Real Phone Calls · Auto Reminders</div>
          </div>
        </div>
        <div style={{
          background: "#22c55e22", border: "1px solid #22c55e",
          color: "#22c55e", borderRadius: 20, padding: "4px 14px", fontSize: 12
        }}>
          ● LIVE
        </div>
      </header>

      {/* Nav */}
      <nav style={{
        background: "#1e293b", borderBottom: "1px solid #334155",
        padding: "0 32px", display: "flex", gap: 4
      }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? "#3b82f6" : "transparent",
              border: "none", color: activeTab === tab ? "#fff" : "#94a3b8",
              padding: "12px 20px", cursor: "pointer", borderRadius: "6px 6px 0 0",
              fontWeight: activeTab === tab ? 600 : 400, fontSize: 14,
              transition: "all 0.2s"
            }}
          >
            {tab === "Dashboard"   && "📊 "}
            {tab === "Customers"   && "👥 "}
            {tab === "Call Logs"   && "📋 "}
            {tab === "Upload Data" && "📁 "}
            {tab === "Test Agent"  && "🎤 "}
            {tab}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ padding: "28px 32px" }}>
        {activeTab === "Dashboard"   && <Dashboard setTab={setActiveTab} />}
        {activeTab === "Customers"   && <CustomerTable />}
        {activeTab === "Call Logs"   && <CallLogs />}
        {activeTab === "Upload Data" && <UploadData />}
        {activeTab === "Test Agent"  && <VoiceTest />}
      </main>

    </div>
  );
}
