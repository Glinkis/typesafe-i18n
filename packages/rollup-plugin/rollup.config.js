// @ts-check

import fs from 'fs'

import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import externals from 'rollup-plugin-node-externals'
import commonjs from '@rollup/plugin-commonjs'
import path from 'path'

const getPath = (file) => path.resolve(__dirname, file)

const files = fs.readdirSync(getPath('src'))

const config = files.map((file) => ({
	input: getPath(`src/${file}`),
	output: [
		{
			file: getPath(`../../rollup/${file.replace('.ts', '.js')}`),
			format: 'cjs',
			sourcemap: true,
			exports: 'named',
		},
	],
	external: ['typescript', 'chokidar'],
	plugins: [
		commonjs(),
		resolve({ preferBuiltins: true }),
		externals(),
		typescript({
			tsconfig: getPath('./tsconfig.json'),
			declaration: false,
			declarationDir: null,
		}),
	],
}))

export default config
