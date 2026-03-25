/**
 * Reference code: https://github.com/elysiajs/elysia/blob/main/build.ts
 */

import { $ } from 'bun';
import { build } from 'tsup';
import { fixImportsPlugin } from 'esbuild-fix-imports-plugin';

await $`rm -rf dist`;

await build({
	entry: ['src/**/*.ts'],
	outDir: 'dist',
	format: ['esm', 'cjs'],
	target: 'node20',
	minifySyntax: true,
	minifyWhitespace: false,
	minifyIdentifiers: false,
	splitting: false,
	sourcemap: false,
	cjsInterop: false,
	clean: true,
	bundle: false,
	external: ['michi'],
	esbuildPlugins: [fixImportsPlugin()],
});

await $`bunx tsc --project tsconfig.dts.json`;
await $`find dist -name "*.test.*" -type f -delete`;
process.exit();
