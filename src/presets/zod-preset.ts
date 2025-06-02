import {z} from 'zod/v4'
import {Preset} from '..'

export const definePreset = <Type extends z.ZodTypeAny>(
  schema: Type,
  fn: Preset<z.infer<Type>>,
): Preset<z.infer<Type>> => {
  return params => {
    const result = schema.safeParse(params.options)
    if (!result.success) throw new Error(`Invalid options: ${z.prettifyError(result.error)}`)
    return fn({...params, options: result.data})
  }
}
