import { useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
  Share,
} from 'react-native';
import Canvas, { Image as CanvasImage } from 'react-native-canvas';
import RNFS from 'react-native-fs';
import {
  Map,
  MapStyles,
  Camera,
  type MapRef,
} from '@sovereignsolutions/ssmap-react-native';

const BANNER_TITLE = 'Sovereign Fleet Operations Overview';
const BANNER_SUBTITLE = 'Exported from Sovereign Map SDK';

export const MapSnapshotScreen = () => {
  const mapRef = useRef<MapRef>(null);
  const canvasRef = useRef<Canvas | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [compositing, setCompositing] = useState(false);
  const [includeBanner, setIncludeBanner] = useState(true);
  const [canvasReady, setCanvasReady] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  // Raw base64 (no prefix) of the final image — used for saving
  const [saveBase64, setSaveBase64] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleCanvasRef = useCallback((canvas: Canvas | null) => {
    if (!canvas) return;
    canvasRef.current = canvas;
    setTimeout(() => setCanvasReady(true), 300);
  }, []);

  // Returns raw base64 (no prefix) of the composited image
  const compositeBanner = (dataUri: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        reject(new Error('Canvas not ready'));
        return;
      }

      Image.getSize(
        dataUri,
        (w, h) => {
          const img = new CanvasImage(canvas);

          img.addEventListener('load', async () => {
            try {
              canvas.width = w;
              canvas.height = h;

              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);

              const minDim = Math.min(w, h);
              
              // Base banner dimensions on the smaller dimension to prevent it being huge in portrait mode
              const padding = Math.round(minDim * 0.05);
              const bannerH = Math.round(minDim * 0.16); 
              const bw = Math.round(w * 0.85); // 85% of image width
              const bx = padding; // Align left
              const by = padding; // Align top
              const radius = Math.round(minDim * 0.03);
              const bh = bannerH;

              ctx.beginPath();
              ctx.moveTo(bx + radius, by);
              ctx.lineTo(bx + bw - radius, by);
              ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius);
              ctx.lineTo(bx + bw, by + bh - radius);
              ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - radius, by + bh);
              ctx.lineTo(bx + radius, by + bh);
              ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - radius);
              ctx.lineTo(bx, by + radius);
              ctx.quadraticCurveTo(bx, by, bx + radius, by);
              ctx.closePath();
              ctx.fillStyle = 'rgba(26, 37, 54, 0.88)';
              ctx.fill();

              const titleSize = Math.round(bannerH * 0.3);
              const subtitleSize = Math.round(bannerH * 0.2);
              const textX = bx + Math.round(bw * 0.05); // 5% padding inside the banner
              const titleY = by + Math.round(bannerH * 0.42);
              const subY = titleY + subtitleSize + Math.round(bannerH * 0.1);

              ctx.fillStyle = '#ffffff';
              ctx.font = `bold ${titleSize}px sans-serif`;
              ctx.fillText(BANNER_TITLE, textX, titleY);

              ctx.fillStyle = 'rgba(180, 200, 220, 0.9)';
              ctx.font = `${subtitleSize}px sans-serif`;
              ctx.fillText(BANNER_SUBTITLE, textX, subY);

              // Add a small delay to ensure drawing commands are flushed to the webview
              setTimeout(async () => {
                try {
                  let dataUrl = (await canvas.toDataURL()) as string;
                  
                  // react-native-canvas sometimes returns the string wrapped in JSON quotes
                  if (dataUrl.startsWith('"') && dataUrl.endsWith('"')) {
                    dataUrl = dataUrl.substring(1, dataUrl.length - 1);
                  }
                  
                  // Clean up the prefix if it exists so we just get raw base64
                  const base64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
                  resolve(base64);
                } catch (e) {
                  reject(e);
                }
              }, 150);
            } catch (e) {
              reject(e);
            }
          });

          img.addEventListener('error', () => {
            reject(new Error('Canvas image load error'));
          });
          img.src = dataUri;
        },
        error => {
          reject(error);
        },
      );
    });
  };

  const handleTakeSnapshot = async () => {
    if (!mapRef.current) {
      Alert.alert('Error', 'Map is not ready yet.');
      return;
    }
    setLoading(true);
    try {
      // Native returns "data:image/png;base64,<data>"
      const dataUri = await mapRef.current.createStaticMapImage({
        output: 'base64',
      });

      if (includeBanner) {
        if (!canvasReady) {
          Alert.alert('Error', 'Canvas not ready, try again.');
          return;
        }
        setCompositing(true);
        setPreviewUri(null);
        setModalVisible(true);

        const base64 = await compositeBanner(dataUri);
        setPreviewUri(`data:image/png;base64,${base64}`);
        setSaveBase64(base64);
        setCompositing(false);
      } else {
        const base64 = dataUri.replace(/^data:image\/png;base64,/, '');
        setPreviewUri(dataUri);
        setSaveBase64(base64);
        setModalVisible(true);
      }
    } catch (e) {
      Alert.alert('Snapshot failed', String(e));
      setCompositing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!saveBase64) return;
    setSaving(true);
    try {
      const fileName = `map-snapshot-${Date.now()}.png`;
      let destPath: string;

      if (Platform.OS === 'android') {
        // Request storage permission for Android 10 and below
        if (Platform.Version <= 32) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            {
              title: 'Storage Permission Required',
              message: 'This app needs access to your storage to save map snapshots.',
              buttonPositive: 'OK',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permission Denied', 'Storage permission is required to save snapshots.');
            setSaving(false);
            return;
          }
        }
        const downloadDir = `${RNFS.ExternalStorageDirectoryPath}/Download`;
        if (!(await RNFS.exists(downloadDir))) await RNFS.mkdir(downloadDir);
        destPath = `${downloadDir}/${fileName}`;
      } else {
        destPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      }

      await RNFS.writeFile(destPath, saveBase64, 'base64');
      
      if (Platform.OS === 'android') {
        await RNFS.scanFile(destPath);
        Alert.alert('Saved', `Image saved to Download/${fileName}`);
      } else {
        // Trigger iOS Share Sheet for "Save to Files"
        try {
          await Share.share({
            url: `file://${destPath}`,
          });
        } catch (err) {
          console.log('Share error:', err);
        }
      }
    } catch (e) {
      Alert.alert('Save failed', String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setModalVisible(false);
    setPreviewUri(null);
    setSaveBase64(null);
    setCompositing(false);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <View style={styles.container}>
      <Map
        ref={mapRef}
        style={styles.map}
        mapStyle={MapStyles.BRIGHT}
        compass={true}
      >
        <Camera initialViewState={{ center: [77.209, 28.6139], zoom: 12 }} />
      </Map>

      {/* Hidden canvas — must stay mounted for compositing */}
      <View style={styles.hiddenCanvas} pointerEvents="none">
        <Canvas ref={handleCanvasRef} style={styles.canvasSize} />
      </View>

      {/* Bottom card */}
      <View style={styles.placeholderCard}>
        <Text style={styles.title}>Map Snapshot</Text>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setIncludeBanner(v => !v)}
          activeOpacity={0.7}
        >
          <View
            style={[styles.checkbox, includeBanner && styles.checkboxChecked]}
          >
            {includeBanner && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Include Title Banner</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.snapshotButton, loading && styles.buttonDisabled]}
          onPress={handleTakeSnapshot}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.snapshotButtonText}>Take Snapshot</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Preview Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Snapshot Preview</Text>

            {compositing || !previewUri ? (
              <View style={styles.previewPlaceholder}>
                <ActivityIndicator color="#3b82f6" />
                {compositing && (
                  <Text style={styles.compositingText}>Applying banner…</Text>
                )}
              </View>
            ) : (
              <Image
                source={{ uri: previewUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (saving || compositing) && styles.buttonDisabled,
                ]}
                onPress={handleSave}
                disabled={saving || compositing}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  hiddenCanvas: { position: 'absolute', opacity: 0, top: 0, left: 0 },
  canvasSize: { width: 1, height: 1 },
  placeholderCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#3b82f6',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: '#3b82f6' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 16 },
  checkboxLabel: { fontSize: 14, color: '#334155', fontWeight: '500' },
  snapshotButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: '#93c5fd' },
  snapshotButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 14,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: 260,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginBottom: 16,
  },
  previewPlaceholder: {
    width: '100%',
    height: 260,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  compositingText: { fontSize: 13, color: '#64748b', marginTop: 8 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  saveButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
