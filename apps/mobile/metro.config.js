const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..', '..');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so edits to packages/api-types (and any other
// workspace package apps/mobile depends on) trigger a Metro refresh.
config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// apps/public pins react@^19.2.0 and apps/admin react@^19.2.7, while Expo
// pins the exact version here. Under npm's flat hoisting this used to risk
// Metro resolving a hoisted sibling copy from the shared root node_modules
// instead of this project's own exact-pinned version - two copies of React
// in one bundle is an "Invalid hook call" bug. pnpm's isolated linker (see
// MOBILE_PLAN.md Phase 1 step 2) makes apps/mobile/node_modules/react a
// symlink straight to the exact version apps/mobile declared for itself -
// there's no shared hoisted copy left for Metro to walk into, so this
// workaround is no longer needed.

// expo-sqlite's web implementation loads a wasm binary; without this, Metro
// doesn't know how to resolve `.wasm` imports and `expo export --platform
// web` fails outright (used only as a smoke test - apps/mobile isn't
// shipped to web, see AdventureMap.web.tsx's similar note).
config.resolver.assetExts.push('wasm');

module.exports = withNativeWind(config, { input: './src/global.css' });
