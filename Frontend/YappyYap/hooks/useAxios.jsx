import axios from "axios"
import { API_URL, AUTH_URL } from "../src/config"
import { errMsg } from "../src/errMsg"

// Fired when the server says the login session is gone (cookie expired or invalid)
export const SESSION_EXPIRED = "yy:session-expired"

// Only these 401s mean a dead session. Other 401s (e.g. "You are not a member of this group") are permission errors.
const SESSION_MSGS = ["No session found.", "Invalid Token", "Expired Token", "Payload not found", "Username Not found"]

function isSessionError(err) {
    return err?.response?.status === 401 && SESSION_MSGS.includes(errMsg(err, ""))
}

export default function useAxios(){
    const instance = axios.create({
        baseURL: API_URL,
        withCredentials: true,
    })
    instance.interceptors.response.use(r => r, err => {
        // The first page-load /logincheck is expected to fail for logged-out visitors, so it is not reported
        if (isSessionError(err) && !err.config?.url?.endsWith("/logincheck"))
            window.dispatchEvent(new Event(SESSION_EXPIRED))
        return Promise.reject(err)
    })
    return instance
}

// Call when a websocket closes: sockets are only authenticated on connect, so a dead session shows up here
export function checkSession() {
    return axios.get(`${AUTH_URL}/logincheck`, { withCredentials: true }).catch(err => {
        if (isSessionError(err))
            window.dispatchEvent(new Event(SESSION_EXPIRED))
    })
}
