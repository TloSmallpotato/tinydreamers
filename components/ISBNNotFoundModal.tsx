
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import CantFindBookModal from '@/components/CantFindBookModal';
import * as Haptics from 'expo-haptics';

interface ISBNNotFoundModalProps {
  visible: boolean;
  scannedISBN: string;
  onClose: () => void;
  onManualISBNSubmit: (isbn: string) => void;
  onSearchBookName: () => void;
  isSearching?: boolean;
}

export default function ISBNNotFoundModal({
  visible,
  scannedISBN,
  onClose,
  onManualISBNSubmit,
  onSearchBookName,
  isSearching = false,
}: ISBNNotFoundModalProps) {
  const [manualISBN, setManualISBN] = useState('');
  const [isManualInputMode, setIsManualInputMode] = useState(false);

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setManualISBN('');
      setIsManualInputMode(false);
    }
  }, [visible]);

  const handleManualISBNChange = (text: string) => {
    // Only allow digits
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setManualISBN(digitsOnly);
  };

  const handleManualISBNSubmit = () => {
    if (manualISBN.length === 10 || manualISBN.length === 13) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onManualISBNSubmit(manualISBN);
    }
  };

  const handleEnterISBN = () => {
    console.log('📝 Enter ISBN manually selected');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsManualInputMode(true);
  };

  const handleSearchBookName = () => {
    console.log('🔍 Search book name selected');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSearchBookName();
  };

  const handleBackToOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsManualInputMode(false);
    setManualISBN('');
  };

  const isValidISBN = manualISBN.length === 10 || manualISBN.length === 13;

  if (!visible) {
    return null;
  }

  // Show manual input mode
  if (isManualInputMode) {
    return (
      <Modal
        visible={visible}
        animationType="none"
        transparent={true}
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoid}
            >
              <TouchableWithoutFeedback>
                <View style={styles.modalContainer}>
                  {/* Header */}
                  <View style={styles.header}>
                    <IconSymbol
                      ios_icon_name="keyboard"
                      android_material_icon_name="keyboard"
                      size={48}
                      color={colors.buttonBlue}
                    />
                    <Text style={styles.title}>Enter ISBN Manually</Text>
                    <Text style={styles.subtitle}>
                      Type the ISBN number from the back of the book
                    </Text>
                  </View>

                  {/* Manual ISBN Input */}
                  <View style={styles.manualInputContainer}>
                    <TextInput
                      style={styles.isbnInput}
                      placeholder="Type ISBN (10 or 13 digits)"
                      placeholderTextColor={colors.textSecondary}
                      value={manualISBN}
                      onChangeText={handleManualISBNChange}
                      keyboardType="number-pad"
                      maxLength={13}
                      autoFocus={true}
                      editable={!isSearching}
                    />
                    <Text style={styles.inputHint}>
                      {manualISBN.length > 0
                        ? `${manualISBN.length} digits entered`
                        : 'ISBN must be 10 or 13 digits'}
                    </Text>

                    {/* Manual ISBN Actions */}
                    <View style={styles.manualActions}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.submitButton,
                          (!isValidISBN || isSearching) && styles.buttonDisabled,
                        ]}
                        onPress={handleManualISBNSubmit}
                        disabled={!isValidISBN || isSearching}
                      >
                        {isSearching ? (
                          <ActivityIndicator size="small" color={colors.backgroundAlt} />
                        ) : (
                          <>
                            <IconSymbol
                              ios_icon_name="magnifyingglass"
                              android_material_icon_name="search"
                              size={20}
                              color={colors.backgroundAlt}
                            />
                            <Text style={styles.actionButtonText}>Search ISBN</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.backButton]}
                        onPress={handleBackToOptions}
                        disabled={isSearching}
                      >
                        <IconSymbol
                          ios_icon_name="arrow.left"
                          android_material_icon_name="arrow_back"
                          size={20}
                          color={colors.primary}
                        />
                        <Text style={[styles.actionButtonText, styles.backButtonText]}>
                          Back to Options
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }

  // Show unified modal with "Book Not Found" context
  return (
    <CantFindBookModal
      visible={visible}
      onClose={onClose}
      onEnterISBN={handleEnterISBN}
      onSearchBookName={handleSearchBookName}
      title="Book Not Found"
      subtitle={`We couldn't find a book with ISBN: ${scannedISBN}`}
      iconName="exclamationmark.triangle.fill"
      iconColor={colors.secondary}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoid: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 24,
    boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.3)',
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  manualInputContainer: {
    gap: 16,
  },
  isbnInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
  },
  inputHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  manualActions: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  submitButton: {
    backgroundColor: colors.secondary,
  },
  backButton: {
    backgroundColor: colors.background,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  backButtonText: {
    color: colors.primary,
  },
});
