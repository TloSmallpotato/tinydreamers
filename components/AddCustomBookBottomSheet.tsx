
import React, { forwardRef, useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Dimensions, Platform } from 'react-native';
import { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

const { height: screenHeight } = Dimensions.get('window');

interface AddCustomBookBottomSheetProps {
  prefillTitle?: string;
  onClose: () => void;
  onBookAdded: () => void;
  childId: string;
  userId: string;
}

const AddCustomBookBottomSheet = forwardRef<BottomSheetModal, AddCustomBookBottomSheetProps>(
  ({ prefillTitle = '', onClose, onBookAdded, childId, userId }, ref) => {
    const snapPoints = useMemo(() => [screenHeight * 0.85], []);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Update title when prefillTitle changes
    useEffect(() => {
      setTitle(prefillTitle);
    }, [prefillTitle]);

    const handleTakePhoto = useCallback(async () => {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to take photos.');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'images',
          allowsEditing: true,
          aspect: [2, 3],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          setCoverImage(result.assets[0].uri);
        }
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }
    }, []);

    const handleChooseFromLibrary = useCallback(async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library permission is required to choose photos.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          allowsEditing: true,
          aspect: [2, 3],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          setCoverImage(result.assets[0].uri);
        }
      } catch (error) {
        console.error('Error choosing photo:', error);
        Alert.alert('Error', 'Failed to choose photo. Please try again.');
      }
    }, []);

    const handleRemoveCover = useCallback(() => {
      setCoverImage(null);
    }, []);

    const uploadCoverImage = async (imageUri: string): Promise<string | null> => {
      try {
        // Generate a unique filename
        const fileExt = imageUri.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        // Fetch the image as a blob
        const response = await fetch(imageUri);
        const blob = await response.blob();

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('user-covers')
          .upload(filePath, blob, {
            contentType: `image/${fileExt}`,
            upsert: false,
          });

        if (error) {
          console.error('Error uploading cover image:', error);
          throw error;
        }

        console.log('Cover image uploaded successfully:', data.path);
        return data.path;
      } catch (error) {
        console.error('Error in uploadCoverImage:', error);
        return null;
      }
    };

    const handleSave = useCallback(async () => {
      // Validate title
      if (!title.trim()) {
        Alert.alert('Required Field', 'Please enter a book title.');
        return;
      }

      setIsSaving(true);

      try {
        console.log('=== ADDING CUSTOM BOOK ===');
        console.log('Title:', title);
        console.log('Description:', description);
        console.log('Has cover image:', !!coverImage);

        // Step 1: Upload cover image if provided
        let coverPath: string | null = null;
        if (coverImage) {
          console.log('Uploading cover image...');
          coverPath = await uploadCoverImage(coverImage);
          if (!coverPath) {
            Alert.alert('Warning', 'Failed to upload cover image. Continuing without it.');
          }
        }

        // Step 2: Create a minimal entry in books_library
        console.log('Creating book entry in books_library...');
        const { data: newBook, error: bookError } = await supabase
          .from('books_library')
          .insert({
            google_books_id: `custom_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            title: title.trim(),
            authors: 'Custom',
            description: description.trim() || null,
            source: 'custom_global',
          })
          .select('id')
          .single();

        if (bookError) {
          console.error('Error creating book:', bookError);
          throw bookError;
        }

        console.log('Book created with ID:', newBook.id);

        // Step 3: Create user_books entry with custom fields
        console.log('Creating user_books entry...');
        const { error: userBookError } = await supabase
          .from('user_books')
          .insert({
            child_id: childId,
            book_id: newBook.id,
            user_id: userId,
            is_custom_for_user: true,
            user_description: description.trim() || null,
            cover_url_private: coverPath,
          });

        if (userBookError) {
          console.error('Error creating user_books entry:', userBookError);
          throw userBookError;
        }

        console.log('Custom book added successfully!');
        console.log('=== CUSTOM BOOK ADDITION COMPLETE ===');

        // Close the bottom sheet
        if (ref && typeof ref !== 'function' && ref.current) {
          ref.current.dismiss();
        }

        // Notify parent to refresh
        onBookAdded();

        // Reset form
        setTitle('');
        setDescription('');
        setCoverImage(null);

        Alert.alert('Success', 'Custom book added to your library!');
      } catch (error) {
        console.error('Error in handleSave:', error);
        Alert.alert('Error', 'Failed to add custom book. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }, [title, description, coverImage, childId, userId, ref, onBookAdded]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
          pressBehavior="close"
        />
      ),
      []
    );

    const handleDismiss = useCallback(() => {
      setTitle('');
      setDescription('');
      setCoverImage(null);
      onClose();
    }, [onClose]);

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        enableDismissOnClose={true}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        onDismiss={handleDismiss}
      >
        <BottomSheetScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Custom Book</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                if (ref && typeof ref !== 'function' && ref.current) {
                  ref.current.dismiss();
                }
              }}
            >
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Cover Image Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cover Image (Optional)</Text>
            {coverImage ? (
              <View style={styles.coverPreviewContainer}>
                <Image
                  source={{ uri: coverImage }}
                  style={styles.coverPreview}
                  contentFit="cover"
                />
                <TouchableOpacity
                  style={styles.removeCoverButton}
                  onPress={handleRemoveCover}
                >
                  <IconSymbol
                    ios_icon_name="trash"
                    android_material_icon_name="delete"
                    size={20}
                    color={colors.backgroundAlt}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.coverButtonsContainer}>
                <TouchableOpacity
                  style={styles.coverButton}
                  onPress={handleTakePhoto}
                >
                  <IconSymbol
                    ios_icon_name="camera.fill"
                    android_material_icon_name="camera"
                    size={24}
                    color={colors.backgroundAlt}
                  />
                  <Text style={styles.coverButtonText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.coverButton}
                  onPress={handleChooseFromLibrary}
                >
                  <IconSymbol
                    ios_icon_name="photo.fill"
                    android_material_icon_name="photo-library"
                    size={24}
                    color={colors.backgroundAlt}
                  />
                  <Text style={styles.coverButtonText}>Choose from Library</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Title Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter book title"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Description Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add a description or notes about this book"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="default"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Add Book'}
            </Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: colors.backgroundAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: colors.primary,
    width: 40,
    height: 4,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  closeButton: {
    padding: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  coverPreviewContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  coverPreview: {
    width: 200,
    height: 300,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  removeCoverButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.secondary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  coverButton: {
    flex: 1,
    backgroundColor: colors.buttonBlue,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  coverButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.backgroundAlt,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.primary,
    minHeight: 48,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  saveButton: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
});

export default AddCustomBookBottomSheet;
