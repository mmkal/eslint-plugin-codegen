import * as memfs from 'memfs'
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

export const gitCloneMem = (params: {repoUrl: string; ref?: string}) => {
  const fsJson = makeSynchronous(async (_params: typeof params) => {
    const dir = '/repo'
    const _memfs = await import('memfs')
    const git = await import('isomorphic-git')
    const fs = _memfs.Volume.fromJSON({})
    const gitHttp = await import('isomorphic-git/http/node')
    await git.clone({
      fs,
      http: gitHttp,
      dir,
      url: _params.repoUrl,
      ref: _params.ref || 'main',
    })
    return fs.toJSON()
  })

  const fs = memfs.Volume.fromJSON(fsJson(params))
  // todo: sync-ified version of `isomorphic-git` like in plv8-git
  return {fs}
}
