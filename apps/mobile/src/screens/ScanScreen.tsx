import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiFetch } from '../lib/api';
import { useSession } from '../context/SessionContext';
import { theme } from '../lib/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

export function ScanScreen({ navigation }: Props) {
  const { setSession } = useSession();
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [showNfc, setShowNfc] = useState(false);
  const [nfcUid, setNfcUid] = useState('');

  const handleScan = useCallback(
    async (code?: string, nfc?: string) => {
      const payload = code ?? qrCode;
      const nfcPayload = nfc ?? nfcUid;
      if ((!payload && !nfcPayload) || loading) return;
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch('/sessions/scan', {
          method: 'POST',
          body: JSON.stringify(
            nfcPayload ? { nfc_uid: nfcPayload } : { qr_code: payload }
          ),
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await setSession({
          sessionId: data.session_id,
          sessionToken: data.session_token,
          venueId: data.venue_id,
          tableId: data.table_id,
          tableName: data.table_name,
          venueName: data.venue_name,
          guestId: data.guest_id,
          tabMode: data.tab_mode,
          currency: data.currency,
          brandColor: data.brand_color ?? theme.colors.flow,
        });
        navigation.replace('Menu');
      } catch (err) {
        setScanned(false);
        setError(err instanceof Error ? err.message : 'Scan failed');
      } finally {
        setLoading(false);
      }
    },
    [qrCode, nfcUid, loading, navigation, setSession]
  );

  function onBarcodeScanned(result: { data: string }) {
    if (scanned || loading) return;
    setScanned(true);
    setQrCode(result.data);
    void handleScan(result.data);
  }

  return (
    <View style={styles.container}>
      {showCamera && permission?.granted ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
          />
          <View style={styles.scanTarget}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.scanHint}>Point at the QR code on your table</Text>
        </View>
      ) : showCamera && permission && !permission.granted ? (
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionText}>Enable camera to scan QR</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.manualSection}>
        <Text style={styles.title}>Scan to Order</Text>
        <Text style={styles.subtitle}>Or enter the code manually</Text>

        <TextInput
          style={styles.input}
          placeholder="tf_t_xxxx..."
          placeholderTextColor={theme.colors.muted}
          value={qrCode}
          onChangeText={(text) => {
            setQrCode(text);
            setScanned(false);
          }}
          autoCapitalize="none"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={theme.colors.flow} />
        ) : (
          <TouchableOpacity style={styles.button} onPress={() => handleScan()}>
            <Text style={styles.buttonText}>Open Menu</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.link} onPress={() => setShowCamera((v) => !v)}>
          <Text style={styles.linkText}>{showCamera ? 'Use manual entry only' : 'Show camera scanner'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => setShowNfc((v) => !v)}>
          <Text style={styles.linkText}>{showNfc ? 'Hide NFC tap' : 'Tap NFC pad instead'}</Text>
        </TouchableOpacity>
        {showNfc && (
          <View style={styles.nfcBox}>
            <Text style={styles.nfcHint}>Simulate NFC tap: enter table NFC UID</Text>
            <TextInput
              style={styles.input}
              placeholder="nfc_uid..."
              value={nfcUid}
              onChangeText={setNfcUid}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.button, { marginTop: 8 }]}
              onPress={() => handleScan(undefined, nfcUid)}
              disabled={!nfcUid || loading}
            >
              <Text style={styles.buttonText}>Open via NFC</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('ServerLogin')}>
          <Text style={styles.linkText}>Server Mode →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.ink },
  cameraWrap: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  scanTarget: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: theme.colors.flow,
  },
  cornerTL: { top: '30%', left: '20%', borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 8 },
  cornerTR: { top: '30%', right: '20%', borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 8 },
  cornerBL: { bottom: '30%', left: '20%', borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: '30%', right: '20%', borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: 8 },
  scanHint: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    color: '#FFF',
    fontFamily: theme.fonts.display,
    fontSize: 16,
    textAlign: 'center',
    width: '100%',
  },
  manualSection: { backgroundColor: theme.colors.paper, padding: 24, borderTopLeftRadius: theme.radii.xl, borderTopRightRadius: theme.radii.xl },
  title: { fontSize: 24, fontFamily: theme.fonts.display, marginBottom: 4, color: theme.colors.ink },
  subtitle: { fontSize: 15, fontFamily: theme.fonts.sans, color: theme.colors.muted, marginBottom: 16 },
  permissionBtn: { padding: 16, backgroundColor: theme.colors.flowLight, borderRadius: theme.radii.md, margin: 24, alignItems: 'center' },
  permissionText: { color: theme.colors.flow, fontFamily: theme.fonts.sansBold },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: 14,
    marginBottom: 16,
    fontSize: 15,
    fontFamily: theme.fonts.sans,
  },
  button: { backgroundColor: theme.colors.flow, padding: 16, borderRadius: theme.radii.full, alignItems: 'center' },
  buttonText: { color: '#FFF', fontFamily: theme.fonts.display, fontSize: 15 },
  error: { color: theme.colors.error, marginBottom: 12, fontFamily: theme.fonts.sans },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: theme.colors.flow, fontFamily: theme.fonts.sansBold },
  nfcBox: { marginTop: 16, padding: 16, backgroundColor: theme.colors.surface, borderRadius: theme.radii.lg, borderWidth: 1, borderColor: theme.colors.border },
  nfcHint: { color: theme.colors.muted, fontSize: 13, marginBottom: 8, fontFamily: theme.fonts.sans },
});
