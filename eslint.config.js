import { eslint } from 'config-aeryle'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...eslint.typescript, //
  ...eslint.prettier,

  // Ignore files
  eslint.ignores.base, // node_modules, .DS_Store
  eslint.ignores.env, // Environment files
  ...eslint.ignores.packageManagers, // NPM, Pnpm, Yarn, Bun

  // Imports
  ...eslint.commonjs,
  ...eslint.esm,
  ...eslint.imports,
]
