
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function WordsScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={commonStyles.title}>Words</Text>
            <Text style={commonStyles.subtitle}>Scarlett&apos;s words</Text>
            
            <View style={styles.badge}>
              <Text style={styles.badgeText}>32 words</Text>
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={[commonStyles.searchBar, { flex: 1 }]}>
              <IconSymbol 
                ios_icon_name="magnifyingglass" 
                android_material_icon_name="search" 
                size={20} 
                color={colors.primary} 
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search a word"
                placeholderTextColor={colors.primary}
              />
            </View>
            <TouchableOpacity style={styles.addButton}>
              <IconSymbol 
                ios_icon_name="plus" 
                android_material_icon_name="add" 
                size={24} 
                color={colors.backgroundAlt} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.letterSection}>
            <View style={styles.letterBadge}>
              <Text style={styles.letterText}>A</Text>
            </View>
          </View>

          <View style={styles.wordsList}>
            <View style={[styles.wordCard, { backgroundColor: colors.cardPink }]}>
              <View style={styles.wordIcon}>
                <Text style={styles.wordEmoji}>🍎</Text>
              </View>
              <Text style={styles.wordText}>Apple</Text>
              <View style={styles.wordActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="eye" 
                    android_material_icon_name="visibility" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="speaker.wave.2" 
                    android_material_icon_name="volume-up" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="video" 
                    android_material_icon_name="videocam" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="chevron.right" 
                    android_material_icon_name="chevron-right" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.wordCard, { backgroundColor: colors.cardPink }]}>
              <View style={styles.wordIcon}>
                <Text style={styles.wordEmoji}>🍎</Text>
              </View>
              <Text style={styles.wordText}>Apple</Text>
              <View style={styles.wordActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="eye" 
                    android_material_icon_name="visibility" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="speaker.wave.2" 
                    android_material_icon_name="volume-up" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="video" 
                    android_material_icon_name="videocam" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="chevron.right" 
                    android_material_icon_name="chevron-right" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.wordCard, { backgroundColor: colors.cardPink }]}>
              <View style={styles.wordIcon}>
                <Text style={styles.wordEmoji}>🍎</Text>
              </View>
              <Text style={styles.wordText}>Apple</Text>
              <View style={styles.wordActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="eye" 
                    android_material_icon_name="visibility" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="speaker.wave.2" 
                    android_material_icon_name="volume-up" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="video" 
                    android_material_icon_name="videocam" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="chevron.right" 
                    android_material_icon_name="chevron-right" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.letterSection}>
            <View style={styles.letterBadge}>
              <Text style={styles.letterText}>B</Text>
            </View>
          </View>

          <View style={styles.wordsList}>
            <View style={[styles.wordCard, { backgroundColor: colors.cardPurple }]}>
              <View style={styles.wordIcon}>
                <Text style={styles.wordEmoji}>🥯</Text>
              </View>
              <Text style={styles.wordText}>Bagel</Text>
              <View style={styles.wordActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="eye" 
                    android_material_icon_name="visibility" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="speaker.wave.2" 
                    android_material_icon_name="volume-up" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="video" 
                    android_material_icon_name="videocam" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol 
                    ios_icon_name="chevron.right" 
                    android_material_icon_name="chevron-right" 
                    size={20} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 20,
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  badgeText: {
    color: colors.backgroundAlt,
    fontSize: 14,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.primary,
  },
  addButton: {
    backgroundColor: colors.buttonBlue,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
    elevation: 4,
  },
  letterSection: {
    marginVertical: 16,
  },
  letterBadge: {
    backgroundColor: colors.backgroundAlt,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  letterText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  wordsList: {
    gap: 12,
  },
  wordCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  wordIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  wordEmoji: {
    fontSize: 24,
  },
  wordText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
  },
  wordActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
