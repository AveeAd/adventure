import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { useAuth } from '@/lib/auth/auth-context';
import { isAppleSignInAvailable } from '@/lib/auth/apple-signin';

export default function SignIn() {
  const { t } = useTranslation('auth');
  const { signIn, signInWithApple } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  return (
    <Screen contentContainerClassName="flex-1 items-center justify-center px-6" scroll={false}>
      <Card glass className="w-full max-w-sm items-center gap-2 p-8">
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={{ width: 64, height: 64 }}
          resizeMode="contain"
        />
        <Text className="mt-2 text-center text-2xl font-bold text-primary-900 dark:text-primary-100">
          {t('appName')}
        </Text>
        <Text className="text-center text-base text-primary-700 dark:text-primary-300">
          {t('tagline')}
        </Text>
        <View className="mt-4 w-full items-center gap-3">
          <Button glass icon={<GoogleIcon />} className="w-full" onPress={signIn}>
            {t('signInWithGoogle')}
          </Button>
          {appleAvailable && (
            // Apple's HIG requires its own branded button for Sign in with
            // Apple rather than a generic styled one (App Store Guideline 4.8).
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={8}
              style={{ width: '100%', height: 44 }}
              onPress={signInWithApple}
            />
          )}
        </View>
      </Card>
    </Screen>
  );
}
