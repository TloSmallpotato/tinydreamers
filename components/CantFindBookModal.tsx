
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';

interface CantFindBookModalProps {
  visible: boolean;
  onClose: () => void;
  onEnterISBN: () => void;
  onSearchBookName: () => void;
  title?: string;
  subtitle?: string;
  iconName?: string;
  iconColor?: string;
}

export default function CantFindBookModal({
  visible,
  onClose,
  onEnterISBN,
  onSearchBookName,
  title = "Can't find the book?",
  subtitle = "Choose how you'd like to add your book",
  iconName = "questionmark.circle.fill",
  iconColor = colors.primary,
}: CantFindBookModalProps) {
  const handleEnterISBN = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onEnterISBN();
  };

  const handleSearchBookName = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSearchBookName();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <IconSymbol
              ios_icon_name={iconName}
              android_material_icon_name={iconName === "questionmark.circle.fill" ? "help" : "warning"}
              size={48}
              color={iconColor}
            />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              {subtitle}
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Option 1: Enter ISBN Manually */}
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleEnterISBN}
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
                <Text style={styles.optionTitle}>Enter ISBN manually</Text>
                <Text style={styles.optionDescription}>
                  Type the ISBN number from the back of the book
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Option 2: Search Book Name */}
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleSearchBookName}
              activeOpacity={0.7}
            >
              <View style={styles.optionIcon}>
                <IconSymbol
                  ios_icon_name="magnifyingglass"
                  android_material_icon_name="search"
                  size={32}
                  color={colors.secondary}
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Search book name</Text>
                <Text style={styles.optionDescription}>
                  Find your book by searching its title or author
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
});
