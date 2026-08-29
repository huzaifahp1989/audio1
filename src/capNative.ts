import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { PushNotifications } from '@capacitor/push-notifications'
import { LocalNotifications } from '@capacitor/local-notifications'

export async function registerNativeCapabilities() {
  if (Capacitor.isNativePlatform()) {
    try {
      await PushNotifications.requestPermissions()
    } catch (error) {
      console.warn('[capNative] Push permission request failed', error)
    }

    try {
      await LocalNotifications.requestPermissions()
    } catch (error) {
      console.warn('[capNative] Local notification permission request failed', error)
    }

    try {
      await PushNotifications.register()
    } catch (error) {
      console.warn('[capNative] Push registration failed', error)
    }

    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        console.log('[capNative] App moved to background')
      }
    })
  }
}
