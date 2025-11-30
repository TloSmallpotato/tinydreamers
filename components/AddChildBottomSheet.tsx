
import React, { forwardRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '@/styles/commonStyles';
import { useBottomSheetState } from '@/contexts/BottomSheetContext';

interface AddChildBottomSheetProps {
  onAddChild: (name: string, birthDate: Date) => void;
}

const AddChildBottomSheet = forwardRef<BottomSheet, AddChildBottomSheetProps>(
  ({ onAddChild }, ref) => {
    const snapPoints = useMemo(() => ['60%'], []);
    const [name, setName] = useState('');
    const [birthDate, setBirthDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const { openBottomSheet, closeBottomSheet } = useBottomSheetState();

    const renderBackdrop = (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    );

    const handleAdd = () => {
      if (name.trim()) {
        onAddChild(name.trim(), birthDate);
        setName('');
        setBirthDate(new Date());
      }
    };

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        style={styles.bottomSheet}
        onChange={(index) => {
          if (index >= 0) {
            openBottomSheet();
          } else {
            closeBottomSheet();
          }
        }}
      >
        <BottomSheetView style={styles.contentContainer}>
          <Text style={styles.title}>Add New Child</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter child's name"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Birth Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>{formatDate(birthDate)}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={birthDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setBirthDate(selectedDate);
                  }
                }}
                maximumDate={new Date()}
              />
            )}
          </View>

          <TouchableOpacity
            style={[styles.addButton, !name.trim() && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={!name.trim()}
          >
            <Text style={styles.addButtonText}>Add Child</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  bottomSheet: {
    zIndex: 999999,
    elevation: 999999,
  },
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    flex: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.primary,
    marginBottom: 20,
  },
  dateButton: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.primary,
  },
  addButton: {
    backgroundColor: colors.buttonBlue,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
});

export default AddChildBottomSheet;
