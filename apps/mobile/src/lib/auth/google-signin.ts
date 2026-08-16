import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';

// Native account-picker sheet, no browser bounce - viable because dev builds
// (not Expo Go) are assumed from day one (MOBILE_PLAN.md Phase 1).
// webClientId must be the *web* OAuth client (used to verify the ID token
// server-side against GOOGLE_CLIENT_ID/its mobile audiences - see Phase 0
// item 2); iosClientId is the separate iOS client from the same GCP project.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  offlineAccess: false,
});

// Returns the Google ID token to hand to POST /auth/google/mobile, or null
// if the user dismissed the sheet.
export async function signInWithGoogle(): Promise<string | null> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    return null;
  }
  return response.data.idToken;
}

export async function signOutFromGoogle(): Promise<void> {
  await GoogleSignin.signOut().catch(() => undefined);
}
