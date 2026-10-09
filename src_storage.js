const KEY = "wdim:data:v1";

export function load() {
try {
return JSON.parse(localStorage.getItem(KEY)) || { summaries: [], items: [] };
} catch {
return { summaries: [], items: [] };
}
}

export function save(data) {
try {
localStorage.setItem(KEY, JSON.stringify(data));
} catch {
/* storage full or blocked; ignore */
}
}