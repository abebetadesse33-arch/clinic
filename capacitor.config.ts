import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.ninimed.health",
  appName: "NiniMed Health",
  webDir: "public",
  server: {
    // In production or local test, Capacitor loads from server or androidScheme
    androidScheme: "https",
    cleartext: true,
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
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Geolocation: {
      androidAccuracy: "fine",
    },
  },
};

export default config;
