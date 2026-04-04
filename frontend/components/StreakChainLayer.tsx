import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { StreakSegment, DailyAdherenceStatus } from '../services/api';
import { 
  ChainConnector, 
  CalendarLayout, 
  generateChainConnectors,
  calculateConnectorGeometry,
  getStreakChainAccessibilityLabel
} from '../utils/streakChains';

interface StreakChainLayerProps {
  streakHistory: StreakSegment[];
  dailyAdherence: DailyAdherenceStatus[];
  visibleMonth: { year: number; month: number };
  calendarLayout: CalendarLayout;
}

interface ChainConnectorComponentProps {
  connector: ChainConnector;
  layout: CalendarLayout;
}

const ChainConnectorComponent: React.FC<ChainConnectorComponentProps> = ({
  connector,
  layout
}) => {
  const { colors } = useTheme();
  
  const fromPosition = layout.getDatePosition(connector.fromDate);
  const toPosition = layout.getDatePosition(connector.toDate);
  
  if (!fromPosition || !toPosition) return null;
  
  const connectorStyle = useMemo(() => {
    const baseStyle = {
      position: 'absolute' as const,
      backgroundColor: connector.isActive ? colors.success : colors.textFaint,
      opacity: connector.isActive ? 0.8 : 0.4,
      zIndex: 2, // Above course bands, below adherence dots
    };
    
    const geometry = calculateConnectorGeometry(
      fromPosition,
      toPosition,
      connector.type,
      layout.cellWidth,
      layout.cellHeight
    );
    
    return { ...baseStyle, ...geometry };
  }, [connector, fromPosition, toPosition, layout, colors]);
  
  return (
    <View 
      style={connectorStyle}
      accessibilityRole="image"
      accessibilityLabel={`Streak connector from ${connector.fromDate} to ${connector.toDate}`}
      pointerEvents="none"
    />
  );
};

export const StreakChainLayer: React.FC<StreakChainLayerProps> = ({
  streakHistory,
  dailyAdherence,
  visibleMonth,
  calendarLayout
}) => {
  const connectors = useMemo(() => 
    generateChainConnectors(streakHistory, visibleMonth, calendarLayout),
    [streakHistory, visibleMonth, calendarLayout]
  );
  
  if (connectors.length === 0) {
    return null;
  }
  
  return (
    <View 
      style={styles.chainLayer} 
      pointerEvents="none"
      accessibilityRole="image"
      accessibilityLabel={`Streak visualization showing ${connectors.length} connections`}
    >
      {connectors.map((connector, index) => (
        <ChainConnectorComponent
          key={`${connector.fromDate}-${connector.toDate}-${index}`}
          connector={connector}
          layout={calendarLayout}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  chainLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2, // Above course bands, below adherence dots
  },
});