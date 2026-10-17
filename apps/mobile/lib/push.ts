import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { registerPushToken } from "./api";

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });

/** Asks permission only when the user taps "turn on notifications", then registers this device's Expo push token. */
export async function enablePush(): Promise<"enabled" | "denied" | "unsupported"> {
  if (!Device.isDevice) return "unsupported";                              // simulators cannot receive push notifications
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("default", { name: "Fluo", importance: Notifications.AndroidImportance.DEFAULT });
  const existing = await Notifications.getPermissionsAsync();
  const status = existing.granted ? "granted" : (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return "denied";
  const projectId = Constants.expoConfig?.extra?.["eas"]?.projectId ?? Constants.easConfig?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  await registerPushToken(token, Platform.OS === "ios" ? "ios" : "android");
  return "enabled";
}
