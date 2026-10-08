// Keeps sign in state across page refreshes and the Google redirect (per tab)
const NEXT_KEY = "authNext"
const EMAIL_KEY = "otpEmail"

export function saveNextFromUrl() {
    const next = new URLSearchParams(window.location.search).get("next")
    // Only same-site paths, so the link cannot send users to another site
    if (next && next.startsWith("/") && !next.startsWith("//"))
        sessionStorage.setItem(NEXT_KEY, next)
}

export function takeNext(fallback = "/chat") {
    const next = sessionStorage.getItem(NEXT_KEY)
    sessionStorage.removeItem(NEXT_KEY)
    return next || fallback
}

export function saveOtpEmail(email) {
    sessionStorage.setItem(EMAIL_KEY, email)
}

export function getOtpEmail() {
    return sessionStorage.getItem(EMAIL_KEY) || ""
}

export function clearOtpEmail() {
    sessionStorage.removeItem(EMAIL_KEY)
}
