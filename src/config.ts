import {createProcessor} from './processor'
import {codegen} from './rule'

export const markdownGlobs = ['*.md', '*.mdx']
export const yamlGlobs = ['*.yml', '*.yaml']
export const processableGlobs = [...markdownGlobs, ...yamlGlobs]
export const markdownProcessedBlockGlobs = markdownGlobs.map(f => `**/${f}/*.{js,ts,jsx,tsx,cjs,mjs,cts,mts}`)
export const javascriptGlobs = ['*.ts', '*.tsx', '*.js', '*.jsx', '*.cjs', '*.mjs', '*.cts', '*.mts']
export const codegenGlobs = [...markdownGlobs, ...markdownProcessedBlockGlobs, ...javascriptGlobs]

const processor = createProcessor()

const processors = {
  '.md': processor,
  '.yml': processor,
  '.yaml': processor,
  processor,
} satisfies import('eslint').ESLint.Plugin['processors']

/** Use this config to define the codegen rule */
export const pluginConfig = {plugins: {codegen: {rules: {codegen}, processors}}}

/** Use this config to set the codegen rule as an error */
export const codegenErrorConfig = {rules: {'codegen/codegen': 'error'}}
/** Use this config to set the codegen rule as a warning */
export const codegenWarningConfig = {rules: {'codegen/codegen': 'warn'}}

export const javascriptFilesConfig = {
  files: javascriptGlobs.map(glob => `**/${glob}`),
  ...codegenErrorConfig,
}

/** Use this config enable codegen on markdown and yaml files */
export const processedFilesConfig = {
  processor: 'codegen/processor',
  files: processableGlobs,
  ...codegenErrorConfig,
}

/** Merge this into your flat config to use recommended codegen settinsg */
export const recommendedConfig = [pluginConfig, processedFilesConfig, javascriptFilesConfig]
