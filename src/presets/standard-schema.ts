import {z} from 'zod/v4'
import {definePreset} from './util/standard-schema-preset'

/**
 * Generates standard-schema boilerplate code. By default, includes:
 *
 * - the contract as defined in github.com/standard-schema/standard-schema.
 * - some utils for checking if arbitrary values look like standard-schema schemas and errors.
 * - a function for prettifying standard-schema errors.
 * - a custom error class for standard-schema errors.
 *
 * All parts are optional - and of course you can use this generator to create the boilerplate once, then remove the codegen directives to modify manually
 */
export const standardSchema = definePreset(
  z.object({
    include: z.enum(['contract', 'errors', 'utils']).array().default(['contract', 'errors', 'utils']),
  }),
  ({options}) => {
    const src = options.include
      .map(include => {
        if (include === 'contract') return standardSchemaV1ContractSrc
        if (include === 'utils') return standardSchemaV1UtilsSrc
        if (include === 'errors') return standardSchemaV1ErrorsSrc
      })
      .join('\n')

    return src
  },
)

// codegen:start {preset: str, source: ../standard-schema/contract.ts, const: standardSchemaV1ContractSrc}
const standardSchemaV1ContractSrc =
  "// from https://github.com/standard-schema/standard-schema\n\n/** The Standard Schema interface. */\nexport interface StandardSchemaV1<Input = unknown, Output = Input> {\n  /** The Standard Schema properties. */\n  readonly '~standard': StandardSchemaV1.Props<Input, Output>\n}\n\nexport declare namespace StandardSchemaV1 {\n  /** The Standard Schema properties interface. */\n  export interface Props<Input = unknown, Output = Input> {\n    /** The version number of the standard. */\n    readonly version: 1\n    /** The vendor name of the schema library. */\n    readonly vendor: string\n    /** Validates unknown input values. */\n    readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>\n    /** Inferred types associated with the schema. */\n    readonly types?: Types<Input, Output> | undefined\n  }\n\n  /** The result interface of the validate function. */\n  export type Result<Output> = SuccessResult<Output> | FailureResult\n\n  /** The result interface if validation succeeds. */\n  export interface SuccessResult<Output> {\n    /** The typed output value. */\n    readonly value: Output\n    /** The non-existent issues. */\n    readonly issues?: undefined\n  }\n\n  /** The result interface if validation fails. */\n  export interface FailureResult {\n    /** The issues of failed validation. */\n    readonly issues: ReadonlyArray<Issue>\n  }\n\n  /** The issue interface of the failure output. */\n  export interface Issue {\n    /** The error message of the issue. */\n    readonly message: string\n    /** The path of the issue, if any. */\n    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined\n  }\n\n  /** The path segment interface of the issue. */\n  export interface PathSegment {\n    /** The key representing a path segment. */\n    readonly key: PropertyKey\n  }\n\n  /** The Standard Schema types interface. */\n  export interface Types<Input = unknown, Output = Input> {\n    /** The input type of the schema. */\n    readonly input: Input\n    /** The output type of the schema. */\n    readonly output: Output\n  }\n\n  /** Infers the input type of a Standard Schema. */\n  export type InferInput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['input']\n\n  /** Infers the output type of a Standard Schema. */\n  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['output']\n}\n"
// codegen:end

// codegen:start {preset: str, source: ../standard-schema/errors.ts, const: standardSchemaV1ErrorsSrc, excludeLines: ['^import']}
const standardSchemaV1ErrorsSrc =
  "\nexport const prettifyStandardSchemaError = (error: unknown): string | null => {\n  if (!looksLikeStandardSchemaFailure(error)) return null\n\n  const issues = [...error.issues]\n    .map(issue => {\n      const path = issue.path || []\n      const primitivePathSegments = path.map(segment => {\n        if (typeof segment === 'string' || typeof segment === 'number' || typeof segment === 'symbol') return segment\n        return segment.key\n      })\n      const dotPath = toDotPath(primitivePathSegments)\n      return {\n        issue,\n        path,\n        primitivePathSegments,\n        dotPath,\n      }\n    })\n    .sort((a, b) => a.path.length - b.path.length)\n\n  const lines: string[] = []\n\n  for (const {issue, dotPath} of issues) {\n    let message = `✖ ${issue.message}`\n    if (dotPath) message += ` → at ${dotPath}`\n    lines.push(message)\n  }\n\n  return lines.join('\\n')\n}\n\nexport function toDotPath(path: (string | number | symbol)[]): string {\n  const segs: string[] = []\n  for (const seg of path) {\n    if (typeof seg === 'number') segs.push(`[${seg}]`)\n    else if (typeof seg === 'symbol') segs.push(`[${JSON.stringify(String(seg))}]`)\n    else if (/[^\\w$]/.test(seg)) segs.push(`[${JSON.stringify(seg)}]`)\n    else {\n      if (segs.length) segs.push('.')\n      segs.push(seg)\n    }\n  }\n\n  return segs.join('')\n}\n\nexport class StandardSchemaV1Error extends Error implements StandardSchemaV1.FailureResult {\n  issues: StandardSchemaV1.FailureResult['issues']\n  constructor(failure: StandardSchemaV1.FailureResult, options?: {cause?: Error}) {\n    super('Standard Schema error - details in `issues`.', options)\n    this.issues = failure.issues\n  }\n}\n"
// codegen:end

// codegen:start {preset: str, source: ../standard-schema/utils.ts, const: standardSchemaV1UtilsSrc, excludeLines: ['^import']}
const standardSchemaV1UtilsSrc =
  "\nexport const looksLikeStandardSchemaFailure = (error: unknown): error is StandardSchemaV1.FailureResult => {\n  return !!error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues)\n}\n\nexport const looksLikeStandardSchema = (thing: unknown): thing is StandardSchemaV1 => {\n  return !!thing && typeof thing === 'object' && '~standard' in thing && typeof thing['~standard'] === 'object'\n}\n"
// codegen:end
