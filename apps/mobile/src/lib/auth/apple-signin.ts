import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

export interface AppleSignInResult {
  identityToken: string;
  fullName: string | null;
}

// Sign in with Apple only exists on iOS - there's no Android/web
// equivalent, and no store requirement for one (MOBILE_PLAN.md Phase 7).
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }
  return AppleAuthentication.isAvailableAsync();
}

// Returns the identity token (+ display name, only ever present on the
// user's *first* authorization - see AppleMobileLoginDto.fullName) to hand
// to POST /auth/apple/mobile, or null if the user canceled the sheet.
export async function signInWithApple(): Promise<AppleSignInResult | null> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      return null;
    }
    const fullName = credential.fullName
      ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
      : null;
    return { identityToken: credential.identityToken, fullName: fullName || null };
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
      return null;
    }
    throw error;
  }
}
