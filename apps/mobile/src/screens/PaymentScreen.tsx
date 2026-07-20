import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useStripe } from '@stripe/stripe-react-native';
import { useSession } from '../context/SessionContext';
import { apiFetch } from '../lib/api';
import { theme } from '../lib/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;

const TIP_OPTIONS = [
  { label: '15%', value: 0.15 },
  { label: '20%', value: 0.2 },
  { label: '25%', value: 0.25 },
  { label: 'None', value: 0 },
];

const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

type PaymentFormProps = Props & {
  initPaymentSheet?: ReturnType<typeof useStripe>['initPaymentSheet'];
  presentPaymentSheet?: ReturnType<typeof useStripe>['presentPaymentSheet'];
  retrieveSetupIntent?: ReturnType<typeof useStripe>['retrieveSetupIntent'];
};

function PaymentForm({
  navigation,
  route,
  initPaymentSheet,
  presentPaymentSheet,
  retrieveSetupIntent,
}: PaymentFormProps) {
  const mode = route.params?.mode ?? 'setup';
  const paramTabTotal = route.params?.tabTotal ?? 0;
  const orderId = route.params?.orderId;
  const orderTotal = route.params?.orderTotal ?? 0;
  const {
    sessionId,
    sessionToken,
    guestId,
    venueName,
    brandColor,
    tipPercent,
    setTipPercent,
    paymentIntentId,
    setPaymentIntentId,
    setSession,
  } = useSession();
  const [selectedTip, setSelectedTip] = useState(tipPercent);
  const [customTip, setCustomTip] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentsDisabled, setPaymentsDisabled] = useState(false);
  const [tabTotal, setTabTotal] = useState(paramTabTotal);

  const accent = brandColor ?? theme.colors.gold;
  const stripeReady = Boolean(initPaymentSheet && presentPaymentSheet && retrieveSetupIntent);

  useEffect(() => {
    if (mode === 'close' && sessionId && sessionToken && !paramTabTotal) {
      apiFetch(`/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
        .then((data) => setTabTotal(Number(data.total_amount ?? 0)))
        .catch(() => {});
    }
  }, [mode, sessionId, sessionToken, paramTabTotal]);

  function handleTipSelect(value: number) {
    setSelectedTip(value);
    setCustomTip('');
    setTipPercent(value);
  }

  function effectiveTipPercent(): number {
    if (customTip) {
      const parsed = parseFloat(customTip);
      if (!Number.isNaN(parsed) && parsed >= 0) return parsed / 100;
    }
    return selectedTip;
  }

  async function setupPreauth() {
    if (!sessionToken || !sessionId || !guestId) return;
    setLoading(true);
    try {
      const data = await apiFetch('/payments/setup-intent', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ session_id: sessionId, guest_id: guestId }),
      });

      if (data.payments_disabled || !data.client_secret) {
        setPaymentsDisabled(true);
        Alert.alert(
          'Payments unavailable',
          data.message ?? 'Stripe is not configured for this venue yet. You can still order. Pay at the counter.'
        );
        return;
      }

      if (!stripeReady) {
        await setSession({ cardSaved: true });
        Alert.alert('Pay at counter', `Tip preference saved: ${Math.round(effectiveTipPercent() * 100)}%.`);
        navigation.goBack();
        return;
      }

      const { error: initError } = await initPaymentSheet!({
        setupIntentClientSecret: data.client_secret,
        merchantDisplayName: venueName ?? 'TableFlow',
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet!();
      if (presentError) {
        if (presentError.code !== 'Canceled') throw new Error(presentError.message);
        return;
      }

      const setupResult = await retrieveSetupIntent!(data.client_secret);
      const paymentMethodId = setupResult.setupIntent?.paymentMethodId;

      if (paymentMethodId) {
        const auth = await apiFetch('/payments/authorize', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sessionToken}` },
          body: JSON.stringify({
            session_id: sessionId,
            guest_id: guestId,
            amount: 100,
            payment_method_id: paymentMethodId,
          }),
        });
        if (auth.payment_intent_id) {
          setPaymentIntentId(auth.payment_intent_id);
        }
      }

      await setSession({ cardSaved: true });
      Alert.alert('Card saved', `Your card is set up for ${venueName}.`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Payment setup failed');
    } finally {
      setLoading(false);
    }
  }

  async function closeTab() {
    if (!sessionToken) return;
    const tip = effectiveTipPercent();
    setTipPercent(tip);
    const subtotalCents = Math.round(tabTotal * 100);
    const tipCents = Math.round(tabTotal * tip * 100);
    const finalAmount = subtotalCents + tipCents;

    if (paymentsDisabled || !stripeReady || !paymentIntentId) {
      Alert.alert(
        'Pay at counter',
        `Your total is $${tabTotal.toFixed(2)} plus ${Math.round(tip * 100)}% tip. Ask your server for the check.`
      );
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/payments/capture', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          final_amount: finalAmount,
          tip_amount: tipCents,
        }),
      });
      Alert.alert('Payment complete', `Charged $${(finalAmount / 100).toFixed(2)} including tip.`);
      navigation.navigate('Menu');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  }

  async function payForOrder() {
    if (!sessionToken || !sessionId || !guestId || !orderId) return;
    const tip = effectiveTipPercent();
    const subtotalCents = Math.round(orderTotal * 100);
    const tipCents = Math.round(orderTotal * tip * 100);

    if (paymentsDisabled || !stripeReady) {
      Alert.alert(
        'Pay at counter',
        `Your order total is $${orderTotal.toFixed(2)} plus ${Math.round(tip * 100)}% tip. Ask your server to pay.`
      );
      navigation.navigate('OrderStatus', { orderId });
      return;
    }

    setLoading(true);
    try {
      const setup = await apiFetch('/payments/setup-intent', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ session_id: sessionId, guest_id: guestId }),
      });

      if (setup.payments_disabled || !setup.client_secret) {
        setPaymentsDisabled(true);
        Alert.alert('Pay at counter', setup.message ?? 'Online payment unavailable.');
        navigation.navigate('OrderStatus', { orderId });
        return;
      }

      const { error: initError } = await initPaymentSheet!({
        setupIntentClientSecret: setup.client_secret,
        merchantDisplayName: venueName ?? 'TableFlow',
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet!();
      if (presentError) {
        if (presentError.code !== 'Canceled') throw new Error(presentError.message);
        return;
      }

      const setupResult = await retrieveSetupIntent!(setup.client_secret);
      const paymentMethodId = setupResult.setupIntent?.paymentMethodId;
      if (!paymentMethodId) throw new Error('No payment method');

      const charge = await apiFetch('/payments/charge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({
          session_id: sessionId,
          guest_id: guestId,
          order_id: orderId,
          amount: subtotalCents,
          tip_amount: tipCents,
          payment_method_id: paymentMethodId,
        }),
      });

      const chargedCents =
        typeof charge.amount === 'number' && charge.amount > 0
          ? charge.amount
          : subtotalCents + tipCents;
      const taxCents = typeof charge.tax_amount === 'number' ? charge.tax_amount : 0;
      const taxNote = taxCents > 0 ? ` (includes $${(taxCents / 100).toFixed(2)} tax)` : '';
      Alert.alert(
        'Payment complete',
        `Paid $${(chargedCents / 100).toFixed(2)} including tip${taxNote}.`
      );
      navigation.navigate('OrderStatus', { orderId });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  }

  async function handlePrimaryAction() {
    if (mode === 'close') {
      await closeTab();
    } else if (mode === 'pay_order') {
      await payForOrder();
    } else {
      await setupPreauth();
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {mode === 'close' ? 'Close Tab' : mode === 'pay_order' ? 'Pay for Order' : 'Payment'}
      </Text>
      <Text style={styles.subtitle}>
        {mode === 'close'
          ? `Pay your tab at ${venueName}`
          : mode === 'pay_order'
            ? `Pay now for this order at ${venueName}`
            : `Save your card now and pay at the end of your meal at ${venueName}`}
      </Text>

      {mode === 'close' && (
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Tab total</Text>
          <Text style={styles.totalAmount}>${tabTotal.toFixed(2)}</Text>
        </View>
      )}

      {mode === 'pay_order' && (
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Order total</Text>
          <Text style={styles.totalAmount}>${orderTotal.toFixed(2)}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Select tip</Text>
      <View style={styles.tipRow}>
        {TIP_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.label}
            style={[
              styles.tipButton,
              selectedTip === opt.value && !customTip && { backgroundColor: accent, borderColor: accent },
            ]}
            onPress={() => handleTipSelect(opt.value)}
          >
            <Text style={[styles.tipText, selectedTip === opt.value && !customTip && { color: theme.colors.goldOn }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.customTip}
        placeholder="Custom tip %"
        keyboardType="decimal-pad"
        value={customTip}
        onChangeText={setCustomTip}
      />

      {paymentsDisabled ? (
        <View style={styles.disabledBox}>
          <Text style={styles.disabledText}>
            Online payments are not available at this venue yet. Ask your server for the check.
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: accent }, loading && styles.buttonDisabled]}
          onPress={handlePrimaryAction}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading
              ? 'Processing'
              : mode === 'close'
                ? stripeReady && paymentIntentId
                  ? 'Pay & Close Tab'
                  : 'Pay at Counter'
                : mode === 'pay_order'
                  ? paymentsDisabled || !stripeReady
                    ? 'Pay at Counter'
                    : 'Pay Now'
                  : 'Save Card & Open Tab'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function PaymentWithStripe(props: Props) {
  const { initPaymentSheet, presentPaymentSheet, retrieveSetupIntent } = useStripe();
  return (
    <PaymentForm
      {...props}
      initPaymentSheet={initPaymentSheet}
      presentPaymentSheet={presentPaymentSheet}
      retrieveSetupIntent={retrieveSetupIntent}
    />
  );
}

export function PaymentScreen(props: Props) {
  if (stripeKey) {
    return <PaymentWithStripe {...props} />;
  }
  return <PaymentForm {...props} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 24 },
  title: { fontSize: 28, fontFamily: theme.fonts.serif, marginBottom: 8, color: theme.colors.onSurface },
  subtitle: { color: theme.colors.onSurfaceVariant, marginBottom: 24, lineHeight: 22, fontFamily: theme.fonts.sans },
  totalBox: {
    backgroundColor: theme.colors.surfaceLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.radii.lg,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  totalLabel: { color: theme.colors.onSurfaceVariant, fontFamily: theme.fonts.sans, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  totalAmount: { fontSize: 32, fontFamily: theme.fonts.serif, marginTop: 4, color: theme.colors.gold },
  sectionTitle: { fontSize: 16, fontFamily: theme.fonts.sansBold, marginBottom: 12, color: theme.colors.onSurface },
  tipRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  tipButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceLow,
  },
  tipText: { fontFamily: theme.fonts.sansBold, fontSize: 15, color: theme.colors.onSurface },
  customTip: {
    backgroundColor: theme.colors.surfaceLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.radii.md,
    padding: 14,
    marginBottom: 24,
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.sans,
  },
  button: { padding: 16, borderRadius: theme.radii.full, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: theme.colors.goldOn, fontFamily: theme.fonts.sansBold, fontSize: 15, letterSpacing: 0.5 },
  disabledBox: { backgroundColor: theme.colors.surfaceLow, borderWidth: 1, borderColor: theme.colors.sun, padding: 16, borderRadius: theme.radii.md },
  disabledText: { color: theme.colors.sun, lineHeight: 20, fontFamily: theme.fonts.sans },
});
