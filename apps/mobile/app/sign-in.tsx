import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput } from "react-native";
import { router } from "expo-router";
import { authClient } from "../lib/auth";
import { CONTROL, useTheme } from "../lib/theme";

export default function SignIn() {
  const t = useTheme();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const input = { minHeight: CONTROL, borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingHorizontal: 12, color: t.ink, fontSize: 16 } as const;

  async function submit() {
    setBusy(true); setMessage(null);
    const res = mode === "up" ? await authClient.signUp.email({ email: email.trim(), password, name: name.trim() }) : await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (res.error) { setMessage(res.error.message ?? "Something went wrong. Please try again."); return; }
    if (mode === "up") { setMessage("Check your email and open the confirmation link, then sign in."); setMode("in"); return; }
    router.back();
  }
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ padding: 24, gap: 12 }}>
      <Text style={{ color: t.ink, fontSize: 24, fontWeight: "800" }}>{mode === "up" ? "Create your account" : "Welcome back"}</Text>
      {message && <Text accessibilityRole="alert" style={{ color: t.accentStrong, fontWeight: "600" }}>{message}</Text>}
      {mode === "up" && <TextInput accessibilityLabel="Your name" placeholder="Your name" placeholderTextColor={t.muted} autoComplete="name" value={name} onChangeText={setName} style={input} />}
      <TextInput accessibilityLabel="Email" placeholder="Email" placeholderTextColor={t.muted} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} style={input} />
      <TextInput accessibilityLabel="Password" placeholder="Password (10+ characters)" placeholderTextColor={t.muted} secureTextEntry autoComplete={mode === "up" ? "new-password" : "current-password"} value={password} onChangeText={setPassword} style={input} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={{ minHeight: CONTROL, borderRadius: 8, backgroundColor: t.ink, alignItems: "center", justifyContent: "center" }}>
        {busy ? <ActivityIndicator color={t.bg} /> : <Text style={{ color: t.bg, fontWeight: "700" }}>{mode === "up" ? "Create account" : "Sign in"}</Text>}</Pressable>
      <Pressable accessibilityRole="button" onPress={() => setMode(mode === "in" ? "up" : "in")}><Text style={{ color: t.accentStrong, fontWeight: "600" }}>{mode === "in" ? "New to Fluo? Create an account" : "Already have an account? Sign in"}</Text></Pressable>
    </KeyboardAvoidingView>
  );
}
