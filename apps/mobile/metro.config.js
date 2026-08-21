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

// apps/public pins react@^19.2.0 and apps/admin react@^19.2.7; npm's
// workspace hoisting has no nohoist, so the root node_modules/react can end
// up on a different version than the exact one Expo/React Native pin here
// (see MOBILE_PLAN.md Phase 1 step 2). A blanket disableHierarchicalLookup
// used to fix this, but it also stops Metro from ever descending into a
// dependency's OWN nested node_modules - which broke markdown-it, which
// npm correctly nests its own entities@~2.0.0 under precisely because the
// root-hoisted entities (6.x, needed by parse5) isn't compatible with it.
// Scoping the override to just the react family (via resolveRequest) keeps
// that dedup fix without blinding Metro to every other package's own
// nested node_modules.
// Only react/react-dom actually have a second, differently-versioned copy
// nested under apps/mobile/node_modules (npm dedupes react-native/scheduler
// to a single root copy since no other workspace depends on them) - forcing
// resolution for a package that ISN'T nested here would make it
// unresolvable instead of deduped.
const REACT_FAMILY = new Set(['react', 'react-dom']);
const { resolveRequest: defaultResolveRequest } = config.resolver;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (REACT_FAMILY.has(moduleName)) {
    return (defaultResolveRequest ?? context.resolveRequest)(
      { ...context, nodeModulesPaths: [path.resolve(projectRoot, 'node_modules')], disableHierarchicalLookup: true },
      moduleName,
      platform,
    );
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

// expo-sqlite's web implementation loads a wasm binary; without this, Metro
// doesn't know how to resolve `.wasm` imports and `expo export --platform
// web` fails outright (used only as a smoke test - apps/mobile isn't
// shipped to web, see AdventureMap.web.tsx's similar note).
config.resolver.assetExts.push('wasm');

module.exports = withNativeWind(config, { input: './src/global.css' });
