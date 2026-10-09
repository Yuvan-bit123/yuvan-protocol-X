export default async function handler(req, res) {
if (req.method !== "POST") {
return res.status(405).json({ error: "Method not allowed" });
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
}

const { text, nowLocal, timeZone } = req.body || {};
if (!text || typeof text !== "string" || text.length > 20000) {
return res.status(400).json({ error: "Provide conversation text (max 20,000 chars)" });
}

const model = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

const system = `You analyze a pasted conversation (chat, email thread, meeting notes) for someone who missed it.
Current local time: ${nowLocal || "unknown"} (${timeZone || "unknown timezone"}).
Respond with ONLY valid JSON, no markdown, in this exact shape:
{"summary": "2-4 sentence summary of what was missed",
"actionItems": [{"task": "short task", "deadline": "YYYY-MM-DDTHH:mm or null", "priority": "high|medium|low", "owner": "person or null"}]}
Resolve relative deadlines ("tomorrow", "Friday") using the current local time. Use null if no deadline is stated. Do not invent tasks.`;

try {
const r = await fetch("https://api.anthropic.com/v1/messages", {
method: "POST",
headers: {
"content-type": "application/json",
"x-api-key": apiKey,
"anthropic-version": "2023-06-01",
},
body: JSON.stringify({
model,
max_tokens: 1500,
system,
messages: [{ role: "user", content: text }],
}),
});

const data = await r.json();
if (!r.ok) {
return res.status(502).json({ error: data?.error?.message || "AI request failed" });
}

const raw = (data.content || []).map((b) => b.text || "").join("");
const cleaned = raw.replace(/```json|```/g, "").trim();
const parsed = JSON.parse(cleaned);
return res.status(200).json(parsed);
} catch (e) {
return res.status(500).json({ error: "Could not process AI response: " + e.message });
}
}