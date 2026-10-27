import { CapacitorConfig } from "@capacitor/cli";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() || "https://www.wisdomcourse.com.et";

let parsedServerUrl: URL;
try {
  parsedServerUrl = new URL(serverUrl);
} catch {
  throw new Error("CAPACITOR_SERVER_URL must be a valid absolute URL.");
}

const isLocalDevelopmentHost =
  parsedServerUrl.hostname === "localhost" ||
  parsedServerUrl.hostname === "127.0.0.1" ||
  parsedServerUrl.hostname === "10.0.2.2";

if (parsedServerUrl.protocol !== "https:" && !(parsedServerUrl.protocol === "http:" && isLocalDevelopmentHost)) {
  throw new Error("CAPACITOR_SERVER_URL must use HTTPS, except for local development hosts.");
}

const config: CapacitorConfig = {
  appId: "org.ninimed.health",
  appName: "NiniMed Health",
  webDir: "public",
  server: {
    url: parsedServerUrl.toString(),
    androidScheme: "https",
    cleartext: parsedServerUrl.protocol === "http:",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0A1612",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      spinnerColor: "#005C4B",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0A1612",
    },
    Geolocation: {
      androidAccuracy: "fine",
    },
  },
};

export default config;
