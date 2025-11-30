// This file is a fallback for using MaterialIcons on Android and web,
// and can be extended to support SFSymbols on iOS.

import React from "react";
import { Platform, StyleProp, TextStyle, ViewStyle, OpaqueColorValue } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolView, SymbolWeight } from "expo-symbols";

export function IconSymbol({
  ios_icon_name,
  android_material_icon_name,
  size = 24,
  color,
  style,
  weight,
}: {
  ios_icon_name?: string;
  android_material_icon_name: keyof typeof MaterialIcons.glyphMap;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  // If you want iOS to use SFSymbols
  if (Platform.OS === "ios" && ios_icon_name) {
    return (
      <SymbolView
        name={ios_icon_name}
        tintColor={color}
        size={size}
        weight={weight ?? "regular"}
        style={style}
      />
    );
  }

  // Android + Web fallback
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={android_material_icon_name}
      style={style as StyleProp<TextStyle>}
    />
  );
}
