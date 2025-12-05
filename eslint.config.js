import { configApp } from '@adonisjs/eslint-config'

export default configApp({
	prettier: true,
	prettierOptions: {
		useTabs: true,
		tabWidth: 2,
		singleQuote: false,
		semi: true,
	},
})
