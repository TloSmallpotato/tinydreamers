
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

interface ISBNNotFoundModalProps {
  visible: boolean;
  scannedISBN: string;
  onClose: () => void;
  onManualISBNSubmit: (isbn: string) => void;
  onAddCustomBook: (isbn?: string) => void;
  isSearching?: boolean;
}

export default function ISBNNotFoundModal({
  visible,
  scannedISBN,
  onClose,
  onManualISBNSubmit,
  onAddCustomBook,
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
      onManualISBNSubmit(manualISBN);
    }
  };

  const isValidISBN = manualISBN.length === 10 || manualISBN.length === 13;

  if (!visible) {
    return null;
  }

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
                    ios_icon_name="exclamationmark.triangle.fill"
                    android_material_icon_name="warning"
                    size={48}
                    color={colors.secondary}
                  />
                  <Text style={styles.title}>Book Not Found</Text>
                  <Text style={styles.subtitle}>
                    {isManualInputMode
                      ? 'The ISBN you entered was not found in our database.'
                      : `We couldn't find a book with ISBN: ${scannedISBN}`}
                  </Text>
                </View>

                {/* Manual ISBN Input Mode */}
                {isManualInputMode ? (
                  <View style={styles.manualInputContainer}>
                    <Text style={styles.inputLabel}>Enter ISBN manually:</Text>
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
                        onPress={() => setIsManualInputMode(false)}
                        disabled={isSearching}
                      >
                        <IconSymbol
                          ios_icon_name="arrow.left"
                          android_material_icon_name="arrow-back"
                          size={20}
                          color={colors.primary}
                        />
                        <Text style={[styles.actionButtonText, styles.backButtonText]}>
                          Back to Options
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Add Custom Book Option (with ISBN prefilled) */}
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>OR</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.customBookButton]}
                      onPress={() => onAddCustomBook(manualISBN || undefined)}
                      disabled={isSearching}
                    >
                      <IconSymbol
                        ios_icon_name="plus.circle.fill"
                        android_material_icon_name="add-circle"
                        size={20}
                        color={colors.buttonBlue}
                      />
                      <Text style={[styles.actionButtonText, styles.customBookButtonText]}>
                        Add Custom Book
                        {manualISBN ? ' (with ISBN)' : ''}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Initial Options */
                  <View style={styles.optionsContainer}>
                    <Text style={styles.optionsTitle}>What would you like to do?</Text>

                    {/* Option 1: Type ISBN Manually */}
                    <TouchableOpacity
                      style={styles.optionCard}
                      onPress={() => setIsManualInputMode(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionIcon}>
                        <IconSymbol
                          ios_icon_name="keyboard"
                          android_material_icon_name="keyboard"
                          size={32}
                          color={colors.buttonBlue}
                        />
                      </View>
                      <View style={styles.optionContent}>
                        <Text style={styles.optionTitle}>Type your own ISBN</Text>
                        <Text style={styles.optionDescription}>
                          Manually enter the ISBN number to search again
                        </Text>
                      </View>
                      <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="chevron-right"
                        size={24}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {/* Option 2: Add Custom Book */}
                    <TouchableOpacity
                      style={styles.optionCard}
                      onPress={() => onAddCustomBook(scannedISBN)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionIcon}>
                        <IconSymbol
                          ios_icon_name="plus.circle.fill"
                          android_material_icon_name="add-circle"
                          size={32}
                          color={colors.secondary}
                        />
                      </View>
                      <View style={styles.optionContent}>
                        <Text style={styles.optionTitle}>Add custom book</Text>
                        <Text style={styles.optionDescription}>
                          Create your own book entry with title and cover
                        </Text>
                      </View>
                      <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="chevron-right"
                        size={24}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {/* Cancel Button */}
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
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
  optionsContainer: {
    gap: 16,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  manualInputContainer: {
    gap: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
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
  customBookButton: {
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
  customBookButtonText: {
    color: colors.buttonBlue,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.textSecondary,
    opacity: 0.3,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
