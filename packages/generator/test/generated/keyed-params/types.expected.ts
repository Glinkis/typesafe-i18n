// This types were auto-generated. Any manual changes will be overwritten.
/* eslint-disable */

export type BaseLocale = 'en'

export type Locales =
	| 'en'

export type Translation = {
	/**
	 * {nrOfApples} apple{{s}}
	 * @param {string | number | boolean} nrOfApples
	 */
	'KEYED_PARAM': RequiredParams1<'nrOfApples'>
	/**
	 * {nrOfApples} apple{{s}} and {nrOfBananas} banana{{s}}
	 * @param {string | number | boolean} nrOfApples
	 * @param {string | number | boolean} nrOfBananas
	 */
	'KEYED_PARAMS': RequiredParams2<'nrOfApples', 'nrOfBananas'>
}

export type TranslationFunctions = {
	/**
	 * {nrOfApples} apple{{s}}
	 */
	'KEYED_PARAM': (arg: { nrOfApples: string | number | boolean }) => string
	/**
	 * {nrOfApples} apple{{s}} and {nrOfBananas} banana{{s}}
	 */
	'KEYED_PARAMS': (arg: { nrOfApples: string | number | boolean, nrOfBananas: string | number | boolean }) => string
}

export type Formatters = {}


type Param<P extends string> = `{${P}}`

type Params1<P1 extends string> =
	`${string}${Param<P1>}${string}`

type Params2<P1 extends string, P2 extends string> =
	`${string}${Param<P1>}${string}${Param<P2>}${string}`

type RequiredParams1<P1 extends string> =
	| Params1<P1>

type RequiredParams2<P1 extends string, P2 extends string> =
	| Params2<P1, P2>
	| Params2<P2, P1>
