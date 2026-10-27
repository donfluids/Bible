import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { FEEDBACK_ADDRESS, deviceLine, mailtoUrl } from './feedback';
import { useT } from './i18n';

/**
 * Opens the phone's mail app with a note to us started: the address, a subject naming the
 * app and its version, and a last line saying which build and phone it comes from, which
 * the reader may delete. Without a mail app, the address is shown and can be copied.
 */
export function useWriteToUs(): () => void {
  const t = useT();
  return useCallback(() => {
    const app = Constants.expoConfig?.name ?? 'Bible';
    const version = Constants.expoConfig?.version ?? '?';
    const build = String(Constants.expoConfig?.android?.versionCode ?? Constants.expoConfig?.ios?.buildNumber ?? '?');
    const device = deviceLine(Platform.OS, Platform.constants as Record<string, unknown>);
    const url = mailtoUrl(FEEDBACK_ADDRESS, t('feedbackSubject', { app, version }), `\n\n\n${t('feedbackSentFrom', { app, version, build, device })}`);
    Linking.openURL(url).catch(() => {
      Alert.alert(t('feedbackNoMail'), t('feedbackNoMailText', { address: FEEDBACK_ADDRESS }), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('feedbackCopyAddress'), onPress: () => Clipboard.setStringAsync(FEEDBACK_ADDRESS).catch(() => undefined) },
      ]);
    });
  }, [t]);
}
