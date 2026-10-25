import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { useRef } from "react";
import { ActivityIndicator, Button, StyleSheet, Text, View } from "react-native";
import WebView from "react-native-webview";

const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
const appUrl =
  process.env.EXPO_PUBLIC_WEB_URL ??
  (expoHost ? `http://${expoHost}:3000` : undefined);

export default function App() {
  const webView = useRef<WebView>(null);

  if (!appUrl) {
    return (
      <View style={styles.message}>
        <StatusBar style="auto" />
        <Text style={styles.title}>Cannot find the development server</Text>
        <Text style={styles.body}>
          Start Expo with LAN access, or set EXPO_PUBLIC_WEB_URL to your
          computer&apos;s address, such as http://192.168.1.25:3000.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <WebView<{}>
        ref={webView}
        source={{ uri: appUrl }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.message}>
            <ActivityIndicator size="large" />
            <Text style={styles.body}>Loading Savoria...</Text>
          </View>
        )}
        renderError={() => (
          <View style={styles.message}>
            <Text style={styles.title}>Could not reach Savoria</Text>
            <Text style={styles.body}>
              Check that the web server is running on your computer and that
              your phone is on the same Wi-Fi network.
            </Text>
            <Button title="Try again" onPress={() => webView.current?.reload()} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  message: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    textAlign: "center",
  },
});
