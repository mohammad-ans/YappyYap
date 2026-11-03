// Pulls the server's message out of an axios error.
// Voice requests use responseType "arraybuffer", so an error body arrives as bytes and has to be decoded first.
export function errMsg(err, fallback = "Something went wrong") {
    try {
        let data = err?.response?.data
        if (data instanceof ArrayBuffer)
            data = JSON.parse(new TextDecoder().decode(data))
        return data?.detail?.[0]?.msg || fallback
    } catch {
        return fallback
    }
}
