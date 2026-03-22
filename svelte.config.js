import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: undefined, // Default adapter will be used or auto-detected
		alias: {
			'@/*': './src/*'
		}
	}
};

export default config;
