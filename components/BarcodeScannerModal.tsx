
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeScanned: (isbn: string) => void;
}

export default function BarcodeScannerModal({
  visible,
  onClose,
  onBarcodeScanned,
}: BarcodeScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScannedISBNRef = useRef<string>('');

  useEffect(() => {
    if (visible) {
      console.log('Scanner modal opened - resetting state');
      setScanned(false);
      setIsProcessing(false);
      lastScannedISBNRef.current = '';
      
      // Clear any existing timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    }
  }, [visible]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  const handleBarCodeScanned = ({ type, data }: BarcodeScanningResult) => {
    // Prevent multiple scans
    if (scanned || isProcessing) {
      console.log('Scan blocked - already processing:', { scanned, isProcessing });
      return;
    }

    console.log('Barcode scanned:', { type, data });

    // Extract ISBN from barcode data
    let isbn = data;

    // Clean up the ISBN (remove dashes, spaces)
    isbn = isbn.replace(/[-\s]/g, '');

    // Check if this is the same ISBN we just scanned (within the last 3 seconds)
    if (isbn === lastScannedISBNRef.current) {
      console.log('Duplicate scan detected - ignoring');
      return;
    }

    // Validate ISBN format
    if (isbn.length === 13 && (isbn.startsWith('978') || isbn.startsWith('979'))) {
      // Valid EAN-13 ISBN
      console.log('Valid ISBN-13:', isbn);
      
      // Set flags immediately to prevent duplicate processing
      setScanned(true);
      setIsProcessing(true);
      lastScannedISBNRef.current = isbn;
      
      // Call the callback
      onBarcodeScanned(isbn);
      
      // Close the modal
      onClose();
      
      // Reset processing flag after 3 seconds (safety timeout)
      processingTimeoutRef.current = setTimeout(() => {
        console.log('Processing timeout - resetting flags');
        setIsProcessing(false);
        lastScannedISBNRef.current = '';
      }, 3000);
      
    } else if (isbn.length === 10) {
      // Valid ISBN-10
      console.log('Valid ISBN-10:', isbn);
      
      // Set flags immediately to prevent duplicate processing
      setScanned(true);
      setIsProcessing(true);
      lastScannedISBNRef.current = isbn;
      
      // Call the callback
      onBarcodeScanned(isbn);
      
      // Close the modal
      onClose();
      
      // Reset processing flag after 3 seconds (safety timeout)
      processingTimeoutRef.current = setTimeout(() => {
        console.log('Processing timeout - resetting flags');
        setIsProcessing(false);
        lastScannedISBNRef.current = '';
      }, 3000);
      
    } else {
      // Invalid ISBN format
      Alert.alert(
        'Invalid Barcode',
        'This doesn\'t appear to be a valid ISBN barcode. Please try scanning the barcode on the back of the book.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setIsProcessing(false);
            },
          },
          {
            text: 'Cancel',
            onPress: () => {
              setScanned(false);
              setIsProcessing(false);
              onClose();
            },
            style: 'cancel',
          },
        ]
      );
    }
  };

  if (!visible) {
    return null;
  }

  if (!permission) {
    // Camera permissions are still loading
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.message}>Loading camera...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.permissionContainer}>
            <IconSymbol
              ios_icon_name="camera.fill"
              android_material_icon_name="camera"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionMessage}>
              We need your permission to access the camera to scan book barcodes.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
          }}
        />

        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={24}
                color={colors.backgroundAlt}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              {isProcessing ? 'Processing...' : 'Position the barcode within the frame'}
            </Text>
            <Text style={styles.instructionSubtext}>
              {isProcessing ? 'Please wait' : 'Scan the ISBN barcode on the back of the book'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.backgroundAlt,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructions: {
    paddingHorizontal: 40,
    paddingBottom: 60,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.backgroundAlt,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  instructionSubtext: {
    fontSize: 14,
    color: colors.backgroundAlt,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.text,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.backgroundAlt,
  },
});
