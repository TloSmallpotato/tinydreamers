
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { useSubscription } from '@/contexts/SubscriptionContext';
import * as Clipboard from 'expo-clipboard';
import { IconSymbol } from './IconSymbol';

export default function RevenueCatDiagnostics() {
  const { offerings, customerInfo, diagnosticInfo, tier } = useSubscription();
  const [copied, setCopied] = useState(false);

  const diagnosticData = {
    platform: Platform.OS,
    tier,
    hasOfferings: offerings !== null,
    currentOffering: offerings?.current?.identifier || 'null',
    allOfferings: offerings ? Object.keys(offerings.all) : [],
    totalOfferings: offerings ? Object.keys(offerings.all).length : 0,
    customerInfoAvailable: customerInfo !== null,
    activeEntitlements: customerInfo ? Object.keys(customerInfo.entitlements.active) : [],
    allEntitlements: customerInfo ? Object.keys(customerInfo.entitlements.all) : [],
    diagnosticInfo,
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(JSON.stringify(diagnosticData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol
          ios_icon_name="info.circle.fill"
          android_material_icon_name="info"
          size={24}
          color={colors.buttonBlue}
        />
        <Text style={styles.title}>RevenueCat Diagnostics</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform</Text>
          <Text style={styles.value}>{diagnosticData.platform}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Tier</Text>
          <Text style={styles.value}>{diagnosticData.tier}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offerings Status</Text>
          <Text style={styles.value}>
            {diagnosticData.hasOfferings ? '✅ Available' : '❌ Not Available'}
          </Text>
        </View>

        {diagnosticData.hasOfferings && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Offering</Text>
              <Text style={styles.value}>{diagnosticData.currentOffering}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>All Offerings</Text>
              {diagnosticData.allOfferings.length > 0 ? (
                diagnosticData.allOfferings.map((id, index) => (
                  <Text key={index} style={styles.listItem}>• {id}</Text>
                ))
              ) : (
                <Text style={styles.value}>None</Text>
              )}
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Entitlements</Text>
          {diagnosticData.activeEntitlements.length > 0 ? (
            diagnosticData.activeEntitlements.map((id, index) => (
              <Text key={index} style={styles.listItem}>• {id}</Text>
            ))
          ) : (
            <Text style={styles.value}>None</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Entitlements</Text>
          {diagnosticData.allEntitlements.length > 0 ? (
            diagnosticData.allEntitlements.map((id, index) => (
              <Text key={index} style={styles.listItem}>• {id}</Text>
            ))
          ) : (
            <Text style={styles.value}>None</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnostic Info</Text>
          <Text style={styles.value}>{diagnosticData.diagnosticInfo || 'No info available'}</Text>
        </View>

        {!diagnosticData.hasOfferings && (
          <View style={styles.errorSection}>
            <Text style={styles.errorTitle}>⚠️ Configuration Issue</Text>
            <Text style={styles.errorText}>
              No offerings are configured in RevenueCat. To fix this:
            </Text>
            <Text style={styles.errorStep}>1. Go to RevenueCat Dashboard</Text>
            <Text style={styles.errorStep}>2. Navigate to Products → Offerings</Text>
            <Text style={styles.errorStep}>3. Create an offering if none exists</Text>
            <Text style={styles.errorStep}>4. Set one offering as "current"</Text>
            <Text style={styles.errorStep}>5. Add products/packages to the offering</Text>
            <Text style={styles.errorStep}>6. Ensure entitlement "The Tiny Dreamers App Pro" is configured</Text>
          </View>
        )}

        {diagnosticData.hasOfferings && diagnosticData.currentOffering === 'null' && (
          <View style={styles.errorSection}>
            <Text style={styles.errorTitle}>⚠️ Configuration Issue</Text>
            <Text style={styles.errorText}>
              Offerings exist but none is set as "current". To fix this:
            </Text>
            <Text style={styles.errorStep}>1. Go to RevenueCat Dashboard</Text>
            <Text style={styles.errorStep}>2. Navigate to Products → Offerings</Text>
            <Text style={styles.errorStep}>3. Select one of your offerings: {diagnosticData.allOfferings.join(', ')}</Text>
            <Text style={styles.errorStep}>4. Set it as "current"</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
        <IconSymbol
          ios_icon_name={copied ? 'checkmark.circle.fill' : 'doc.on.doc'}
          android_material_icon_name={copied ? 'check-circle' : 'content-copy'}
          size={20}
          color={colors.backgroundAlt}
        />
        <Text style={styles.copyButtonText}>
          {copied ? 'Copied!' : 'Copy Diagnostics'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  scrollView: {
    maxHeight: 400,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  listItem: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: 8,
    marginTop: 2,
  },
  errorSection: {
    backgroundColor: colors.cardPink,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 12,
  },
  errorStep: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  copyButton: {
    backgroundColor: colors.buttonBlue,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.backgroundAlt,
  },
});
