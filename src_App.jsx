import { useEffect, useRef, useState } from "react";
import { summarize } from "./api";
import { load, save } from "./storage";
import { notify, permission, requestPermission } from "./notifications";

const ORDER = { high: 0, medium: 1, low: 2 };
const HOUR = 60 * 60 * 1000;

const toInput = (v) => (v ? v.slice(0, 16) : "");
const fmt = (v) => (v ? new Date(v).toLocaleString() : "No deadline");

export default function App() {
const [data, setData] = useState(load);
const [text, setText] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [alerts, setAlerts] = useState([]);
const [perm, setPerm] = useState(permission());
const dataRef = useRef(data);

useEffect(() => {
dataRef.current = data;
save(data);
}, [data]);

// Check deadlines every 30s: notify when due within 1 hour or overdue
useEffect(() => {
const check = () => {
const now = Date.now();
const due = dataRef.current.items.filter((it) => {
if (it.done || it.notified || !it.deadline) return false;
const t = new Date(it.deadline).getTime();
return !isNaN(t) && t - now <= HOUR;
});
if (!due.length) return;
due.forEach((it) => notify("Deadline soon: " + it.task, fmt(it.deadline)));
const ids = new Set(due.map((d) => d.id));
setAlerts((a) => [...a, ...due.map((d) => `${d.task} (${fmt(d.deadline)})`)]);
setData((d) => ({
...d,
items: d.items.map((it) => (ids.has(it.id) ? { ...it, notified: true } : it)),
}));
};
check();
const id = setInterval(check, 30000);
return () => clearInterval(id);
}, []);

async function handleSummarize() {
if (!text.trim()) return;
setLoading(true);
setError("");
try {
const { summary, items } = await summarize(text);
const summaryId = crypto.randomUUID();
setData((d) => ({
summaries: [{ id: summaryId, createdAt: new Date().toISOString(), summary }, ...d.summaries],
items: [...items.map((i) => ({ ...i, summaryId })), ...d.items],
}));
setText("");
} catch (e) {
setError(e.message);
} finally {
setLoading(false);
}
}

const updateItem = (id, patch) =>
setData((d) => ({
...d,
items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
}));

const removeItem = (id) =>
setData((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) }));

const sorted = [...data.items].sort(
(a, b) =>
Number(a.done) - Number(b.done) ||
ORDER[a.priority] - ORDER[b.priority] ||
(a.deadline || "9").localeCompare(b.deadline || "9")
);

return (
<div className="wrap">
<h1>What Did I Miss?</h1>

{perm !== "granted" && perm !== "unsupported" && (
<button className="secondary" onClick={async () => setPerm(await requestPermission())}>
Enable deadline notifications
</button>
)}

{alerts.map((a, i) => (
<div className="alert" key={i}>
⏰ Due soon: {a}
<button className="x" onClick={() => setAlerts((x) => x.filter((_, j) => j !== i))}>
×
</button>
</div>
))}

<textarea
rows={8}
placeholder="Paste a conversation, email thread, or meeting notes..."
value={text}
onChange={(e) => setText(e.target.value)}
/>
<button onClick={handleSummarize} disabled={loading || !text.trim()}>
{loading ? "Summarizing..." : "Summarize"}
</button>
{error && <p className="error">{error}</p>}

<h2>Action items</h2>
{sorted.length === 0 && <p className="muted">Nothing yet.</p>}
{sorted.map((it) => (
<div key={it.id} className={`item ${it.done ? "done" : ""}`}>
<input
type="checkbox"
checked={it.done}
onChange={(e) => updateItem(it.id, { done: e.target.checked })}
/>
<div className="grow">
<div>
{it.task} {it.owner && <span className="muted">({it.owner})</span>}
</div>
<input
type="datetime-local"
value={toInput(it.deadline)}
onChange={(e) =>
updateItem(it.id, { deadline: e.target.value || null, notified: false })
}
/>
</div>
<select
className={`pri ${it.priority}`}
value={it.priority}
onChange={(e) => updateItem(it.id, { priority: e.target.value })}
>
<option value="high">high</option>
<option value="medium">medium</option>
<option value="low">low</option>
</select>
<button className="x" onClick={() => removeItem(it.id)}>
×
</button>
</div>
))}

<h2>Summaries</h2>
{data.summaries.length === 0 && <p className="muted">Nothing yet.</p>}
{data.summaries.map((s) => (
<div key={s.id} className="card">
<div className="muted">{new Date(s.createdAt).toLocaleString()}</div>
<p>{s.summary}</p>
</div>
))}
</div>
);
}