export async function summarize(text) {
const d = new Date();
const pad = (n) => String(n).padStart(2, "0");
const nowLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
d.getHours()
)}:${pad(d.getMinutes())}`;
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const res = await fetch("/api/summarize", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ text, nowLocal, timeZone }),
});

const data = await res.json().catch(() => ({}));
if (!res.ok) throw new Error(data.error || "Request failed");

const items = (data.actionItems || []).map((i) => {
let deadline = typeof i.deadline === "string" ? i.deadline : null;
if (deadline && deadline.length === 10) deadline += "T09:00";
const priority = ["high", "medium", "low"].includes(i.priority) ? i.priority : "medium";
return {
id: crypto.randomUUID(),
task: String(i.task || "Untitled task"),
deadline,
priority,
owner: i.owner || null,
done: false,
notified: false,
};
});

return { summary: String(data.summary || ""), items };
}