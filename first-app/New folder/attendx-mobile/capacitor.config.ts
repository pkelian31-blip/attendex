import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId:   "com.valide.attendxpro",
  appName: "AttendX PRO",
  webDir:  "out",           // Next.js static export folder
  server: {
    // For live-reload during dev: comment out for production APK build
    // url: "http://192.168.x.x:3000",
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#FFFFFF",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "Default",
      backgroundColor: "#3B6FE8",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Geolocation: {
      permissions: {
        android: { accessCoarseLocation: true, accessFineLocation: true },
        ios: { NSLocationWhenInUseUsageDescription: "Used to verify you are in the classroom for attendance." },
      },
    },
  },
  android: {
    backgroundColor: "#FFFFFF",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },
};

export default config;
