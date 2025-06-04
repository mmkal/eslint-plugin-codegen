import {Preset} from '../..'
import {arktype} from '../../esm-modules'
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

/**
 * Use this to define a preset, with runtime and compile-time type checking, without importing any values from this library.
 * All you need to do is implement an identity function, then at lint time the plugin will do the rest.
 *
 * @example
 * ```ts
 * const definePreset: import('eslint-plugin-codegen').DefinePreset = (...args) => args
 *
 * export const myPreset = definePreset({ foo: 'string' }, ({options}) => {
 *   return options.foo.slice()
 * })
 * ```
 *
 * (you can use jsdoc to define the type in plain js too)
 * */
export type DefinePreset = <const def, _r = arktype.type.instantiate<def, $>>(
  def: arktype.type.validate<def, $>,
  fn: arktype.type.infer<def, $> extends Record<string, unknown>
    ? Preset<arktype.type.infer<def, $>>
    : 'Options must be an object',
) => [typeof def, typeof fn]
