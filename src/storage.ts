import AsyncStorage from '@react-native-async-storage/async-storage';
import { Activity, ActivityTemplate, Category, CategoryType, UserSettings } from './types';

const KEYS = {
  activities: 'activities',
  activityTemplates: 'activityTemplates',
  categories: 'categories',
  settings: 'settings',
} as const;

export async function loadActivities(): Promise<Activity[]> {
  const raw = await AsyncStorage.getItem(KEYS.activities);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Activity[];
  } catch (e) {
    console.error('Failed to parse activities:', e);
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

export async function loadActivityTemplates(): Promise<ActivityTemplate[]> {
  const raw = await AsyncStorage.getItem(KEYS.activityTemplates);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ActivityTemplate[];
  } catch {
    return [];
  }
}

export async function saveActivityTemplates(list: ActivityTemplate[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.activityTemplates, JSON.stringify(list));
}

export async function loadCategories(): Promise<Record<CategoryType, Category>> {
  const raw = await AsyncStorage.getItem(KEYS.categories);
  if (!raw) return { good: { name: 'Good Time', color: '#4CAF50' }, bad: { name: 'Bad Time', color: '#F44336' }, selfcare: { name: 'Self Care', color: '#FFC107' } };
  try {
    return JSON.parse(raw) as Record<CategoryType, Category>;
  } catch {
    return { good: { name: 'Good Time', color: '#4CAF50' }, bad: { name: 'Bad Time', color: '#F44336' }, selfcare: { name: 'Self Care', color: '#FFC107' } };
  }
}

export async function saveCategories(categories: Record<CategoryType, Category>): Promise<void> {
  await AsyncStorage.setItem(KEYS.categories, JSON.stringify(categories));
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
  const [templates, cats, settings] = await Promise.all([
    loadActivityTemplates(),
    loadCategories(),
    loadSettings(),
  ]);

  if (!settings) {
    await saveSettings({ bedtime: '23:00', wakeTime: '07:00', themeMode: 'system' });
  }

  // Categories always exist with defaults if missing
  if (!cats || Object.keys(cats).length === 0) {
    await saveCategories({
      good: { name: 'Good Time', color: '#4CAF50' },
      bad: { name: 'Bad Time', color: '#F44336' },
      selfcare: { name: 'Self Care', color: '#FFC107' },
    });
  }

  // Activity templates
  if (!templates || templates.length === 0) {
    const defaults: { name: string; categoryType: CategoryType }[] = [
      { name: 'Reading', categoryType: 'good' },
      { name: 'Exercise', categoryType: 'good' },
      { name: 'Work', categoryType: 'good' },
      { name: 'Social Media', categoryType: 'bad' },
      { name: 'Sleep', categoryType: 'selfcare' },
      { name: 'Bath', categoryType: 'selfcare' },
      { name: 'Tidying', categoryType: 'selfcare' },
    ];
    const templateObjs: ActivityTemplate[] = defaults.map((t) => ({ id: idFromName(t.name), ...t }));
    await saveActivityTemplates(templateObjs);
  }
}
