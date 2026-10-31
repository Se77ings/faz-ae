import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import * as AlarmManager from 'android-alarm-manager';

import { translate } from './globalizations/i18n';

/**
 * Retorna false só quando as notificações são negadas, porque sem elas o alarme não toca.
 * Alarme exato e tela cheia são pedidos, mas não bloqueiam: sem eles o alarme toca atrasado
 * ou como notificação comum. Pede um ajuste por vez, já que cada um abre uma tela do sistema.
 */
export async function ensureAlarmPermissionsAsync() {
    if (Platform.OS !== 'android' || !AlarmManager.isSupported()) return true;

    if (Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            await askToOpenSettingsAsync('notificationPermissionTitle', 'notificationPermissionMessage', () => Linking.openSettings());
            return false;
        }
        if (result !== PermissionsAndroid.RESULTS.GRANTED) return false;
    }

    if (!AlarmManager.canScheduleExactAlarms()) {
        const opened = await askToOpenSettingsAsync('exactAlarmPermissionTitle', 'exactAlarmPermissionMessage', AlarmManager.openExactAlarmSettings);
        if (opened) return true;
    }

    if (!AlarmManager.canUseFullScreenIntent()) {
        await askToOpenSettingsAsync('fullScreenPermissionTitle', 'fullScreenPermissionMessage', AlarmManager.openFullScreenIntentSettings);
    }

    return true;
}

function askToOpenSettingsAsync(titleKey, messageKey, openSettings) {
    return new Promise((resolve) => {
        Alert.alert(
            translate(titleKey),
            translate(messageKey),
            [
                { text: translate('notNow'), style: 'cancel', onPress: () => resolve(false) },
                { text: translate('openSettings'), onPress: () => { openSettings(); resolve(true); } }
            ],
            { cancelable: true, onDismiss: () => resolve(false) }
        );
    });
}
