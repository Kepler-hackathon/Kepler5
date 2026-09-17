// Ensures drizzle-kit's virtual store package can find drizzle-orm via ESM import.
// pnpm's virtual-store-dir puts packages in /tmp which breaks cross-package ESM resolution.
import { realpathSync, mkdirSync, symlinkSync, existsSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

try {
  const kitPath = realpathSync(join(root, 'node_modules/drizzle-kit'))
  const ormPath = realpathSync(join(root, 'node_modules/drizzle-orm'))
  const linkTarget = join(kitPath, 'node_modules/drizzle-orm')
  mkdirSync(join(kitPath, 'node_modules'), { recursive: true })
  if (!existsSync(linkTarget)) {
    symlinkSync(ormPath, linkTarget)
    console.log('✓ drizzle-kit/node_modules/drizzle-orm symlink created')
  }
} catch {
  // non-fatal — virtual store may not be in use
}
