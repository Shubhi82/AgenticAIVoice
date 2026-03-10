const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const apiService = {
  getStats:        ()         => api("/api/customers/stats"),
  getCustomers:    ()         => api("/api/customers"),
  getDueCustomers: ()         => api("/api/customers/due"),
  getCustomer:     (id)       => api(`/api/customers/${id}`),
  loadSample:      ()         => api("/api/load-sample", { method: "POST" }),
  uploadCSV:       (file)     => { const fd = new FormData(); fd.append("file", file); return api("/api/upload", { method: "POST", body: fd }); },
  triggerCall:     (id)       => api(`/api/call/${id}`, { method: "POST" }),
  manualRun:       ()         => api("/api/call/manual-run", { method: "POST" }),
  getCallLogs:     (id)       => api(`/api/call/logs${id ? `?customer_id=${id}` : ""}`),
  previewCall:     (id)       => api(`/api/preview/${id}`),
  testText:        (id, text) => { const fd = new FormData(); fd.set("customer_id", id); fd.set("text", text); return api("/api/test/text", { method: "POST", body: fd }); },
  testVoice:       (id, file) => { const fd = new FormData(); fd.set("customer_id", id); fd.append("file", file); return api("/api/test/voice", { method: "POST", body: fd }); },
};
