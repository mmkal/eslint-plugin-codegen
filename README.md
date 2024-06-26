# eslint-plugin-codegen

An eslint plugin for inline codegen. Auto-fixes out of sync code, with presets for barrels, jsdoc to markdown and more.

[![CI](https://github.com/mmkal/eslint-plugin-codegen/actions/workflows/ci.yml/badge.svg)](https://github.com/mmkal/eslint-plugin-codegen/actions/workflows/ci.yml)
![npm](https://img.shields.io/npm/dt/eslint-plugin-codegen)

## Motivation

Sometimes the same information is useful in multiple places - for example, jsdoc comments in code can double as markdown-formatted documentation for a library.

This allows generating code in a project using eslint, without having to incorporate any extra build tools, either for the codegen itself, or to validate that the generated code is up to date. So references to other parts of the project will always stay up to date - and your existing CI tools can enforce this just by running eslint.

Here's an example of it being used along with VSCode's eslint plugin, with auto-fix-on-save:

![](./gifs/barrel.gif)

## Contents

<!-- codegen:start {preset: markdownTOC, minDepth: 2, maxDepth: 5} -->
- [Motivation](#motivation)
- [Contents](#contents)
- [How to use](#how-to-use)
   - [Setup](#setup)
      - [Usage with eslint-plugin-markdown](#usage-with-eslint-plugin-markdown)
   - [Presets](#presets)
      - [barrel](#barrel)
      - [custom](#custom)
      - [markdownFromJsdoc](#markdownfromjsdoc)
      - [monorepoTOC](#monorepotoc)
      - [markdownFromJsdoc](#markdownfromjsdoc-1)
      - [markdownTOC](#markdowntoc)
      - [markdownFromTests](#markdownfromtests)
      - [labeler](#labeler)
   - [Customisation](#customisation)
<!-- codegen:end -->

## How to use

<details>
<summary>Caveat</summary>

Before you use this, note that it's still in v0. That means:

1. Breaking changes might happen. Presets might be renamed, or have their options changed. The documentation should stay up to date though, since that's partly the point of the project.
1. There are missing features, or incompletely-implemented ones. For example, `markdownFromJsdoc` only works with `export const ...` style exports. Currently most of the features implemented are ones that are specifically needed for this git repo.
1. There might be bugs. The project is in active development - [raise an issue](https://github.com/mmkal/ts/issues) if you find one!

</details>

### Setup

In an eslint-enabled project, install with

```bash
npm install --save-dev eslint-plugin-codegen
```

or

```bash
yarn add --dev eslint-plugin-codegen
```

Then add the plugin and rule to your eslint config, for example in `eslintrc.js`:

```js
module.exports = {
  //...
  plugins: [
    // ...
    'codegen',
  ],
  rules: {
    // ...
    'codegen/codegen': 'error',
  },
}
```

You can use the rule by running eslint in a standard way, with something like this in an npm script: `eslint --ext .ts,.js,.md .`

In vscode, if using the eslint plugin, you may need to tell it to validate markdown files in your repo's `.vscode/settings.json` file (see [this repo for an example](../../.vscode/settings.json)):

```json
{
  "eslint.validate": ["markdown", "javascript", "typescript"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

To trigger the rule, add a comment line to a source file.

In markdown:

`<!-- codegen:start {{ OPTIONS }} -->`

In typescript/javascript:

`// codegen:start {{ OPTIONS }}`

Where `{{ OPTIONS }}` are an inline object in the format:

`{preset: presetName, key1: value1, key2: value2}`

Where `key1` and `key2` are options passed to the codegen preset. yaml is used to parse the object, So any valid yaml that fits on one line can be passed as options. In practise, the one-line restriction means using [yaml's "flow style"](https://yaml.org/spec/1.2/spec.html#id2759963) for collections.

See below for documentation. This repo also has [lots of usage examples](https://github.com/mmkal/ts/search?q=%22codegen%3Astart%22&unscoped_q=%22codegen%3Astart%22).

#### Usage with eslint-plugin-markdown

This plugin uses an [ESLint processor](https://eslint.org/docs/latest/extend/custom-processors) to handle markdown and YAML files. ESLint [only allows one processor per file type](https://github.com/eslint/eslint/issues/17724), so the processor from this plugin is designed to be compatible with `eslint-plugin-markdown`. But to use both plugins, you need to use the process for `eslint-plugin-codegen`, not `eslint-plugin-markdown`. You can do this by adding the recommended config for `eslint-plugin-codegen` second, e.g.

```js
module.exports = {
  plugins: ['markdown', 'codegen'],
  extends: ['plugin:markdown/recommended', 'plugin:codegen/recommended'],
}
```

Or specify the processor explicitly - when you switch to [flat config this will be required](https://eslint.org/docs/latest/extend/custom-processors#specifying-processor-in-config-files):

```js
module.exports = {
  // 1. Add the plugin.
  plugins: ['markdown'],
  overrides: [
    {
      // 2. Enable the Markdown processor for all .md files.
      files: ['**/*.md'],
      processor: 'codegen/processor', // NOT 'markdown/markdown'
    },
  ],
}
```

### Presets
<!-- codegen:start {preset: markdownFromJsdoc, source: src/presets/barrel.ts, export: barrel} -->
#### [barrel](./src/presets/barrel.ts#L38)

Bundle several modules into a single convenient one.

##### Example

```typescript
// codegen:start {preset: barrel, include: some/path/*.ts, exclude: some/path/*util.ts}
export * from './some/path/module-a'
export * from './some/path/module-b'
export * from './some/path/module-c'
// codegen:end
```

##### Params

|name     |description                                                                                                                                                                                                                                                                                                                                                                                       |
|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|include  |[optional] If specified, the barrel will only include file paths that match this glob pattern                                                                                                                                                                                                                                                                                                     |
|exclude  |[optional] If specified, the barrel will exclude file paths that match these glob patterns                                                                                                                                                                                                                                                                                                        |
|import   |[optional] If specified, matching files will be imported and re-exported rather than directly exported<br />with `export * from './xyz'`. Use `import: star` for `import * as xyz from './xyz'` style imports.<br />Use `import: default` for `import xyz from './xyz'` style imports.                                                                                                            |
|export   |[optional] Only valid if the import style has been specified (either `import: star` or `import: default`).<br />If specified, matching modules will be bundled into a const or default export based on this name. If set<br />to `{name: someName, keys: path}` the relative file paths will be used as keys. Otherwise the file paths<br />will be camel-cased to make them valid js identifiers.|
|extension|[optional] Useful for ESM modules. If set to true files will be imported with the file extension.<br />If set to an object, extensions will be converted using this object.                                                                                                                                                                                                                       |
<!-- codegen:end -->

##### Demo

![](./gifs/barrel.gif)

<!-- codegen:start {preset: markdownFromJsdoc, source: src/presets/custom.ts, export: custom} -->
#### [custom](./src/presets/custom.ts#L31)

Define your own codegen function, which will receive all options specified. Import the `Preset` type from this library to define a strongly-typed preset function:

##### Example

```typescript
import {Preset} from 'eslint-plugin-codegen'

export const jsonPrinter: Preset<{myCustomProp: string}> = ({meta, options}) => {
  const components = meta.glob('**\/*.tsx') // uses 'globSync' from glob package
  return `filename: ${meta.filename}\ncustom prop: ${options.myCustomProp}\nComponent paths: ${components.join(', ')}`
}
```

This can be used with:

`<!-- codegen:start {preset: custom, source: ./lib/my-custom-preset.js, export: jsonPrinter, myCustomProp: hello}` Note that a `glob` helper method is passed to the preset via `meta`. This uses the `globSync` method of https://npm.im/glob. There are also `fs` and `path` helpers passed, corresponding to those node modules respectively. These can be useful to allow access to those libraries without them being production dependencies.

##### Params

|name   |description                                                                                                                                                                                              |
|-------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|source |Relative path to the module containing the custom preset. Default: the file being linted.                                                                                                                |
|export |The name of the export. If omitted, the module's default export should be a preset function.                                                                                                             |
|require|A module to load before `source`. If not set, defaults to `ts-node/register/transpile-only` for typescript sources.                                                                                      |
|dev    |Set to `true` to clear the require cache for `source` before loading. Allows editing the function without requiring an IDE reload. Default false if the `CI` enviornment variable is set, true otherwise.|
<!-- codegen:end -->

##### Demo

![](./gifs/custom.gif)

<!-- codegen:start {preset: markdownFromJsdoc, source: src/presets/markdown-from-jsdoc.ts, export: markdownFromJsdoc} -->
#### [markdownFromJsdoc](./src/presets/markdown-from-jsdoc.ts#L20)

Convert jsdoc for an es export from a javascript/typescript file to markdown.

##### Example

`<!-- codegen:start {preset: markdownFromJsdoc, source: src/foo.ts, export: bar} -->`

##### Params

|name       |description                                                                                                                              |
|-----------|-----------------------------------------------------------------------------------------------------------------------------------------|
|source     |{string} relative file path containing the export with jsdoc that should be copied to markdown                                           |
|export     |{string} the name of the export                                                                                                          |
|headerLevel|{1|2|3|4|5} Determines if the export will correspond to a H1, H2, H3, H4 or H5. Nested headers will increment from this value. @default 4|
<!-- codegen:end -->

<!-- codegen:start {preset: markdownFromJsdoc, source: src/presets/monorepo-toc.ts, export: monorepoTOC} -->
#### [monorepoTOC](./src/presets/monorepo-toc.ts#L40)

Generate a table of contents for a monorepo.

##### Example (basic)

`<!-- codegen:start {preset: monorepoTOC} -->`

##### Example (using config options)

`<!-- codegen:start {preset: monorepoTOC, repoRoot: .., workspaces: lerna, filter: {package.name: foo}, sort: -readme.length} -->`

##### Params

|name    |description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|--------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|repoRoot|[optional] the relative path to the root of the git repository. By default, searches parent directories for a package.json to find the "root".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|filter  |[optional] a dictionary of filter rules to whitelist packages. Filters can be applied based on package.json keys,<br /><br />examples:<br />- `filter: '@myorg/.*-lib'` (match packages with names matching this regex)<br />- `filter: { package.name: '@myorg/.*-lib' }` (equivalent to the above)<br />- `filter: { package.version: '^[1-9].*' }` (match packages with versions starting with a non-zero digit, i.e. 1.0.0+)<br />- `filter: '^(?!.*(internal$))'` (match packages that do not contain "internal" anywhere (using [negative lookahead](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Lookahead_assertion)))<br />- `filter: { package.name: '@myorg', path: 'libraries' }` (match packages whose name contains "@myorg" and whose path matches "libraries")<br />- `filter: { readme: 'This is production-ready' }` (match packages whose readme contains the string "This is production-ready")|
|sort    |[optional] sort based on package properties (see `filter`), or readme length. Use `-` as a prefix to sort descending.<br />examples:<br />- `sort: package.name` (sort by package name)<br />- `sort: -readme.length` (sort by readme length, descending)<br />- `sort: toplogical` (sort by toplogical dependencies, starting with the most depended-on packages)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
<!-- codegen:end -->

##### Demo

![](./gifs/monorepoTOC.gif)

#### [markdownFromJsdoc](./src/presets/markdown-from-jsdoc.ts#L17)

Convert jsdoc to an es export from a javascript/typescript file to markdown.

##### Example

`<!-- codegen:start {preset: markdownFromJsdoc, source: src/foo.ts, export: bar} -->`

##### Params

|name  |description                                                                                   |
|------|----------------------------------------------------------------------------------------------|
|source|{string} relative file path containing the export with jsdoc that should be copied to markdown|
|export|{string} the name of the export                                                               |
<!-- codegen:end -->

##### Demo

![](./gifs/markdownFromJsdoc.gif)

<!-- codegen:start {preset: markdownFromJsdoc, source: src/presets/markdown-toc.ts, export: markdownTOC} -->
#### [markdownTOC](./src/presets/markdown-toc.ts#L15)

Generate a table of contents from the current markdown file, based on markdown headers (e.g. `### My section title`)

##### Example

`<!-- codegen:start {preset: markdownTOC, minDepth: 2, maxDepth: 5} -->`

##### Params

|name    |description                                                                                                                         |
|--------|------------------------------------------------------------------------------------------------------------------------------------|
|minDepth|exclude headers with lower "depth". e.g. if set to 2, `# H1` would be excluded but `## H2` would be included. @default 2            |
|maxDepth|exclude headers with higher "depth". e.g. if set to 3, `#### H4` would be excluded but `### H3` would be included. @default Infinity|
<!-- codegen:end -->

##### Demo

![](./gifs/markdownTOC.gif)

<!-- codegen:start {preset: markdownFromJsdoc, source: src/presets/markdown-from-tests.ts, export: markdownFromTests} -->
#### [markdownFromTests](./src/presets/markdown-from-tests.ts#L25)

Use a test file to generate library usage documentation. Note: this has been tested with vitest and jest. It _might_ also work fine with mocha, and maybe ava, but those haven't been tested. JSDoc/inline comments above tests will be added as a "preamble", making this a decent way to quickly document API usage of a library, and to be sure that the usage is real and accurate.

##### Example

`<!-- codegen:start {preset: markdownFromTests, source: test/foo.test.ts, headerLevel: 3} -->`

##### Params

|name                          |description                                                                                    |
|------------------------------|-----------------------------------------------------------------------------------------------|
|source                        |the test file                                                                                  |
|include                       |if defined, only tests with titles matching one of these regexes will be included              |
|exclude                       |if defined, tests with titles matching one of these regexes will be excluded                   |
|headerLevel                   |The number of `#` characters to prefix each title with                                         |
|includeEslintDisableDirectives|If true, `// eslint-disable ...` type comments will be included in the preamble. @default false|
<!-- codegen:end -->

##### Demo

![](./gifs/markdownFromTests.gif)

<!-- codegen:start {preset: markdownFromJsdoc, source: src/presets/labeler.ts, export: labeler} -->
#### [labeler](./src/presets/labeler.ts#L26)

Generates a yaml config for the [GitHub Pull Request Labeler Action](https://github.com/actions/labeler). Creates a label per package name, which will be applied to any file modified under the leaf package path. When packages are added or removed from the repo, or renamed, the yaml config will stay in sync with them. Additional labels can be added outside of the generated code block. See https://github.com/mmkal/ts/tree/main/.github/labeler.yml for an example.

##### Example
```yaml
# codegen:start {preset: labeler}
```

*Note*: eslint and related tools make it quite difficult to lint github action yaml files. To get it working, you'll need to:
- add `'!.github'` to your `.eslintignore` file, or the `ignorePatterns` property in your lint config.
- {vscode} add `"yaml"` to the `"eslint.validate"` list in `vscode/settings.json`.
- {@typescript/eslint} add `'.yml'` (and/or `'.yaml'`) to the `parserOptions.extraFileExtensions` list in your lint config.
- {@typescript/eslint} explicitly include 'hidden' files (with paths starting with `.`) in your tsconfig. See https://github.com/mmkal/ts/tree/main/tsconfig.eslint.json for an example.

##### Params

|name    |description                                                                                                                         |
|--------|------------------------------------------------------------------------------------------------------------------------------------|
|repoRoot|[optional] path to the repository root. If not specified, the rule will recursively search parent directories for package.json files|
<!-- codegen:end -->

##### Demo

![](./gifs/labeler.gif)

### Customisation

In addition to the [custom](#custom) preset, you can also define your own presets in eslint configuration, e.g.:

```js
module.exports = {
  // ...
  plugins: [
    // ...
    'codegen',
  ],
  rules: {
    // ...
    'codegen/codegen': ['error', {presets: require('./-presets')}],
  },
}
```

`presets` should be a record of preset functions, conforming to the `Preset` interface from this package. This can be used to extend the in-built ones. For example, you could make generated markdown collapsible:

_Before:_

```
 <!-- codegen:start {preset: markdownTOC}-->
 - [Section1](#section1)
 - [Section2](#section2)
 <!-- codeg```

`my-custom-presets.js`:

<!-- eslint-disable @typescript-eslint/no-var-requires -->
<!-- eslint-disable import/no-extraneous-dependencies -->
```js
const {presets} = require('eslint-plugin-codegen')

module.exports.markdownTOC = params => {
  const toc = presets.markdownTOC(params)
  return [
    '<details>',
    '<summary>click to expand</summary>',
    '',
    toc,
    '</details>',
  ].join('\n')
}
```

`.eslintrc.js`:

```js
module.exports = {
  // ...
  plugins: [
    // ...
    'codegen',
  ],
  rules: {
    // ...
    'codegen/codegen': ['error', {presets: require('./my-custom-presets')}],
  },
}
```

_After_:

`readme.md`:

```
 <!-- codegen:start {preset: markdownTOC}-->
 <details>
  <summary>click to expand</summary>

 - [Section1](#section1)
 - [Section2](#section2)
 </details>
 <!-- codegen:end -->
```

_Rendered_:

<details>
<summary>click to expand</summary>

- [Section1](#section1)
- [Section2](#section2)
</details>

___

<sub>The code in this repository was moved from https://github.com/mmkal/ts</sub>
