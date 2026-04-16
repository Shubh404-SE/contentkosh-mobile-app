import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppRoot } from './src/AppRoot';
import { initSentry } from './src/lib/sentry';

initSentry();

export default function App() {
  return (
    <SafeAreaProvider>
      <AppRoot />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
