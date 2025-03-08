import { promises } from 'fs'
import { resolve } from 'path'
import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import type { BaseTranslation } from '../../core/src/core'
import { GeneratorConfig, GeneratorConfigWithDefaultValues } from '../src/generate-files'
import { generate, getConfigWithDefaultValues } from '../src/generate-files'
import { parseTypescriptVersion, TypescriptVersion } from '../src/generator-util'

const { readFile } = promises

const test = suite('types')

const outputPath = resolve(__dirname, 'generated')

const actualPostfix = '.actual'

const defaultVersion = parseTypescriptVersion('4.1')

const getFileName = (name: string) => name + actualPostfix

const createConfig = async (prefix: string, config?: GeneratorConfig): Promise<GeneratorConfigWithDefaultValues> =>
	getConfigWithDefaultValues({
		outputPath: resolve(outputPath, prefix),

		typesFileName: getFileName('types'),
		utilFileName: getFileName('util'),
		formattersTemplateFileName: getFileName('formatters-template'),
		typesTemplateFileName: getFileName('types-template'),

		...config,
		locales: config?.locales?.length ? config?.locales : [config?.baseLocale || 'en'],
	})

type FileToCheck = 'types' | 'util' | 'formatters-template' | 'types-template' | 'svelte' | 'react'

const getPathOfOutputFile = (prefix: string, file: FileToCheck, type: 'actual' | 'expected') =>
	`${outputPath}/${prefix}/${file}.${type}.ts`

const REGEX_NEW_LINE = /\n/g
const check = async (prefix: string, file: FileToCheck) => {
	let pathOfFailingFile = ''
	const onError = (e: { path: string }) => {
		pathOfFailingFile = e.path
		return ''
	}

	const expected: string = (await readFile(getPathOfOutputFile(prefix, file, 'expected')).catch(onError)).toString()
	const actual: string = (await readFile(getPathOfOutputFile(prefix, file, 'actual')).catch(onError)).toString()

	if ((expected && !actual) || (!expected && actual)) throw Error(`Could not find file '${pathOfFailingFile}'`)

	if (expected && actual) {
		const expectedSplitByLines = expected.split(REGEX_NEW_LINE)
		const actualSplitByLines = actual.split(REGEX_NEW_LINE)

		expectedSplitByLines.forEach((_, i) =>
			assert.match(expectedSplitByLines[i] as string, actualSplitByLines[i] as string),
		)
	}
}

const testGeneratedOutput = async (
	prefix: string,
	translation: BaseTranslation,
	config: GeneratorConfig = {},
	version: TypescriptVersion = defaultVersion,
) =>
	test(`generate ${prefix}`, async () => {
		await generate(translation, await createConfig(prefix, config), version, undefined, true)
		await check(prefix, 'types')
		await check(prefix, 'util')
		await check(prefix, 'formatters-template')
		await check(prefix, 'types-template')
		await check(prefix, 'svelte')
		await check(prefix, 'react')
	})

// --------------------------------------------------------------------------------------------------------------------

type ConsoleOutputs = {
	info: string[]
	warn: string[]
	error: string[]
}

const mockLogger = () => {
	const outputs: ConsoleOutputs = {
		info: [],
		warn: [],
		error: [],
	}

	const logger = (type: 'info' | 'warn' | 'error', ...messages: unknown[]) => outputs[type].push(messages.join(' '))

	return {
		get logger() {
			return {
				info: logger.bind(null, 'info'),
				warn: logger.bind(null, 'warn'),
				error: logger.bind(null, 'error'),
			}
		},
		get outputs() {
			return outputs
		},
	}
}

const testGeneratedConsoleOutput = async (
	prefix: string,
	translation: BaseTranslation,
	callback: (outputs: ConsoleOutputs) => Promise<void>,
) =>
	test(`console ${prefix}`, async () => {
		const loggerWrapper = mockLogger()

		await generate(translation, await createConfig(prefix, {}), defaultVersion, loggerWrapper.logger)

		await callback(loggerWrapper.outputs)
	})

// --------------------------------------------------------------------------------------------------------------------

testGeneratedOutput('empty', {})

testGeneratedOutput('simple', {
	TEST: 'This is a test',
})

testGeneratedOutput('with-params', {
	PARAM: '{0} apple{{s}}',
	PARAMS: '{0} apple{{s}} and {1} banana{{s}}',
})

testGeneratedOutput('keyed-params', {
	KEYED_PARAM: '{nrOfApples} apple{{s}}',
	KEYED_PARAMS: '{nrOfApples} apple{{s}} and {nrOfBananas} banana{{s}}',
})

testGeneratedOutput('with-formatters', {
	FORMATTER_1: '{0|timesTen} apple{{s}}',
	FORMATTER_2: '{0} apple{{s}} and {1|wrapWithHtmlSpan} banana{{s}}',
})

testGeneratedOutput('formatters-with-dashes', { FORMATTER: '{0|custom-formatter|and-another}' })

testGeneratedOutput('formatters-with-spaces', { FORMATTER: '{0| custom formatter | and another }' })

testGeneratedOutput('base-locale-de', {}, { baseLocale: 'de' })

testGeneratedOutput('multiple-locales', {}, { locales: ['de', 'en', 'it'] })

testGeneratedOutput('locale-with-dash', {}, { baseLocale: 'de-at' })
testGeneratedOutput('locale-with-dash-sync', {}, { baseLocale: 'de-at', loadLocalesAsync: false })
testGeneratedOutput('locales-with-dash', {}, { locales: ['it-it', 'en-us', 'fr-be'] })

testGeneratedOutput('arg-types', { STRING_TYPE: 'Hi {name:string}!', NUMBER_TYPE: '{0:number} apple{{s}}' })

testGeneratedOutput('arg-order', {
	ORDER_INDEX: '{1} {0} {2} {0}',
	ORDER_KEYED: '{b} {z} {a}',
	ORDER_FORMATTER: '{0|z} {1|a}',
	ORDER_TYPES: '{0:B} {1:A}',
})

testGeneratedOutput('formatter-with-different-arg-types', { A: '{0:number|calculate}!', B: '{0:Date|calculate}' })

testGeneratedOutput('arg-types-with-external-type', { EXTERNAL_TYPE: 'The result is {0:Result|calculate}!' })

testGeneratedOutput('same-param', { SAME_PARAM: '{0} {0} {0}' })

testGeneratedOutput('same-keyed-param', { SAME_KEYED_PARAM: '{name} {name} {name}' })

testGeneratedOutput('only-plural-rules', { ONLY_PLURAL: 'apple{{s}}', ONLY_SINGULAR_PLURAL: '{{Afpel|Äpfel}}' })

testGeneratedOutput('plural-part-before-key', { PLURAL_BEFORE_KEY: 'apple{{s}}: {nrOfApples:number}' })

testGeneratedOutput(
	'generate-only-types',
	{ TEST: 'This is a test {0:CustomType|someFormatter}' },
	{ generateOnlyTypes: true },
)

testGeneratedOutput('nested-deep', { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: { l: { m: 'I am deeply nested' } } } } } } } } } } } } })

testGeneratedOutput('nested-with-arguments', { 'a': { APPLES: '{0} apple{{s}}' }, 'b': { APPLES: '{0:number} apple{{s}}' }, 'c': { APPLES: '{nrOfApples:number} apple{{s}}' } })

testGeneratedOutput('nested-formatters', { 'some-key': { 'other-key': 'format {me:string|custom-formatter}' }, 'another-key': '{0|format}' })

// --------------------------------------------------------------------------------------------------------------------

const nodeAdapterFileName = getFileName('node')

testGeneratedOutput(
	'adapter-node-async',
	{ HELLO_NODE: 'Hi {0:name}' },
	{ adapter: 'node', adapterFileName: nodeAdapterFileName },
)

testGeneratedOutput(
	'adapter-node-sync',
	{ HELLO_NODE: 'Hi {0:name}' },
	{ adapter: 'node', adapterFileName: nodeAdapterFileName, loadLocalesAsync: false },
)

const svelteAdapterFileName = getFileName('svelte')

testGeneratedOutput(
	'adapter-svelte-async',
	{ HELLO_SVELTE: 'Hi {0}' },
	{ adapter: 'svelte', adapterFileName: svelteAdapterFileName },
)

testGeneratedOutput(
	'adapter-svelte-sync',
	{ HELLO_SVELTE: 'Hi {0}' },
	{ adapter: 'svelte', adapterFileName: svelteAdapterFileName, loadLocalesAsync: false },
)

const reactAdapterFileName = getFileName('react')

testGeneratedOutput(
	'adapter-react-async',
	{ HELLO_NODE: 'Hi {0:name}' },
	{ adapter: 'react', adapterFileName: reactAdapterFileName },
)

testGeneratedOutput(
	'adapter-react-sync',
	{ HELLO_NODE: 'Hi {0:name}' },
	{ adapter: 'react', adapterFileName: reactAdapterFileName, loadLocalesAsync: false },
)

// --------------------------------------------------------------------------------------------------------------------

const tsTestTranslation = { TEST: 'Hi {name}, I have {nrOfApples} {{Afpel|Äpfel}}' }

testGeneratedOutput('typescript-3.0', tsTestTranslation, {}, parseTypescriptVersion('3.0'))
testGeneratedOutput('typescript-3.8', tsTestTranslation, {}, parseTypescriptVersion('3.8'))
testGeneratedOutput('typescript-4.1', tsTestTranslation, {}, parseTypescriptVersion('4.1'))

// --------------------------------------------------------------------------------------------------------------------

testGeneratedConsoleOutput('console-no-translations', {}, async (outputs) => {
	assert.is(outputs.info.length, 0)
	assert.is(outputs.error.length, 0)
	assert.is(outputs.warn.length, 0)
})

testGeneratedConsoleOutput('console-wrong-index', { TEST: '{0} {2}' }, async (outputs) => {
	assert.is(outputs.info.length, 0)
	assert.is(outputs.warn.length, 0)
	assert.is(outputs.error.length, 1)
	assert.is(outputs.error[0], "translation 'TEST' => argument {1} expected, but {2} found. Make sure to not skip an index for your arguments.")
})

testGeneratedConsoleOutput('console-keyed-and-index-based-keys', { TEST: '{hi} {0}' }, async (outputs) => {
	assert.is(outputs.info.length, 0)
	assert.is(outputs.warn.length, 0)
	assert.is(outputs.error.length, 1)
	assert.is(outputs.error[0], "translation 'TEST' => argument {1} expected, but {hi} found. You can't mix keyed and index-based arguments.")
})

testGeneratedConsoleOutput('console-translation-key-with-dot', { 'i.am.wrongly.nested': 'ohhh' }, async (outputs) => {
	assert.is(outputs.info.length, 0)
	assert.is(outputs.warn.length, 0)
	assert.is(outputs.error.length, 1)
	assert.is(outputs.error[0], "translation 'i.am.wrongly.nested' => key can't contain the '.' character. Please remove it. If you want to nest keys, you should look at https://github.com/ivanhofer/typesafe-i18n#nested-translations")
})

// --------------------------------------------------------------------------------------------------------------------

test.run()
