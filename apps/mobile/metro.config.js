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
// in one bundle is an "Invalid hook call" bug. A scoped resolveRequest
// override for just the react/react-dom pair used to work around this
// (disableHierarchicalLookup applied wholesale had a wider blast radius -
// it also broke markdown-it's own nested entities@~2.0.0, needed since the
// hoisted root entities was an incompatible 6.x pulled in for parse5).
// pnpm's isolated linker (see MOBILE_PLAN.md Phase 1 step 2) removes the
// underlying problem instead of working around it: apps/mobile/node_modules
// only ever contains symlinks into each package's own exact declared
// dependency tree, correctly nested per-package (no hoisting, so no
// entities collision either) - there's no shared hoisted copy left for
// Metro to walk into, so neither workaround is needed anymore.

// expo-sqlite's web implementation loads a wasm binary; without this, Metro
// doesn't know how to resolve `.wasm` imports and `expo export --platform
// web` fails outright (used only as a smoke test - apps/mobile isn't
// shipped to web, see AdventureMap.web.tsx's similar note).
config.resolver.assetExts.push('wasm');

module.exports = withNativeWind(config, { input: './src/global.css' });
