
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface ScallopedBadgeProps {
  color: string;
  size: number;
  locked?: boolean;
}

export const ScallopedBadge: React.FC<ScallopedBadgeProps> = ({ color, size, locked = false }) => {
  // Create a scalloped edge path (flower/badge shape with 12 petals)
  const createScallopedPath = () => {
    const center = size / 2;
    const outerRadius = size / 2;
    const innerRadius = size / 2.5;
    const petals = 12;
    
    let path = '';
    
    for (let i = 0; i < petals; i++) {
      const angle1 = (i * 2 * Math.PI) / petals;
      const angle2 = ((i + 0.5) * 2 * Math.PI) / petals;
      const angle3 = ((i + 1) * 2 * Math.PI) / petals;
      
      const x1 = center + outerRadius * Math.cos(angle1);
      const y1 = center + outerRadius * Math.sin(angle1);
      
      const x2 = center + innerRadius * Math.cos(angle2);
      const y2 = center + innerRadius * Math.sin(angle2);
      
      const x3 = center + outerRadius * Math.cos(angle3);
      const y3 = center + outerRadius * Math.sin(angle3);
      
      if (i === 0) {
        path += `M ${x1} ${y1}`;
      }
      
      path += ` Q ${x2} ${y2} ${x3} ${y3}`;
    }
    
    path += ' Z';
    return path;
  };

  const badgeColor = locked ? '#CCCCCC' : color;
  const opacity = locked ? 0.5 : 1;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Path
          d={createScallopedPath()}
          fill={badgeColor}
          opacity={opacity}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
