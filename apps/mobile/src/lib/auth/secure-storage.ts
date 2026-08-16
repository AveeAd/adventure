import * as SecureStore from 'expo-secure-store';

// The refresh token is the one thing worth surviving an app restart (see
// token-store.ts for why the access token doesn't). expo-secure-store backs
// onto iOS Keychain / Android Keystore rather than AsyncStorage, which is
// the point - it's the RN equivalent of the web app's httpOnly cookie.
const REFRESH_TOKEN_KEY = 'refresh_token';

export const secureStorage = {
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  clearRefreshToken: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
};
