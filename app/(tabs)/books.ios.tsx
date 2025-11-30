
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, commonStyles } from '@/styles/commonStyles';

export default function BooksScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={commonStyles.title}>Books</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
});
