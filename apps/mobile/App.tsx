import { SessionProvider } from './src/context/SessionContext';
import { CartProvider } from './src/context/CartContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <CartProvider>
          <AppNavigator />
        </CartProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
