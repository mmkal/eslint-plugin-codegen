// mostly faithfully copied from https://github.com/sindresorhus/make-synchronous
// because it's esm-only and i still want to support cjs ppl
// also i removed subsume dependency
import {Buffer} from 'node:buffer'
import childProcess from 'node:child_process'
import process from 'node:process'
import v8 from 'node:v8'

const HUNDRED_MEGABYTES = 1000 * 1000 * 100

export function makeSynchronous<A extends unknown[], T>(
  function_: (...arguments_: A) => Promise<T>,
): (...arguments_: A) => T {
  return (...arguments_: A) => {
    let serializedArguments: string
    try {
      serializedArguments = v8.serialize(arguments_).toString('hex')
    } catch (e) {
      throw new Error('Failed to serialize arguments', {cause: e})
    }

    // TODO: Use top-level await here when targeting Node.js 14.
    const input = `
      import v8 from 'node:v8';

      const send = value => {
      	const serialized = v8.serialize(value).toString('hex');
      	process.stdout.write(serialized);
      };

      (async () => {
      	try {
      		const arguments_ = v8.deserialize(Buffer.from('${serializedArguments}', 'hex'));
      		const result = await (${function_.toString()})(...arguments_);
      		send({result});
      	} catch (error) {
      		send({error});
      	}
      })();
    `

    const {
      error: subprocessError,
      stdout,
      stderr,
    } = childProcess.spawnSync(process.execPath, ['--input-type=module', '-'], {
      input,
      encoding: 'utf8',
      maxBuffer: HUNDRED_MEGABYTES,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
      },
    })

    if (subprocessError) {
      throw subprocessError
    }

    const data = v8.deserialize(Buffer.from(stdout, 'hex')) as {error?: Error; result?: T}

    // process.stdout.write(rest);
    process.stderr.write(stderr)

    if (!data) {
      return void 0 as never
    }

    const {error, result} = data

    if (error) {
      throw error
    }

    return result as T
  }
}
