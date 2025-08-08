/* eslint-disable unicorn/no-thenable */
/* eslint-disable @rushstack/packlets/circular-deps */
/* eslint-disable @rushstack/packlets/mechanics */
const rethrow = e => {
  throw e
}

const createSyncPromise = val => {
  const self = {
    syncPromise: true,
    val,
    then: (onok = x => x, onerr = rethrow) => {
      let next
      try {
        next = onok(val)
      } catch (e) {
        next = onerr(e)
      }
      return SyncPromise.resolve(next)
    },
    catch: () => {
      throw new Error(`catch not supported by sync promises`)
    },
  }
  return self
}

/**
 * @type {Pick<typeof Promise, 'resolve' | 'reject' | 'all'>}
 * A partial replacement implementation of `Promise` which _doesn't_ use the event loop. plv8 triggers
 * require return values synchronously, so this executes the `.then` callbacks immediately. It doesn't
 * support `.catch` because errors are thrown synchronously too.
 */
export const SyncPromise = {
  resolve: val => (val && typeof val.then === 'function' ? val : createSyncPromise(val)),
  reject: rethrow,
  all: promises =>
    SyncPromise.resolve(
      promises.map(p => {
        /** @type {{value: any}} */
        let result = null
        // eslint-disable-next-line promise/catch-or-return
        SyncPromise.resolve(p).then(value => (result = {value}))
        return result.value
      }),
    ),
}
