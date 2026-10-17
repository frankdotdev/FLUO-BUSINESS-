export const API_URL: string = (() => {
  const u = process.env.EXPO_PUBLIC_API_URL;
  if (!u) throw new Error("EXPO_PUBLIC_API_URL is not set (see apps/mobile/.env.example)");
  return u.replace(/\/$/, "");
})();
