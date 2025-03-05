import {makeSynchronous} from './make-synchronous'

/**
 * like `fetch`, but runs synchronously via a subprocess. Only exposes `text` for the response - you will need to parse the rest yourself.
 */
export const fetchSync = makeSynchronous(async (input: RequestInfo | URL, init?: RequestInit) => {
        const res = await fetch(input, init)
        return {
            ok: res.ok,
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
            url: res.url,
            type: res.type,
            redirected: res.redirected,
            text: await res.text(),
        }
    })
