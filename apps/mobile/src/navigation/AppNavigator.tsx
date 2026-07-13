import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useSession } from '../context/SessionContext';
import { theme } from '../lib/theme';
import { ScanScreen } from '../screens/ScanScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { ItemDetailScreen } from '../screens/ItemDetailScreen';
import { CartScreen } from '../screens/CartScreen';
import { OrderStatusScreen } from '../screens/OrderStatusScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { GuestRequestsScreen } from '../screens/GuestRequestsScreen';
import { ServerLoginScreen } from '../screens/server/ServerLoginScreen';
import { ServerFloorScreen } from '../screens/server/ServerFloorScreen';
import { ServerTableScreen } from '../screens/server/ServerTableScreen';
import { ServerRequestsScreen } from '../screens/server/ServerRequestsScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

const modalOptions = {
  presentation: 'modal' as const,
  animation: 'slide_from_bottom' as const,
};

function RootNavigator() {
  const { isReady, sessionId } = useSession();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    SpaceGrotesk_600SemiBold,
  });

  if (!isReady || !fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={theme.colors.flow} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={sessionId ? 'Menu' : 'Scan'}
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.paper },
          headerTintColor: theme.colors.ink,
          headerTitleStyle: { fontFamily: theme.fonts.display, fontWeight: '600' },
        }}
      >
        <Stack.Screen name="Scan" component={ScanScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Menu" component={MenuScreen} options={{ title: 'Menu' }} />
        <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item', ...modalOptions }} />
        <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Your Cart', ...modalOptions }} />
        <Stack.Screen name="OrderStatus" component={OrderStatusScreen} options={{ title: 'Order Status' }} />
        <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment', ...modalOptions }} />
        <Stack.Screen name="GuestRequests" component={GuestRequestsScreen} options={{ title: 'Request', ...modalOptions }} />
        <Stack.Screen name="ServerLogin" component={ServerLoginScreen} options={{ title: 'Server Sign In' }} />
        <Stack.Screen name="ServerFloor" component={ServerFloorScreen} options={{ title: 'Floor' }} />
        <Stack.Screen name="ServerTable" component={ServerTableScreen} options={{ title: 'Table' }} />
        <Stack.Screen name="ServerRequests" component={ServerRequestsScreen} options={{ title: 'Requests' }} />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export function AppNavigator() {
  const navigator = <RootNavigator />;
  if (stripeKey) {
    return <StripeProvider publishableKey={stripeKey}>{navigator}</StripeProvider>;
  }
  return navigator;
}

const styles = StyleSheet.create({
  boot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.paper },
});
