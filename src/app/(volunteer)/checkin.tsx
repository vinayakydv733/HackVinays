import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, Camera } from 'expo-camera';

export default function VolunteerCheckIn() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string, data: string }) => {
    setScanned(true);
    setIsScanning(false);
    Alert.alert(`Participant Scanned!`, `Data: ${data}\nMarked as arrived.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Search / Scan Header */}
      {!isScanning ? (
        <TouchableOpacity style={styles.scanBtn} onPress={() => setIsScanning(true)}>
          <MaterialCommunityIcons name="qrcode-scan" size={32} color="#fff" />
          <Text style={styles.scanText}>Tap to Scan QR Code</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.cameraContainer}>
          {hasPermission === null ? (
            <Text style={{ color: '#fff' }}>Requesting camera permission...</Text>
          ) : hasPermission === false ? (
            <Text style={{ color: '#ff006e' }}>No access to camera</Text>
          ) : (
            <CameraView
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <TouchableOpacity style={styles.cancelScanBtn} onPress={() => { setIsScanning(false); setScanned(false); }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel Scan</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>Check-In Progress</Text>
        <Text style={styles.progressText}>84 / 120 Checked In</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '70%' }]} />
        </View>
      </View>

      {/* Active Team Panel */}
      <View style={styles.panel}>
        <Text style={styles.teamName}>Team: Code Blooded</Text>
        
        <View style={styles.counterRow}>
          <Text style={styles.counterLabel}>Headcount Received</Text>
          <View style={styles.counter}>
            <TouchableOpacity style={styles.counterBtn}>
              <MaterialCommunityIcons name="minus" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.counterVal}>4</Text>
            <TouchableOpacity style={styles.counterBtn}>
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.subhead}>Distribute Kits</Text>
        
        <TouchableOpacity style={styles.checkRow}>
          <MaterialCommunityIcons name="checkbox-marked" size={24} color="#ff006e" />
          <Text style={styles.checkItem}>ID Cards (x4)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.checkRow}>
          <MaterialCommunityIcons name="checkbox-blank-outline" size={24} color="#a0a0a0" />
          <Text style={styles.checkItem}>T-Shirts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.confirmBtn} onPress={() => setScanned(false)}>
          <Text style={styles.confirmBtnText}>Complete Check-In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 100 },
  scanBtn: {
    backgroundColor: '#ff006e',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  scanText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  cameraContainer: {
    height: 300,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  cancelScanBtn: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12
  },
  progressContainer: { marginBottom: 24 },
  progressTitle: { color: '#a0a0a0', fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  progressText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  progressBar: { height: 8, backgroundColor: '#333', borderRadius: 4 },
  progressFill: { height: 8, backgroundColor: '#ff006e', borderRadius: 4 },
  panel: { backgroundColor: '#1e1e1e', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
  teamName: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  counterLabel: { color: '#e0e0e0', fontSize: 16 },
  counter: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212', borderRadius: 8, padding: 4 },
  counterBtn: { padding: 8, backgroundColor: '#333', borderRadius: 6 },
  counterVal: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginHorizontal: 16 },
  subhead: { color: '#a0a0a0', fontSize: 14, textTransform: 'uppercase', marginBottom: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  checkItem: { color: '#fff', fontSize: 16, marginLeft: 12 },
  confirmBtn: { backgroundColor: '#ff006e', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
