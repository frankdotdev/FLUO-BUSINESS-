import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "./config";

// Sessions live in the device's secure storage (Keychain / Keystore), never in plain storage.
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [expoClient({ scheme: "fluo", storagePrefix: "fluo", storage: SecureStore })],
});
