
// app.config.js
import 'dotenv/config'; // optional if you use environment variables

export default ({ config }) => ({
  ...config,
  name: "TinyDreamers",
  slug: "tinydreamers",
  owner: "smallpotato",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/3e1ea99a-f17a-42c3-b801-1361ce0bce92.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: false,
  scheme: "tinydreamers", // this must be at root level
  splash: {
    image: "./assets/images/3e1ea99a-f17a-42c3-b801-1361ce0bce92.png",
    resizeMode: "contain",
    backgroundColor: "#E8B4D9"
  },
  extra: {
    eas: {
      projectId: "3e6ce51d-1a8a-4662-a934-565586a23105",
    },
    router: {}
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.smallpotato.tinydreamers",
    buildNumber: "1",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: "This app needs access to your camera to record videos of your child's learning moments.",
      NSMicrophoneUsageDescription: "This app needs access to your microphone to record audio with videos."
    }
  },
  android: {
    package: "com.smallpotato.tinydreamers",
    adaptiveIcon: {
      foregroundImage: "./assets/images/3e1ea99a-f17a-42c3-b801-1361ce0bce92.png",
      backgroundColor: "#E8B4D9"
    },
    edgeToEdgeEnabled: true,
    permissions: [
      "CAMERA",
      "RECORD_AUDIO"
    ]
  },
  web: {
    favicon: "./assets/images/3e1ea99a-f17a-42c3-b801-1361ce0bce92.png",
    bundler: "metro"
  },
  plugins: [
    "expo-font",
    "expo-router",
    "expo-web-browser",
    [
      "expo-camera",
      {
        cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to record videos of your child's learning moments.",
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone to record audio with videos.",
        recordAudioAndroid: true
      }
    ],
    [
      "expo-media-library",
      {
        photosPermission: "Allow $(PRODUCT_NAME) to access your photos and videos to upload moments.",
        savePhotosPermission: "Allow $(PRODUCT_NAME) to save photos and videos.",
        isAccessMediaLocationEnabled: true
      }
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Allow $(PRODUCT_NAME) to access your photos and videos to upload moments."
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  }
});
