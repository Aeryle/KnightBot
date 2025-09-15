import { join } from 'path'

import { envParseString } from '@skyra/env-utilities'

export const rootDir = join(import.meta.dirname, '..', '..')
export const srcDir = join(rootDir, 'src')

export const dev = envParseString('NODE_ENV', 'development')
