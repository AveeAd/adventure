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
// (see MOBILE_PLAN.md Phase 1 step 2). disableHierarchicalLookup stops
// Metro from walking up past this project's own node_modules once it finds
// a match there, so react/react-dom/react-native always resolve to the
// versions apps/mobile installed for itself rather than a hoisted sibling -
// two copies of React in one bundle is an "Invalid hook call" bug otherwise.
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: './src/global.css' });
