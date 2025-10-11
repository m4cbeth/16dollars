import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import ColorPicker from 'react-native-wheel-color-picker';
import { ThemeMode } from '../theme';
import { useTheme } from '../useTheme';
import { ActivityTemplate, Category, CategoryType, UserSettings } from '../types';
import { loadActivityTemplates, loadCategories, loadSettings, saveActivityTemplates, saveCategories, saveSettings } from '../storage';

export default function SettingsScreen() {
  const { theme, themeMode, reloadTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettings>({
    bedtime: '23:00',
    wakeTime: '07:00',
    themeMode: 'system',
    goals: { good: 70, bad: 30, selfcare: 70 },
    weekEndsOn: 'sunday'
  });
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [categories, setCategories] = useState<Record<CategoryType, Category>>({
    good: { name: 'Good Time', color: '#4CAF50' },
    bad: { name: 'Bad Time', color: '#F44336' },
    selfcare: { name: 'Self Care', color: '#FFC107' },
  });

  const [showWakePicker, setShowWakePicker] = useState(false);
  const [showBedPicker, setShowBedPicker] = useState(false);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [editingColorType, setEditingColorType] = useState<CategoryType | null>(null);
  const [tempColor, setTempColor] = useState<string>('#4CAF50');

  useEffect(() => {
    (async () => {
      const [s, t, c] = await Promise.all([loadSettings(), loadActivityTemplates(), loadCategories()]);
      if (s) {
        setSettings({
          ...s,
          themeMode: s.themeMode || 'system',
          goals: s.goals || { good: 70, bad: 30, selfcare: 70 },
          weekEndsOn: s.weekEndsOn || 'sunday'
        });
      }
      setTemplates(t);
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
    // Force immediate re-render by updating state
    // This ensures HomeScreen picks up changes when navigating back
  }

  async function setTheme(mode: ThemeMode) {
    console.log('🎨 Setting theme to:', mode);
    const newSettings = { ...settings, themeMode: mode };
    setSettings(newSettings);
    await saveSettings(newSettings);
    console.log('✅ Theme saved:', mode);
    // Force immediate theme reload
    await reloadTheme();
    console.log('🔄 Theme reloaded');
  }

  function updateTemplate(idx: number, patch: Partial<ActivityTemplate>) {
    setTemplates((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  }

  async function saveAllTemplates() {
    await saveActivityTemplates(templates);
  }

  function addTemplate() {
    const newTemplate: ActivityTemplate = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: 'New Activity',
      categoryType: 'good',
    };
    setTemplates((prev) => [...prev, newTemplate]);
  }

  function removeTemplate(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  function updateCategory(type: CategoryType, patch: Partial<Category>) {
    setCategories((prev) => ({ ...prev, [type]: { ...prev[type], ...patch } }));
  }

  async function saveAllCategories() {
    await saveCategories(categories);
  }

  function openColorPicker(type: CategoryType) {
    setEditingColorType(type);
    setTempColor(categories[type]?.color ?? '#4CAF50');
    setColorPickerVisible(true);
  }

  function saveColor() {
    if (editingColorType) {
      updateCategory(editingColorType, { color: tempColor });
    }
    setColorPickerVisible(false);
    setEditingColorType(null);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: theme.spacing(2), paddingBottom: theme.spacing(12) }}>
      <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: '700', marginBottom: theme.spacing(3) }}>Settings</Text>

      {/* Theme Toggle */}
      <Text style={{ color: theme.colors.muted, marginBottom: 8, fontSize: 14, fontWeight: '600' }}>Theme</Text>
      <View style={{ flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: 12, padding: 4, marginBottom: theme.spacing(3) }}>
        {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => {
          const isSelected = (settings.themeMode || 'system') === mode;
          return (
            <TouchableOpacity
              key={mode}
              onPress={() => setTheme(mode)}
              style={{
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: isSelected ? theme.colors.accent : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: isSelected ? theme.colors.accentText : theme.colors.text,
                fontWeight: isSelected ? '600' : '400',
                textTransform: 'capitalize',
              }}>
                {mode === 'system' ? 'Auto' : mode}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Horizontal Time Cards */}
      <View style={{ flexDirection: 'row', marginBottom: theme.spacing(3) }}>
        {/* Wake Time Card */}
        <View style={{
          flex: 1,
          backgroundColor: '#FFF4E6',
          borderRadius: 20,
          padding: theme.spacing(3),
          marginRight: theme.spacing(1),
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Sun Icon Background - Darker yellow */}
          <Text style={{ position: 'absolute', right: 10, top: 10, fontSize: 50, opacity: 0.3 }}>☀️</Text>

          <Text style={{ color: '#D97706', fontSize: 18, fontWeight: '700', marginBottom: theme.spacing(1) }}>Wake Time</Text>
          <TouchableOpacity onPress={() => setShowWakePicker(true)} style={{ padding: 14, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12 }}>
            <Text style={{ color: '#92400E', textAlign: 'center', fontSize: 20, fontWeight: '600' }}>{format12h(hhmmToDate(settings.wakeTime))}</Text>
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
        </View>

        {/* Bedtime Card */}
        <View style={{
          flex: 1,
          backgroundColor: '#4C1D95',
          borderRadius: 20,
          padding: theme.spacing(3),
          marginLeft: theme.spacing(1),
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Moon Icon Background - Paler/whiter */}
          <Text style={{ position: 'absolute', right: 10, top: 10, fontSize: 50, opacity: 0.35 }}>🌙</Text>

          <Text style={{ color: '#F3E8FF', fontSize: 18, fontWeight: '700', marginBottom: theme.spacing(1) }}>Bedtime</Text>
          <TouchableOpacity onPress={() => setShowBedPicker(true)} style={{ padding: 14, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 }}>
            <Text style={{ color: '#FFFFFF', textAlign: 'center', fontSize: 20, fontWeight: '600' }}>{format12h(hhmmToDate(settings.bedtime))}</Text>
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
        </View>
      </View>

      {/* Goals Section */}
      <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '700', marginBottom: theme.spacing(2) }}>
        Weekly Goals
      </Text>
      <View style={{ backgroundColor: theme.colors.card, borderRadius: 16, padding: theme.spacing(2), marginBottom: theme.spacing(3) }}>
        {(['good', 'bad', 'selfcare'] as const).map((type) => {
          const goals = settings.goals || { good: 70, bad: 30, selfcare: 70 };
          const catName = categories[type]?.name || type;
          return (
            <View key={type} style={{ marginBottom: theme.spacing(2) }}>
              <Text style={{ color: theme.colors.text, fontWeight: '600', marginBottom: 8, textTransform: 'capitalize' }}>
                {catName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: theme.colors.muted, marginRight: 12 }}>Target $</Text>
                <TextInput
                  value={goals[type]?.toString() || '0'}
                  onChangeText={(val) => {
                    const num = parseFloat(val) || 0;
                    setSettings({ ...settings, goals: { ...goals, [type]: num } });
                  }}
                  keyboardType="decimal-pad"
                  style={{
                    flex: 1,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.background,
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.colors.divider,
                    fontSize: 16,
                  }}
                />
              </View>
            </View>
          );
        })}

        {/* Week Ends On */}
        <View style={{ marginTop: theme.spacing(2), paddingTop: theme.spacing(2), borderTopWidth: 1, borderTopColor: theme.colors.divider }}>
          <Text style={{ color: theme.colors.text, fontWeight: '600', marginBottom: 8 }}>Week Ends On</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const).map((day) => {
              const isSelected = (settings.weekEndsOn || 'sunday') === day;
              const letter = day.charAt(0).toUpperCase();
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => setSettings({ ...settings, weekEndsOn: day })}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: isSelected ? theme.colors.accent : theme.colors.divider,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: isSelected ? theme.colors.accentText : theme.colors.text, fontWeight: isSelected ? '700' : '400', fontSize: 16 }}>
                    {letter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => persistSettings(settings)}
          style={{
            backgroundColor: theme.colors.accent,
            padding: 12,
            borderRadius: 10,
            alignItems: 'center',
            marginTop: theme.spacing(2),
          }}
        >
          <Text style={{ color: theme.colors.accentText, fontWeight: '700' }}>Save Goals</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 1, backgroundColor: theme.colors.divider, marginVertical: theme.spacing(2) }} />

      {/* Quick Actions Section */}
      <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '700', marginBottom: theme.spacing(2) }}>Quick Actions</Text>
      <Text style={{ color: theme.colors.muted, fontSize: 12, marginBottom: theme.spacing(1) }}>One-tap shortcuts to add common activities with preset times.</Text>
      {(settings.quickActions || []).map((action, idx) => {
        const template = templates.find(t => t.id === action.templateId);
        return (
          <View key={action.id} style={{ backgroundColor: theme.colors.card, padding: theme.spacing(2), borderRadius: 16, marginBottom: theme.spacing(1) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing(1) }}>
              <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 16 }}>{template?.name || 'Select Activity'}</Text>
              <TouchableOpacity
                onPress={() => {
                  const updated = [...(settings.quickActions || [])];
                  updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
                  setSettings({ ...settings, quickActions: updated });
                }}
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: action.enabled ? theme.colors.green : theme.colors.divider,
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: '#FFF',
                  alignSelf: action.enabled ? 'flex-end' : 'flex-start',
                }} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              This quick action is currently {action.enabled ? 'enabled' : 'disabled'}
            </Text>
          </View>
        );
      })}
      <TouchableOpacity
        onPress={() => persistSettings(settings)}
        style={{
          backgroundColor: theme.colors.accent,
          padding: 12,
          borderRadius: 10,
          alignItems: 'center',
          marginTop: theme.spacing(1),
          marginBottom: theme.spacing(3),
        }}
      >
        <Text style={{ color: theme.colors.accentText, fontWeight: '700' }}>Save Quick Actions</Text>
      </TouchableOpacity>

      <View style={{ height: 1, backgroundColor: theme.colors.divider, marginVertical: theme.spacing(2) }} />

      <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '700', marginBottom: theme.spacing(2) }}>Activities</Text>
      <Text style={{ color: theme.colors.muted, fontSize: 12, marginBottom: theme.spacing(1) }}>Define your activity templates. Each activity belongs to a category type.</Text>
      {templates.map((t, idx) => {
        const catColor = categories[t.categoryType]?.color ?? theme.colors.divider;
        return (
          <View key={t.id} style={{ backgroundColor: theme.colors.card, padding: theme.spacing(2), borderRadius: 10, marginBottom: theme.spacing(1), borderLeftWidth: 4, borderLeftColor: catColor, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TextInput
                value={t.name}
                onChangeText={(name) => updateTemplate(idx, { name })}
                placeholder="Activity name"
                placeholderTextColor={theme.colors.muted}
                style={{ flex: 1, color: theme.colors.text, backgroundColor: theme.colors.background, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.divider }}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', flex: 1 }}>
                {(['good', 'bad', 'selfcare'] as CategoryType[]).map((type) => (
                  <TouchableOpacity key={type} onPress={() => updateTemplate(idx, { categoryType: type })} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, marginRight: 8, backgroundColor: t.categoryType === type ? categories[type]?.color : theme.colors.divider }}>
                    <Text style={{ color: t.categoryType === type ? '#FFF' : theme.colors.text, fontWeight: t.categoryType === type ? '600' : '400' }}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => removeTemplate(t.id)} style={{ padding: 8 }}>
                <Text style={{ color: theme.colors.red }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing(2) }}>
        <TouchableOpacity onPress={addTemplate} style={{ padding: 12, borderRadius: 8, backgroundColor: theme.colors.divider }}>
          <Text style={{ color: theme.colors.text }}>Add Activity</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={saveAllTemplates} style={{ padding: 12, borderRadius: 8, backgroundColor: theme.colors.accent }}>
          <Text style={{ color: theme.colors.accentText, fontWeight: '700' }}>Save Activities</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 1, backgroundColor: theme.colors.divider, marginVertical: theme.spacing(2) }} />

      <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '700', marginBottom: theme.spacing(2) }}>Categories</Text>
      <Text style={{ color: theme.colors.muted, fontSize: 12, marginBottom: theme.spacing(1) }}>Define the three category types and their colors.</Text>
      {(['good', 'bad', 'selfcare'] as CategoryType[]).map((type) => {
        const catColor = categories[type]?.color ?? theme.colors.divider;
        return (
          <View key={type} style={{ backgroundColor: catColor, padding: theme.spacing(2), borderRadius: 10, marginBottom: theme.spacing(1) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: '#FFF', fontWeight: '700', marginRight: 8, textTransform: 'capitalize', width: 80, textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{type}</Text>
              <TextInput
                value={categories[type]?.name ?? ''}
                onChangeText={(name) => updateCategory(type, { name })}
                placeholder="Category name"
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                style={{ flex: 1, color: '#FFF', backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', marginRight: 8, fontWeight: '600' }}
              />
              <TouchableOpacity onPress={() => openColorPicker(type)} style={{ width: 60, height: 36, backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '600', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>🎨 Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: theme.spacing(2) }}>
        <TouchableOpacity onPress={saveAllCategories} style={{ padding: 12, borderRadius: 8, backgroundColor: theme.colors.accent }}>
          <Text style={{ color: theme.colors.accentText, fontWeight: '700' }}>Save Categories</Text>
        </TouchableOpacity>
      </View>

      {/* Color Picker Modal */}
      <Modal visible={colorPickerVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: theme.spacing(3) }}>
          <View style={{ backgroundColor: theme.colors.card, padding: theme.spacing(3), borderRadius: theme.radius, width: '100%', maxWidth: 400 }}>
            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '600', marginBottom: theme.spacing(2), textAlign: 'center' }}>Choose Color</Text>
            <View style={{ height: 300, marginBottom: theme.spacing(2) }}>
              <ColorPicker
                color={tempColor}
                onColorChange={(color) => setTempColor(color)}
                thumbSize={30}
                sliderSize={30}
                noSnap={true}
                row={false}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing(2) }}>
              <TouchableOpacity onPress={() => setColorPickerVisible(false)} style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: theme.colors.divider, marginRight: 8 }}>
                <Text style={{ color: theme.colors.text, textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveColor} style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: theme.colors.accent }}>
                <Text style={{ color: theme.colors.accentText, textAlign: 'center', fontWeight: '600' }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}