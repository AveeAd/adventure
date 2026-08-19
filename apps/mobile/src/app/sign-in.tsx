import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth/auth-context';
import { isAppleSignInAvailable } from '@/lib/auth/apple-signin';

export default function SignIn() {
  const { signIn, signInWithApple } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  return (
    <Screen contentContainerClassName="items-center justify-center gap-6 px-8" scroll={false}>
      <Text className="text-center text-3xl font-bold text-primary-900 dark:text-primary-100">
        Adventure
      </Text>
      <Text className="text-center text-base text-primary-700 dark:text-primary-300">
        Sign in to browse trails, spots, and trip reports.
      </Text>
      <Button onPress={signIn}>Sign in with Google</Button>
      {appleAvailable && (
        // Apple's HIG requires its own branded button for Sign in with
        // Apple rather than a generic styled one (App Store Guideline 4.8).
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={{ width: 220, height: 44 }}
          onPress={signInWithApple}
        />
      )}
    </Screen>
  );
}
