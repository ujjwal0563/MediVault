import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { medicineAPI, MonthlyAdherenceData } from '../services/api';
import { Card, ProgressBar, Badge } from './UI';

interface WeeklyAdherenceSummaryProps {
  year: number;
  month: number;
  onRetry?: () => void;
}

export function WeeklyAdherenceSummary({ year, month, onRetry }: WeeklyAdherenceSummaryProps) {
  const { colors } = useTheme();
  const [data, setData] = useState<MonthlyAdherenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthlyAdherence = async () => {
    try {
      setLoading(true);
      setError(null);
      const adherenceData = await medicineAPI.getMonthlyAdherence(year, month);
      setData(adherenceData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load adherence data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyAdherence();
  }, [year, month]);

  const getAdherenceColor = (percent: number): string => {
    if (percent >= 80) return colors.success;  // green
    if (percent >= 50) return colors.warning;  // orange
    return colors.danger;  // red
  };

  const getAdherenceColorSoft = (percent: number): string => {
    if (percent >= 80) return colors.successSoft;  // light green
    if (percent >= 50) return colors.warningSoft;  // light orange
    return colors.dangerSoft;  // light red
  };

  const formatAdherenceSummary = (percent: number, missed: number): string => {
    return `This month: ${percent}% adherence, ${missed} missed doses`;
  };

  const handleRetry = () => {
    fetchMonthlyAdherence();
    onRetry?.();
  };

  if (loading) {
    return (
      <Card style={{ marginBottom: 16 }}>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'center',
          paddingVertical: 20 
        }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ 
            color: colors.textMuted, 
            marginLeft: 8,
            fontSize: 14 
          }}>
            Loading adherence data...
          </Text>
        </View>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={{ marginBottom: 16 }}>
        <View style={{ 
          alignItems: 'center', 
          paddingVertical: 16 
        }}>
          <Text style={{ 
            color: colors.danger, 
            marginBottom: 12,
            fontSize: 14,
            textAlign: 'center'
          }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={handleRetry}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: colors.primary,
              backgroundColor: 'transparent'
            }}
            activeOpacity={0.7}
          >
            <Text style={{ 
              color: colors.primary,
              fontSize: 12,
              fontWeight: '600'
            }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  if (data.isFutureMonth) {
    return (
      <Card style={{ marginBottom: 16 }}>
        <View style={{ 
          alignItems: 'center', 
          paddingVertical: 16 
        }}>
          <Ionicons name="calendar-outline" size={24} color={colors.textMuted} />
          <Text style={{ 
            color: colors.textMuted, 
            marginTop: 8,
            fontSize: 14,
            textAlign: 'center'
          }}>
            No data available yet
          </Text>
        </View>
      </Card>
    );
  }

  const adherenceColor = getAdherenceColor(data.adherencePercent);
  const adherenceColorSoft = getAdherenceColorSoft(data.adherencePercent);
  const summaryText = formatAdherenceSummary(data.adherencePercent, data.missedDoses);

  return (
    <Card 
      style={{ 
        marginBottom: 16,
        backgroundColor: adherenceColorSoft,
        borderWidth: 1,
        borderColor: adherenceColor + '20'
      }}
    >
      <View style={{ padding: 16 }}>
        {/* Main Summary Text */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center',
          marginBottom: 12
        }}>
          <Ionicons 
            name="stats-chart" 
            size={20} 
            color={adherenceColor} 
            style={{ marginRight: 8 }}
          />
          <Text style={{ 
            fontSize: 16,
            fontWeight: '600',
            color: colors.textPrimary,
            flex: 1
          }}>
            {summaryText}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={{ marginBottom: 8 }}>
          <ProgressBar 
            value={data.adherencePercent} 
            color={adherenceColor}
            height={6}
            showGlow={false}
            style={{ borderRadius: 3 }}
          />
        </View>

        {/* Stats Row */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 18,
                fontWeight: '700',
                color: colors.success
              }}>
                {data.takenDoses}
              </Text>
              <Text style={{ 
                fontSize: 11,
                color: colors.textMuted
              }}>
                Taken
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 18,
                fontWeight: '700',
                color: colors.danger
              }}>
                {data.missedDoses}
              </Text>
              <Text style={{ 
                fontSize: 11,
                color: colors.textMuted
              }}>
                Missed
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 18,
                fontWeight: '700',
                color: colors.textMuted
              }}>
                {data.totalScheduled}
              </Text>
              <Text style={{ 
                fontSize: 11,
                color: colors.textMuted
              }}>
                Total
              </Text>
            </View>
          </View>

          {/* Adherence Badge */}
          <Badge 
            label={`${data.adherencePercent}%`}
            type={data.adherencePercent >= 80 ? 'success' : data.adherencePercent >= 50 ? 'warning' : 'danger'}
            size="md"
          />
        </View>
      </View>
    </Card>
  );
}