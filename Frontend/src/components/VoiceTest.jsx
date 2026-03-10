import { useState, useRef, useEffect } from "react";
import { apiService } from "../services/apiService";

const DECISION_COLORS = {
  PAYMENT_PROMISED: "#22c55e", NEED_EXTENSION: "#fbbf24",
  REFUSED: "#ef4444", ESCALATE_HUMAN: "#f97316",
  NO_ANSWER: "#64748b", UNCLEAR: "#94a3b8",
};
const DECISION_ICONS = {
  PAYMENT_PROMISED: "✅", NEED_EXTENSION: "⏳", REFUSED: "❌",
  ESCALATE_HUMAN: "🧑‍💼", NO_ANSWER: "🔇", UNCLEAR: "❓",
};

const QUICK_TESTS = [
  "I will pay tomorrow",
  "I need more time to pay",
  "I cannot pay, I lost my job",
  "I already paid",
  "Let me speak to your manager",
];

export default function VoiceTest() {
  const [customers, setCustomers]     = useState([]);
  const [selectedId, setSelectedId]   = useState("");
  const [textInput, setTextInput]     = useState("");
  const [result, setResult]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [recording, setRecording]     = useState(false);
  const [audioBlob, setAudioBlob]     = useState(null);
  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    apiService.getCustomers().then(d => {
      setCustomers(d.customers || []);
      if (d.customers?.length) setSelectedId(d.customers[0].customer_id);
    });
  }, []);

  const selectedCustomer = customers.find(c => c.customer_id === selectedId);

  async function testText() {
    if (!selectedId || !textInput.trim()) return;
    setLoading(true); setResult(null);
    try {
      const r = await apiService.testText(selectedId, textInput);
      setResult(r);
      if (r.audio_base64) new Audio(`data:audio/mp3;base64,${r.audio_base64}`).play();
    } catch (e) {
      setResult({ error: e.message });
    }
    setLoading(false);
  }

  async function startRecording() {
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRef.current = new MediaRecorder(stream);
    mediaRef.current.ondataavailable = e => chunksRef.current.push(e.data);
    mediaRef.current.onstop = () => {
      setAudioBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
    };
    mediaRef.current.start();
    setRecording(true);
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  async function testVoice() {
    if (!audioBlob || !selectedId) return;
    setLoading(true); setResult(null);
    const file = new File([audioBlob], "recording.webm", { type: "audio/webm" });
    try {
      const r = await apiService.testVoice(selectedId, file);
      setResult(r);
      if (r.audio_base64) new Audio(`data:audio/mp3;base64,${r.audio_base64}`).play();
    } catch (e) {
      setResult({ error: e.message });
    }
    setLoading(false);
  }

  return (
    <div>
      <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>🎤 Test Voice Agent</h2>
      <p style={{ color: "#64748b", margin: "0 0 28px", fontSize: 14 }}>
        Simulate what happens when a customer responds to the AI's call
      </p>

      {/* Customer selector */}
      <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, marginBottom: 20, border: "1px solid #334155" }}>
        <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 8 }}>Select Customer</label>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          style={{
            background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0",
            borderRadius: 8, padding: "10px 14px", fontSize: 14, width: "100%"
          }}
        >
          {customers.map(c => (
            <option key={c.customer_id} value={c.customer_id}>
              {c.name} — ₹{c.emi_amount} due {c.emi_due_date} (risk: {c.risk_score})
            </option>
          ))}
        </select>
        {selectedCustomer && (
          <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
            {[["Name", selectedCustomer.name], ["Phone", selectedCustomer.phone],
              ["EMI", `₹${selectedCustomer.emi_amount}`], ["Due", selectedCustomer.emi_due_date],
              ["Risk", selectedCustomer.risk_score], ["Missed", selectedCustomer.missed_payments + " payments"]
            ].map(([k, v]) => (
              <div key={k} style={{ fontSize: 12 }}>
                <span style={{ color: "#64748b" }}>{k}: </span>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

        {/* Text test */}
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155" }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>💬 Text Input</div>
          <textarea
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="Type what the customer would say..."
            style={{
              background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0",
              borderRadius: 8, padding: "10px 14px", fontSize: 14,
              width: "100%", minHeight: 80, resize: "vertical", marginBottom: 12
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {QUICK_TESTS.map(t => (
              <button key={t} onClick={() => setTextInput(t)} style={{
                background: "#0f172a", border: "1px solid #334155", color: "#94a3b8",
                borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11
              }}>
                {t}
              </button>
            ))}
          </div>
          <button onClick={testText} disabled={loading || !textInput.trim()} style={{
            background: "#1d4ed8", color: "#fff", border: "none",
            borderRadius: 8, padding: "10px 20px", cursor: "pointer",
            fontSize: 14, fontWeight: 600, width: "100%"
          }}>
            {loading ? "Processing..." : "🧠 Run Agent"}
          </button>
        </div>

        {/* Voice test */}
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155" }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>🎙️ Voice Input (Mic)</div>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <button
              onClick={recording ? stopRecording : startRecording}
              style={{
                width: 80, height: 80, borderRadius: "50%",
                background: recording ? "#dc2626" : "#1d4ed8",
                border: recording ? "3px solid #ef4444" : "3px solid #3b82f6",
                cursor: "pointer", fontSize: 28, marginBottom: 12,
                display: "block", margin: "0 auto 12px"
              }}
            >
              {recording ? "⏹️" : "🎙️"}
            </button>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12 }}>
              {recording ? "Recording... Click to stop" : audioBlob ? "Recording ready ✅" : "Click to record"}
            </div>
            {audioBlob && !recording && (
              <button onClick={testVoice} disabled={loading} style={{
                background: "#7c3aed", color: "#fff", border: "none",
                borderRadius: 8, padding: "10px 20px", cursor: "pointer",
                fontSize: 14, fontWeight: 600, width: "100%"
              }}>
                {loading ? "Processing..." : "🧠 Analyze Voice"}
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#475569", textAlign: "center" }}>
            Uses OpenAI Whisper for transcription
          </div>
        </div>

      </div>

      {/* Result */}
      {result && (
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155" }}>
          {result.error ? (
            <div style={{ color: "#ef4444" }}>❌ {result.error}</div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Agent Decision Result</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>CUSTOMER SAID</div>
                  <div style={{ background: "#0f172a", borderRadius: 8, padding: 12, fontSize: 14 }}>
                    "{result.transcript || result.input_text}"
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>AI DECISION</div>
                  <div style={{
                    background: `${DECISION_COLORS[result.decision]}22`,
                    border: `1px solid ${DECISION_COLORS[result.decision]}`,
                    borderRadius: 8, padding: "12px 16px",
                    color: DECISION_COLORS[result.decision],
                    fontWeight: 700, fontSize: 16
                  }}>
                    {DECISION_ICONS[result.decision]} {result.decision}
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>AGENT RESPONSE (spoken to customer)</div>
                  <div style={{ background: "#0f172a", borderRadius: 8, padding: 12, fontSize: 14, color: "#a78bfa" }}>
                    🗣️ "{result.agent_response}"
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>NEXT ACTION (agentic loop)</div>
                  <div style={{ background: "#0f172a", borderRadius: 8, padding: 12, fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>
                    {JSON.stringify(result.next_action, null, 2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
