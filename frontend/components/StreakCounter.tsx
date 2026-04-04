import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { MilestoneAchievement } from '../services/api';
import { Card } from './UI';

interface StreakCounterProps {
  currentStreak: number;
  milestones: MilestoneAchievement[];
  nextMilestone: {
    days: number;
    daysRemaining: number;
    name: string;
  } | null;
  motivationalMessage: string;
}

interface MilestoneBadgeProps {
  milestone: MilestoneAchievement;
  isActive: boolean;
}

// Milestone icon and color definitions
const MILESTONE_ICONS = {
  7: { icon: 'trophy-outline', color: '#F97316' },
  14: { icon: 'trophy', color: '#EAB308' },
  30: { icon: 'medal-outline', color: '#10B981' },
  60: { icon: 'medal', color: '#3B82F6' },
  90: { icon: 'star-outline', color: '#8B5CF6' },
  180: { icon: 'star', color: '#EC4899' },
  365: { icon: 'diamond-outline', color: '#F59E0B' }
};

const MilestoneBadge: React.FC<MilestoneBadgeProps> = ({ milestone, isActive }) => {
  const { colors } = useTheme();
  const badgeInfo = MILESTONE_ICONS[milestone.days as keyof typeof MILESTONE_ICONS];
  
  if (!badgeInfo) return null;
  
  return (
    <View 
      style={[
        styles.milestoneBadge,
        {
          opacity: isActive ? 1.0 : 0.3,
          backgroundColor: isActive ? badgeInfo.color + '20' : colors.bgPage,
          borderColor: isActive ? badgeInfo.color : colors.border,
        }
      ]}
      accessibilityRole="image"
      accessibilityLabel={
        isActive 
          ? `Milestone achieved: ${milestone.days} days. ${milestone.name}`
          : `Milestone not yet achieved: ${milestone.days} days. ${milestone.name}`
      }
    >
      <Ionicons 
        name={badgeInfo.icon as any} 
        size={16} 
        color={isActive ? badgeInfo.color : colors.textMuted}
      />
      <Text style={[
        styles.milestoneDays,
        { color: isActive ? badgeInfo.color : colors.textMuted }
      ]}>
        {milestone.days}
      </Text>
    </View>
  );
};

// Motivational message categories
const MOTIVATIONAL_MESSAGES = {
  zero: [
    "Every day is a fresh start! 🌟",
    "Your health journey begins now! 💪",
    "One dose at a time, you've got this! 🎯"
  ],
  growing: [
    "Keep it up! {streak} days strong! 🔥",
    "You're building a great habit! {streak} days! ⭐",
    "Consistency is key - {streak} days and counting! 📈"
  ],
  milestone_approaching: [
    "Only {remaining} days until your {milestone}-day streak! 🏆",
    "You're so close to {milestone} days! Keep going! 🎯",
    "Almost there - {remaining} more days to {milestone}! 💫"
  ],
  milestone_achieved: [
    "🎉 Amazing! You've reached {milestone} days! 🎉",
    "Incredible dedication - {milestone} days strong! 🏆",
    "You're a streak champion! {milestone} days! ⭐"
  ],
  long_streak: [
    "Wow! {streak} days of perfect adherence! 🌟",
    "You're an inspiration! {streak} days! 👑",
    "Legendary streak - {streak} days! 💎"
  ]
};

const getMotivationalMessage = (
  currentStreak: number,
  nextMilestone: { days: number; daysRemaining: number; name: string } | null,
  recentlyAchievedMilestone: number | null = null
): string => {
  const randomMessage = (messages: string[]) => 
    messages[Math.floor(Math.random() * messages.length)];
  
  if (recentlyAchievedMilestone) {
    return randomMessage(MOTIVATIONAL_MESSAGES.milestone_achieved)
      .replace('{milestone}', recentlyAchievedMilestone.toString());
  }
  
  if (currentStreak === 0) {
    return randomMessage(MOTIVATIONAL_MESSAGES.zero);
  }
  
  if (nextMilestone && nextMilestone.daysRemaining <= 3) {
    return randomMessage(MOTIVATIONAL_MESSAGES.milestone_approaching)
      .replace('{remaining}', nextMilestone.daysRemaining.toString())
      .replace('{milestone}', nextMilestone.days.toString());
  }
  
  if (currentStreak >= 30) {
    return randomMessage(MOTIVATIONAL_MESSAGES.long_streak)
      .replace('{streak}', currentStreak.toString());
  }
  
  return randomMessage(MOTIVATIONAL_MESSAGES.growing)
    .replace('{streak}', currentStreak.toString());
};

export const StreakCounter: React.FC<StreakCounterProps> = ({
  currentStreak,
  milestones,
  nextMilestone,
  motivationalMessage
}) => {
  const { colors } = useTheme();
  
  const streakColor = currentStreak > 0 ? colors.success : colors.textMuted;
  const streakBgColor = currentStreak > 0 ? colors.successSoft : colors.bgPage;
  
  // Generate motivational message if not provided
  const displayMessage = motivationalMessage || getMotivationalMessage(currentStreak, nextMilestone);
  
  return (
    <Card 
      variant="elevated" 
      glowColor={currentStreak > 0 ? colors.success : undefined}
      style={[
        styles.streakCard,
        {
          backgroundColor: streakBgColor,
          borderColor: streakColor + '20',
        }
      ]}
    >
      <View style={styles.streakHeader}>
        <View style={styles.streakCount}>
          <View style={styles.streakNumberContainer}>
            <Ionicons 
              name="flame" 
              size={20} 
              color={streakColor} 
              style={{ marginRight: 8 }}
            />
            <Text 
              style={[styles.streakNumber, { color: streakColor }]}
              accessibilityRole="text"
              accessibilityLabel={`Current streak: ${currentStreak} days`}
            >
              {currentStreak}
            </Text>
          </View>
          <Text style={[styles.streakLabel, { color: colors.textMuted }]}>
            day{currentStreak !== 1 ? 's' : ''} streak
          </Text>
        </View>
        
        <View style={styles.milestoneContainer}>
          {milestones.slice(0, 5).map(milestone => (
            <MilestoneBadge 
              key={milestone.days}
              milestone={milestone}
              isActive={milestone.achieved}
            />
          ))}
        </View>
      </View>
      
      <View style={styles.motivationalSection}>
        <Text 
          style={[styles.motivationalText, { color: colors.textPrimary }]}
          accessibilityRole="text"
        >
          {displayMessage}
        </Text>
        
        {nextMilestone && nextMilestone.daysRemaining > 3 && (
          <Text style={[styles.nextMilestoneText, { color: colors.textMuted }]}>
            {nextMilestone.daysRemaining} days until your {nextMilestone.days}-day streak!
          </Text>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  streakCard: {
    marginBottom: 16,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  streakCount: {
    flex: 1,
  },
  streakNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  milestoneContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    maxWidth: 200,
  },
  milestoneBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  milestoneDays: {
    fontSize: 8,
    fontWeight: '600',
    position: 'absolute',
    bottom: 2,
  },
  motivationalSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  motivationalText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 4,
  },
  nextMilestoneText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

// Export the motivational message function for use in other components
export { getMotivationalMessage };