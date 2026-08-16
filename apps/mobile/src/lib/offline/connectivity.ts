import NetInfo from '@react-native-community/netinfo';

// `isConnected` can be `null` (unknown yet) - treat that as online rather
// than forcing an offline-fallback read before the first real reading
// resolves, since NetInfo settles within milliseconds on cold start.
export async function isConnected(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected !== false;
}
