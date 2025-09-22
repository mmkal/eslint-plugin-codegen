/** The Standard Schema interface. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  /** The Standard Schema properties. */
  readonly '~standard': StandardSchemaV1.Props<Input, Output>
}

export declare namespace StandardSchemaV1 {
  /** The Standard Schema properties interface. */
  export interface Props<Input = unknown, Output = Input> {
    /** The version number of the standard. */
    readonly version: 1
    /** The vendor name of the schema library. */
    readonly vendor: string
    /** Validates unknown input values. */
    readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>
    /** Inferred types associated with the schema. */
    readonly types?: Types<Input, Output> | undefined
  }

  /** The result interface of the validate function. */
  export type Result<Output> = SuccessResult<Output> | FailureResult

  /** The result interface if validation succeeds. */
  export interface SuccessResult<Output> {
    /** The typed output value. */
    readonly value: Output
    /** The non-existent issues. */
    readonly issues?: undefined
  }

  /** The result interface if validation fails. */
  export interface FailureResult {
    /** The issues of failed validation. */
    readonly issues: ReadonlyArray<Issue>
  }

  /** The issue interface of the failure output. */
  export interface Issue {
    /** The error message of the issue. */
    readonly message: string
    /** The path of the issue, if any. */
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined
  }

  /** The path segment interface of the issue. */
  export interface PathSegment {
    /** The key representing a path segment. */
    readonly key: PropertyKey
  }

  /** The Standard Schema types interface. */
  export interface Types<Input = unknown, Output = Input> {
    /** The input type of the schema. */
    readonly input: Input
    /** The output type of the schema. */
    readonly output: Output
  }

  /** Infers the input type of a Standard Schema. */
  export type InferInput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['input']

  /** Infers the output type of a Standard Schema. */
  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['output']
}

export const looksLikePromise = (error: unknown): error is Promise<unknown> => {
  return !!error && typeof error === 'object' && 'then' in error && typeof error.then === 'function'
}

export const looksLikeStandardSchemaFailure = (error: unknown): error is StandardSchemaV1.FailureResult => {
  return !!error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues)
}

export const looksLikeStandardSchema = (thing: unknown): thing is StandardSchemaV1 => {
  return !!thing && typeof thing === 'object' && '~standard' in thing && typeof thing['~standard'] === 'object'
}

export const prettifyErrorIfStandardSchema = (error: unknown): string | null => {
  if (!looksLikeStandardSchemaFailure(error)) return null
  return prettifyStandardSchemaError(error)
}

export const prettifyStandardSchemaError = (error: StandardSchemaV1.FailureResult): string | null => {
  const issues = [...error.issues]
    .map(issue => {
      const path = issue.path || []
      const primitivePathSegments = path.map(segment => {
        if (typeof segment === 'string' || typeof segment === 'number' || typeof segment === 'symbol') return segment
        return segment.key
      })
      const dotPath = toDotPath(primitivePathSegments)
      return {
        issue,
        path,
        primitivePathSegments,
        dotPath,
      }
    })
    .sort((a, b) => a.path.length - b.path.length)

  const lines: string[] = []

  for (const {issue, dotPath} of issues) {
    let message = `✖ ${issue.message}`
    if (dotPath) message += ` → at ${dotPath}`
    lines.push(message)
  }

  return lines.join('\n')
}

export function toDotPath(path: (string | number | symbol)[]): string {
  const segs: string[] = []
  for (const seg of path) {
    if (typeof seg === 'number') segs.push(`[${seg}]`)
    else if (typeof seg === 'symbol') segs.push(`[${JSON.stringify(String(seg))}]`)
    else if (/[^\w$]/.test(seg)) segs.push(`[${JSON.stringify(seg)}]`)
    else {
      if (segs.length) segs.push('.')
      segs.push(seg)
    }
  }

  return segs.join('')
}
