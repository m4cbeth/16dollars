import AsyncStorage from '@react-native-async-storage/async-storage';
import { Activity, Category, CategoryType, UserSettings } from './types';

const KEYS = {
  activities: 'activities',
  categories: 'categories',
  settings: 'settings',
} as const;

export async function loadActivities(): Promise<Activity[]> {
  const raw = await AsyncStorage.getItem(KEYS.activities);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Activity[];
  } catch {
    return [];
  }
}

export async function saveActivities(list: Activity[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.activities, JSON.stringify(list));
}

export async function addActivity(activity: Activity): Promise<void> {
  const list = await loadActivities();
  list.push(activity);
  await saveActivities(list);
}

export async function updateActivity(activity: Activity): Promise<void> {
  const list = await loadActivities();
  const idx = list.findIndex((a) => a.id === activity.id);
  if (idx >= 0) {
    list[idx] = activity;
    await saveActivities(list);
  }
}

export async function deleteActivity(id: string): Promise<void> {
  const list = await loadActivities();
  const next = list.filter((a) => a.id !== id);
  await saveActivities(next);
}

export async function loadCategories(): Promise<Category[]> {
  const raw = await AsyncStorage.getItem(KEYS.categories);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Category[];
  } catch {
    return [];
  }
}

export async function saveCategories(list: Category[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.categories, JSON.stringify(list));
}

export async function loadSettings(): Promise<UserSettings | null> {
  const raw = await AsyncStorage.getItem(KEYS.settings);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserSettings;
  } catch {
    return null;
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

function idFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export async function ensureDefaults(): Promise<void> {
  const [cats, settings] = await Promise.all([loadCategories(), loadSettings()]);
  if (!settings) {
    await saveSettings({ bedtime: '23:00', wakeTime: '07:00' });
  }
  if (!cats || cats.length === 0) {
    const defaults: { name: string; type: CategoryType; color: string }[] = [
      { name: 'Reading', type: 'good', color: '#4CAF50' },
      { name: 'Exercise', type: 'good', color: '#4CAF50' },
      { name: 'Work', type: 'good', color: '#4CAF50' },
      { name: 'Social Media', type: 'bad', color: '#F44336' },
      { name: 'Sleep', type: 'selfcare', color: '#FFC107' },
      { name: 'Bath', type: 'selfcare', color: '#FFC107' },
      { name: 'Tidying', type: 'selfcare', color: '#FFC107' },
    ];
    const catObjs: Category[] = defaults.map((c) => ({ id: idFromName(c.name), ...c }));
    await saveCategories(catObjs);
  }
}