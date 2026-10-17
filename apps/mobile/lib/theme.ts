import { useColorScheme } from "react-native";
// Same tokens as the web app: solid colours only, one accent, no gradients.
const light = { bg: "#FFFFFF", surface: "#F2F2F0", border: "#DDDDD8", ink: "#0B0B0B", muted: "#5C5C5C", accent: "#9FD19B", accentStrong: "#2F7D3A", error: "#B42318" };
const dark = { bg: "#0B0B0B", surface: "#161616", border: "#2A2A2A", ink: "#F5F5F2", muted: "#A3A3A0", accent: "#9FD19B", accentStrong: "#7FC48A", error: "#F97066" };
export const useTheme = () => (useColorScheme() === "dark" ? dark : light);
export const RADIUS = 10, CONTROL = 48;
