// Backend service URLs. Production hosts are the defaults; `npm run dev` overrides them
// with the localhost values in .env.development (or set VITE_* variables on the host).
const env = import.meta.env

export const AUTH_URL = env.VITE_AUTH_URL || "https://auth.yappyyap.online"
export const GROUPS_URL = env.VITE_GROUPS_URL || "https://groups.yappyyap.online"
export const TEXTCHAT_URL = env.VITE_TEXTCHAT_URL || "https://textchat.yappyyap.online"
export const VOICECHAT_URL = env.VITE_VOICECHAT_URL || "https://voice.yappyyap.online"
export const DM_URL = env.VITE_DM_URL || "https://chat.yappyyap.online"
export const DASHBOARD_URL = env.VITE_DASHBOARD_URL || "https://dashboard.yappyyap.online"
export const API_URL = env.VITE_API_URL || "https://api.yappyyap.online"

// http(s)://host -> ws(s)://host for websocket connections
export function toWs(url) {
    return url.replace(/^http/, "ws")
}
