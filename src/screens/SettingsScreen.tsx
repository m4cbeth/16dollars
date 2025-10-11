import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../theme';
import { Category, CategoryType, UserSettings } from '../types';
import { loadCategories, loadSettings, saveCategories, saveSettings } from '../storage';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<UserSettings>({ bedtime: '23:00', wakeTime: '07:00' });
  const [categories, setCategories] = useState<Category[]>([]);

  const [showWakePicker, setShowWakePicker] = useState(false);
  const [showBedPicker, setShowBedPicker] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, c] = await Promise.all([loadSettings(), loadCategories()]);
      if (s) setSettings(s);
      setCategories(c);
    })();
  }, []);

  function hhmmToDate(hhmm: string): Date {
    const d = new Date();
    const [h, m] = hhmm.split(':').map(Number);
    d.setHours(h, m, 0, 0);
    return d;
  }

  function dateToHHmm(d: Date): string {
    const h = d.getHours();
    const m = d.getMinutes();
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  function format12h(d: Date): string {
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12; if (h === 0) h = 12;
    return `${h}:${m}${ampm}`;
  }

  async function persistSettings(next: UserSettings) {
    setSettings(next);
    await saveSettings(next);
  }

  function updateCategory(idx: number, patch: Partial<Category>) {
    setCategories((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  }

  async function saveAllCategories() {
    await saveCategories(categories);
  }

  function addCategory() {
    const newCat: Category = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: 'New Category',
      type: 'good',
      color: theme.colors.green,
    };
    setCategories((prev) => [...prev, newCat]);
  }

  function removeCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: theme.spacing(2), paddingBottom: theme.spacing(6) }}>
      <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '700', marginBottom: theme.spacing(2) }}>User Settings</Text>

      <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>Wake Time</Text>
      <TouchableOpacity onPress={() => setShowWakePicker(true)} style={{ padding: 12, backgroundColor: theme.colors.card, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.divider, marginBottom: theme.spacing(2) }}>
        <Text style={{ color: theme.colors.text }}>{format12h(hhmmToDate(settings.wakeTime))}</Text>
      </TouchableOpacity>
      {showWakePicker && (
        <DateTimePicker
          value={hhmmToDate(settings.wakeTime)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={async (_e, d) => {
            setShowWakePicker(false);
            if (d) {
              await persistSettings({ ...settings, wakeTime: dateToHHmm(d) });
            }
          }}
        />
      )}

      <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>Bedtime</Text>
      <TouchableOpacity onPress={() => setShowBedPicker(true)} style={{ padding: 12, backgroundColor: theme.colors.card, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.divider, marginBottom: theme.spacing(2) }}>
        <Text style={{ color: theme.colors.text }}>{format12h(hhmmToDate(settings.bedtime))}</Text>
      </TouchableOpacity>
      {showBedPicker && (
        <DateTimePicker
          value={hhmmToDate(settings.bedtime)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={async (_e, d) => {
            setShowBedPicker(false);
            if (d) {
              await persistSettings({ ...settings, bedtime: dateToHHmm(d) });
            }
          }}
        />
      )}

      <View style={{ height: 1, backgroundColor: theme.colors.divider, marginVertical: theme.spacing(2) }} />

      <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '700', marginBottom: theme.spacing(2) }}>Categories</Text>
      {categories.map((c, idx) => (
        <View key={c.id} style={{ backgroundColor: theme.colors.card, padding: theme.spacing(2), borderRadius: 10, marginBottom: theme.spacing(1) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: c.color, marginRight: 8 }} />
            <TextInput
              value={c.name}
              onChangeText={(t) => updateCategory(idx, { name: t })}
              placeholder="Category name"
              placeholderTextColor={theme.colors.muted}
              style={{ flex: 1, color: theme.colors.text, backgroundColor: theme.colors.background, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.divider }}
            />
          </View>

          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {(['good','bad','selfcare'] as CategoryType[]).map((t) => (
              <TouchableOpacity key={t} onPress={() => updateCategory(idx, { type: t })} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, marginRight: 8, backgroundColor: c.type === t ? theme.colors.accent : theme.colors.divider }}>
                <Text style={{ color: c.type === t ? '#000' : theme.colors.text }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: theme.colors.muted, marginRight: 8 }}>Color</Text>
            <TextInput
              value={c.color}
              onChangeText={(t) => updateCategory(idx, { color: t })}
              placeholder="#hex"
              placeholderTextColor={theme.colors.muted}
              style={{ flex: 1, color: theme.colors.text, backgroundColor: theme.colors.background, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.divider }}
            />
            <TouchableOpacity onPress={() => removeCategory(c.id)} style={{ padding: 8, marginLeft: 8 }}>
              <Text style={{ color: theme.colors.red }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing(2) }}>
        <TouchableOpacity onPress={addCategory} style={{ padding: 12, borderRadius: 8, backgroundColor: theme.colors.divider }}>
          <Text style={{ color: theme.colors.text }}>Add Category</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={saveAllCategories} style={{ padding: 12, borderRadius: 8, backgroundColor: theme.colors.accent }}>
          <Text style={{ color: '#000' }}>Save Categories</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}