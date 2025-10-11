import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../useTheme';
import { Activity, ActivityTemplate, Category, CategoryType, UserSettings } from '../types';
import { addActivity, deleteActivity, loadActivities, loadActivityTemplates, loadCategories, loadSettings, updateActivity } from '../storage';
import { computeRemainingDollars, computeSpentDollars, durationHoursAcrossMidnight, formatTime12h, getDayWindow, isInSleepWindow } from '../utils/time';
import ActivityModal from '../components/ActivityModal';


type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { theme, reloadTheme } = useTheme();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [categories, setCategories] = useState<Record<CategoryType, Category>>({ good: { name: 'Good Time', color: '#4CAF50' }, bad: { name: 'Bad Time', color: '#F44336' }, selfcare: { name: 'Self Care', color: '#FFC107' } });
  const [settings, setSettings] = useState<UserSettings>({ bedtime: '23:00', wakeTime: '07:00' });
  const [now, setNow] = useState<Date>(new Date());

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);

  const refresh = useCallback(async () => {
    const [acts, temps, cats, setts] = await Promise.all([
      loadActivities(),
      loadActivityTemplates(),
      loadCategories(),
      loadSettings(),
    ]);
    setActivities(acts);
    setTemplates(temps);
    setCategories(cats);
    if (setts) setSettings(setts);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh when screen comes into focus (e.g., after returning from Settings)
  useFocusEffect(
    useCallback(() => {
      refresh();
      reloadTheme(); // Also reload theme in case it was changed in Settings
    }, [refresh, reloadTheme])
  );

  useEffect(() => {
    // Update every 36 seconds (0.01 hour)
    const id = setInterval(() => {
      setNow(new Date());
    }, 36_000);
    return () => clearInterval(id);
  }, []);

  // Also update now whenever settings change (for immediate reactivity)
  useEffect(() => {
    setNow(new Date());
  }, [settings]);

  const sleeping = useMemo(() => {
    return isInSleepWindow(now, settings);
  }, [now, settings]);

  const remaining = useMemo(() => computeRemainingDollars(now, settings), [now, settings]);
  const spent = useMemo(() => computeSpentDollars(now, settings), [now, settings]);

  const dayWindow = useMemo(() => getDayWindow(now, settings), [now, settings]);

  const todaysActivities = useMemo(() => {
    const filtered = activities
      .filter((a) => {
        // Include if overlaps today's window (from most recent bedtime to next bedtime)
        const s = new Date(a.startTime);
        let e = new Date(a.endTime);
        if (e < s) e = new Date(e.getTime() + 24 * 60 * 60 * 1000);
        return s < dayWindow.end && e > dayWindow.start;
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()); // Reverse: newest first

    return filtered;
  }, [activities, dayWindow]);

  // Calculate category totals
  const categoryTotals = useMemo(() => {
    return todaysActivities.reduce((acc, activity) => {
      acc[activity.categoryType] += activity.cost;
      return acc;
    }, { good: 0, bad: 0, selfcare: 0 } as Record<CategoryType, number>);
  }, [todaysActivities]);

  function categoryColor(catType: CategoryType): string {
    return categories[catType]?.color ?? theme.colors.divider;
  }

  function onAddPress() {
    setEditing(null);
    setModalVisible(true);
  }

  async function handleSave(activity: Activity) {
    if (editing) {
      await updateActivity(activity);
    } else {
      await addActivity(activity);
    }
    await refresh();
    setModalVisible(false);
  }

  async function handleDelete(id: string) {
    await deleteActivity(id);
    await refresh();
    setModalVisible(false);
  }

  function renderHeader() {
    if (sleeping) {
      return (
        <View style={{ padding: theme.spacing(2), paddingTop: theme.spacing(2) }}>
          {/* Logo */}
          <View style={{ marginBottom: theme.spacing(2) }}>
            <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}>
              16dollars
            </Text>
          </View>
          <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: '700' }}>
            Time to invest in sleep silly! 🛏️
          </Text>
        </View>
      );
    }

    return (
      <View style={{ paddingTop: theme.spacing(2), paddingBottom: theme.spacing(1), paddingHorizontal: theme.spacing(2) }}>
        {/* Top Row: Logo left, Display right */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Logo - Top left */}
          <View style={{ paddingTop: 4 }}>
            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 }}>
              16dollars
            </Text>
          </View>

          {/* Main Display - Right aligned, tight */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '400', letterSpacing: 0.3, marginBottom: 4 }}>
              left today
            </Text>
            <Text style={{ color: theme.colors.text, fontSize: 64, fontWeight: '900', letterSpacing: -2, lineHeight: 64 }}>
              ${remaining.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Spent Dollars - Below, right aligned */}
        <View style={{ alignItems: 'flex-end', marginTop: theme.spacing(1) }}>
          <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
            You've spent ${spent.toFixed(2)} of your day so far.
          </Text>
        </View>
      </View>
    );
  }

  function renderGoals() {
    const goals = settings.goals || { good: 70, bad: 30, selfcare: 70 };
    const categories: Array<{ type: CategoryType; label: string }> = [
      { type: 'selfcare', label: 'Self-Care' },
      { type: 'bad', label: 'Bad' },
      { type: 'good', label: 'Good' },
    ];

    return (
      <TouchableOpacity
        onPress={() => {/* TODO: Open weekly summary */ }}
        style={{ paddingHorizontal: theme.spacing(3), paddingVertical: theme.spacing(2) }}
        activeOpacity={0.7}
      >
        <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '700', marginBottom: theme.spacing(2) }}>
          Goals
        </Text>
        {categories.map(({ type, label }) => {
          const current = categoryTotals[type];
          const target = goals[type];
          const progress = Math.min(current / target, 1);
          const color = categoryColor(type);

          return (
            <View key={type} style={{ marginBottom: theme.spacing(2) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 14 }}>
                  ${current.toFixed(2)} / ${target.toFixed(2)}
                </Text>
              </View>
              {/* Progress Bar */}
              <View style={{ height: 12, backgroundColor: theme.colors.divider, borderRadius: 20, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${progress * 100}%`,
                    backgroundColor: color,
                    borderRadius: 20,
                  }}
                />
              </View>
            </View>
          );
        })}
      </TouchableOpacity>
    );
  }

  function renderCard(a: Activity) {
    const s = new Date(a.startTime);
    const e = new Date(a.endTime);
    const leftColor = categoryColor(a.categoryType);
    const activityCost = durationHoursAcrossMidnight(a.startTime, a.endTime);

    return (
      <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing(2), paddingLeft: theme.spacing(2) }}>
        {/* Timeline Node */}
        <View style={{ width: 40, alignItems: 'center', marginRight: theme.spacing(2) }}>
          <View style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: leftColor,
            borderWidth: 3,
            borderColor: theme.colors.background,
          }} />
        </View>

        {/* Activity Card */}
        <TouchableOpacity
          onPress={() => { setEditing(a); setModalVisible(true); }}
          style={{
            flex: 1,
            backgroundColor: theme.colors.card,
            borderRadius: 20,
            ...theme.shadow,
            overflow: 'hidden',
            marginRight: theme.spacing(2),
          }}
        >
          <View style={{ height: '100%', width: 4, backgroundColor: leftColor, position: 'absolute', left: 0, top: 0, bottom: 0 }} />
          <View style={{ padding: theme.spacing(2), paddingLeft: theme.spacing(2) + 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600', flex: 1 }}>{a.name}</Text>
              <Text style={{ color: theme.colors.text, fontSize: 32, fontWeight: '900', letterSpacing: -1, marginLeft: theme.spacing(2) }}>
                ${activityCost.toFixed(2)}
              </Text>
            </View>
            <Text style={{ color: theme.colors.muted, marginTop: 4, fontSize: 14 }}>
              {formatTime12h(s)} - {formatTime12h(e)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      {renderHeader()}

      {/* Goals Section */}
      {!sleeping && renderGoals()}

      {/* Debug buttons (dev only) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing(2), marginBottom: theme.spacing(1) }}>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={async () => {
            const acts = await loadActivities();
            console.log('🔍 DIAGNOSTIC CHECK:');
            console.log('Total in storage:', acts.length);
            acts.forEach((a, i) => {
              console.log(`${i + 1}. ${a.name}:`, {
                id: a.id.substring(0, 8),
                start: new Date(a.startTime).toLocaleString(),
                end: new Date(a.endTime).toLocaleString(),
              });
            });
            console.log('Current dayWindow:', {
              start: dayWindow.start.toLocaleString(),
              end: dayWindow.end.toLocaleString(),
            });
            alert(`${acts.length} activities in storage. Check console for details.`);
          }} style={{ padding: 8 }}>
            <Text style={{ color: theme.colors.accent, fontSize: 12 }}>Debug</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={async () => {
            const { saveActivities } = await import('../storage');
            const allActivities = await loadActivities();
            const todaysStart = dayWindow.start;
            const filtered = allActivities.filter((a) => {
              const activityStart = new Date(a.startTime);
              return activityStart < todaysStart;
            });
            await saveActivities(filtered);
            console.log(`🗑️ RESET TODAY: Removed ${allActivities.length - filtered.length} activities from today`);
            await refresh();
            alert(`Reset today! Removed ${allActivities.length - filtered.length} activities.`);
          }} style={{ padding: 8 }}>
            <Text style={{ color: '#F44336', fontSize: 12 }}>Reset Today</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Activity list with Timeline */}
      <ScrollView contentContainerStyle={{ paddingTop: theme.spacing(3), paddingBottom: theme.spacing(32) }}>
        <View style={{ position: 'relative' }}>
          {/* Vertical Timeline Line */}
          <View style={{
            position: 'absolute',
            left: theme.spacing(2) + 20,
            top: 20,
            bottom: 20,
            width: 2,
            backgroundColor: theme.colors.divider,
          }} />

          {/* Timeline Start: Bedtime ($0) at top */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: theme.spacing(2), marginBottom: theme.spacing(2) }}>
            <View style={{ width: 40, alignItems: 'center', marginRight: theme.spacing(2) }}>
              <View style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: theme.colors.divider,
                borderWidth: 2,
                borderColor: theme.colors.background,
              }} />
            </View>
            <Text style={{ color: theme.colors.muted, fontSize: 14, fontWeight: '600' }}>
              $0 ({settings.bedtime})
            </Text>
          </View>

          {/* Activities */}
          {todaysActivities.length === 0 && activities.length > 0 && (
            <View style={{ padding: theme.spacing(2), backgroundColor: 'rgba(255,193,7,0.2)', margin: theme.spacing(2), marginLeft: theme.spacing(2) + 50, borderRadius: 20 }}>
              <Text style={{ color: '#FFC107', fontWeight: '600', marginBottom: 4 }}>⚠️ {activities.length} activities exist but are filtered out</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>They may be outside today's time window. Tap Debug to see details.</Text>
            </View>
          )}
          {todaysActivities.map(renderCard)}

          {/* Timeline End: Wake time ($16) at bottom */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: theme.spacing(2), marginTop: theme.spacing(2) }}>
            <View style={{ width: 40, alignItems: 'center', marginRight: theme.spacing(2) }}>
              <View style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: theme.colors.divider,
                borderWidth: 2,
                borderColor: theme.colors.background,
              }} />
            </View>
            <Text style={{ color: theme.colors.muted, fontSize: 14, fontWeight: '600' }}>
              $16 ({settings.wakeTime})
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: theme.spacing(3),
        paddingBottom: theme.spacing(8), // Much more padding for Android nav buttons (64px)
        paddingHorizontal: theme.spacing(2),
        backgroundColor: theme.colors.card,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        ...theme.shadow,
      }}>
        <TouchableOpacity
          onPress={onAddPress}
          style={{
            flex: 1,
            backgroundColor: theme.colors.accent,
            borderRadius: 20,
            paddingVertical: 14,
            marginRight: theme.spacing(1),
            alignItems: 'center',
            ...theme.shadow,
          }}
        >
          <Text style={{ color: theme.colors.accentText, fontWeight: '700', fontSize: 16 }}>+ Add</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={{
            flex: 1,
            backgroundColor: theme.colors.accent,
            borderRadius: 20,
            paddingVertical: 14,
            marginLeft: theme.spacing(1),
            alignItems: 'center',
            ...theme.shadow,
          }}
        >
          <Text style={{ color: theme.colors.accentText, fontWeight: '700', fontSize: 16 }}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <ActivityModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        onDelete={editing ? handleDelete : undefined}
        templates={templates}
        categories={categories}
        initial={editing}
        baseDay={dayWindow.start}
      />
    </View>
  );
}