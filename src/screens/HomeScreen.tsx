import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { theme } from '../theme';
import { Activity, ActivityTemplate, Category, CategoryType, UserSettings } from '../types';
import { addActivity, deleteActivity, loadActivities, loadActivityTemplates, loadCategories, loadSettings, updateActivity } from '../storage';
import { computeRemainingDollars, durationHoursAcrossMidnight, formatTime12h, getDayWindow, isInSleepWindow } from '../utils/time';
import ActivityModal from '../components/ActivityModal';


type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
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
    }, [refresh])
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
    const result = isInSleepWindow(now, settings);
    console.log('Sleep check:', {
      now: now.toLocaleTimeString(),
      bedtime: settings.bedtime,
      wakeTime: settings.wakeTime,
      sleeping: result,
    });
    return result;
  }, [now, settings]);

  const remaining = useMemo(() => computeRemainingDollars(now, settings), [now, settings]);

  const dayWindow = useMemo(() => getDayWindow(now, settings), [now, settings]);

  const todaysActivities = useMemo(() => {
    return activities
      .filter((a) => {
        // Include if overlaps today's window
        const s = new Date(a.startTime);
        let e = new Date(a.endTime);
        if (e < s) e = new Date(e.getTime() + 24 * 60 * 60 * 1000);
        return s < dayWindow.end && e > dayWindow.start;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [activities, dayWindow]);

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
        <View style={{ padding: theme.spacing(2) }}>
          <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: '700' }}>
            Time to invest in sleep silly! 🛏️
            </Text>
        </View>
      );
    }
    return (
      <View style={{ padding: theme.spacing(2) }}>
        <Text style={{ color: theme.colors.text, fontSize: 48, fontWeight: '800' }}>${remaining.toFixed(2)} left today</Text>
      </View>
    );
  }

  function renderCard(a: Activity) {
    const s = new Date(a.startTime);
    const e = new Date(a.endTime);
    const leftColor = categoryColor(a.categoryType);

    return (
      <TouchableOpacity key={a.id} onPress={() => { setEditing(a); setModalVisible(true); }} style={{ backgroundColor: theme.colors.card, borderRadius: theme.radius, marginHorizontal: theme.spacing(2), marginBottom: theme.spacing(1), ...theme.shadow, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: 6, backgroundColor: leftColor, position: 'absolute', left: 0, top: 0, bottom: 0 }} />
        <View style={{ padding: theme.spacing(2), paddingLeft: theme.spacing(2) + 6 }}>
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>{a.name}</Text>
          <Text style={{ color: theme.colors.muted, marginTop: 4 }}>{formatTime12h(s)} - {formatTime12h(e)}  ${durationHoursAcrossMidnight(a.startTime, a.endTime).toFixed(2)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      {renderHeader()}

      {/* Settings button */}
      <View style={{ alignItems: 'flex-end', paddingHorizontal: theme.spacing(2) }}>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ padding: 8 }}>
          <Text style={{ color: theme.colors.accent }}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Activity list */}
      <ScrollView contentContainerStyle={{ paddingTop: theme.spacing(1), paddingBottom: theme.spacing(10) }}>
        {todaysActivities.map(renderCard)}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity onPress={onAddPress} style={{ position: 'absolute', right: theme.spacing(2), bottom: theme.spacing(2), backgroundColor: theme.colors.accent, borderRadius: 28, paddingVertical: 14, paddingHorizontal: 20, ...theme.shadow }}>
        <Text style={{ color: '#000', fontWeight: '700', fontSize: 18 }}>+ Add</Text>
      </TouchableOpacity>

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