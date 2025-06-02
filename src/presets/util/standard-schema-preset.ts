import * as arktype from 'arktype'
import {Preset} from '../..'
import {StandardSchemaV1, looksLikeStandardSchemaFailure, prettifyStandardSchemaError} from '../../standard-schema'

type $ = {}
/** define a preset using an arktype schema definition. note that you don't have to import arktype */
export function definePreset<const def, _r = arktype.type.instantiate<def, $>>(
  def: arktype.type.validate<def, $>,
  fn: arktype.type.infer<def, $> extends Record<string, unknown>
    ? Preset<arktype.type.infer<def, $>>
    : 'Options must be an object',
): Exclude<typeof fn, string>
/** define a perset using any standard-schema definition (zod, arktype, effect, etc.) */
export function definePreset<Input extends {}, Output extends {} = Input>(
  schema: StandardSchemaV1<Input, Output>,
  fn: Preset<Output>,
): Preset<Output>

export function definePreset(schema: unknown, fn: Preset<{}> | string): typeof fn {
  if (typeof fn === 'string') {
    throw new Error(`Invalid options/implementation: ${fn}`)
  }
  if (schema && '~standard' in (schema as StandardSchemaV1)) {
    return definePresetFromStandardSchema(schema as StandardSchemaV1<{}, {}>, fn)
  }
  return definePresetFromStandardSchema(arktype.type(schema as never) as never, fn)
}

const definePresetFromStandardSchema = <Input extends {}, Output extends {} = Input>(
  schema: StandardSchemaV1,
  fn: Preset<Output>,
): Preset<Output> => {
  return params => {
    const result = schema['~standard'].validate(params.options)
    if (result instanceof Promise) {
      throw new Error('Standard Schema validation is async')
    }
    if (looksLikeStandardSchemaFailure(result)) {
      throw new Error(`Invalid options: ${prettifyStandardSchemaError(result.issues)}`)
    }
    return fn({...params, options: result.value as never})
  }
}

export type DefinePreset = typeof definePreset

// const goodPreset = definePreset({name: 'string'}, ({options}) => {
//   return options.name.slice()
// })

// const badPreset = definePreset('string', ({options}) => {
//   return options.slice()
// })
