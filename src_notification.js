export const supported = () => typeof window !== "undefined" && "Notification" in window;

export const permission = () => (supported() ? Notification.permission : "unsupported");

export async function requestPermission() {
if (!supported()) return "unsupported";
return Notification.requestPermission();
}

export function notify(title, body) {
if (supported() && Notification.permission === "granted") {
try {
new Notification(title, { body });
} catch {
/* some mobile browsers block this; the in-app banner still shows */
}
}
}