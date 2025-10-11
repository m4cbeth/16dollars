import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Activity, Category } from '../types';
import { durationHoursAcrossMidnight } from '../utils/time';
import { theme } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (activity: Activity) => void;
  onDelete?: (id: string) => void;
  categories: Category[];
  initial?: Activity | null;
  defaultCategoryId?: string;
  baseDay: Date; // most recent wake day for anchoring times
}

function two(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function setTime(base: Date, hours: number, minutes: number): Date {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function format12h(hours: number, minutes: number): string {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  let h = d.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${two(d.getMinutes())}${ampm}`;
}

export default function ActivityModal({ visible, onClose, onSave, onDelete, categories, initial, defaultCategoryId, baseDay }: Props) {
  const initCat = initial?.category ?? defaultCategoryId ?? categories[0]?.id;
  const [category, setCategory] = useState<string>(initCat || '');
  const [name, setName] = useState<string>(initial?.name || (categories.find(c => c.id === initCat)?.name ?? ''));

  const initStart = initial ? new Date(initial.startTime) : setTime(baseDay, 9, 0);
  const initEnd = initial ? new Date(initial.endTime) : setTime(baseDay, 10, 0);
  const [start, setStart] = useState<Date>(initStart);
  const [end, setEnd] = useState<Date>(initEnd);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const cost = useMemo(() => {
    const c = durationHoursAcrossMidnight(start.toISOString(), end.toISOString());
    return Math.round(c * 100) / 100;
  }, [start, end]);

  function handleSave() {
    const id = initial?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // If end before start, assume next day
    let endAdj = end;
    if (endAdj < start) {
      endAdj = new Date(endAdj.getTime() + 24 * 60 * 60 * 1000);
    }
    const activity: Activity = {
      id,
      name: name.trim() || (categories.find(c => c.id === category)?.name ?? 'Activity'),
      category,
      startTime: start.toISOString(),
      endTime: endAdj.toISOString(),
      cost,
    };
    onSave(activity);
  }

  function selectCategory(id: string) {
    const prevCatName = categories.find(c => c.id === category)?.name;
    const nextCatName = categories.find(c => c.id === id)?.name;
    // If name matches previous category name, update it to new category name
    setCategory(id);
    setName((curr) => (curr.trim() === (prevCatName ?? '') ? (nextCatName ?? curr) : curr));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: theme.colors.card, padding: theme.spacing(2), borderTopLeftRadius: theme.radius, borderTopRightRadius: theme.radius, maxHeight: '90%' }}>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '600', marginBottom: theme.spacing(2) }}>{initial ? 'Edit Activity' : 'Add Activity'}</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: theme.spacing(2) }}>
              {categories.map((c) => (
                <TouchableOpacity key={c.id} onPress={() => selectCategory(c.id)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, marginRight: 8, backgroundColor: category === c.id ? c.color : theme.colors.divider }}>
                  <Text style={{ color: category === c.id ? '#000' : theme.colors.text }}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>Name</Text>
            <TextInput
              placeholder="Activity name"
              placeholderTextColor={theme.colors.muted}
              value={name}
              onChangeText={setName}
              style={{ color: theme.colors.text, backgroundColor: theme.colors.background, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.divider, marginBottom: theme.spacing(2) }}
            />

            <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>Start</Text>
            <TouchableOpacity onPress={() => setShowStartPicker(true)} style={{ padding: 12, backgroundColor: theme.colors.background, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.divider, marginBottom: theme.spacing(2) }}>
              <Text style={{ color: theme.colors.text }}>{format12h(start.getHours(), start.getMinutes())}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={start}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e, d) => { setShowStartPicker(false); if (d) setStart(d); }}
              />
            )}

            <Text style={{ color: theme.colors.muted, marginBottom: 4 }}>End</Text>
            <TouchableOpacity onPress={() => setShowEndPicker(true)} style={{ padding: 12, backgroundColor: theme.colors.background, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.divider, marginBottom: theme.spacing(1) }}>
              <Text style={{ color: theme.colors.text }}>{format12h(end.getHours(), end.getMinutes())}</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={end}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e, d) => { setShowEndPicker(false); if (d) setEnd(d); }}
              />
            )}

            <Text style={{ color: theme.colors.muted, marginBottom: theme.spacing(2) }}>Cost: ${cost.toFixed(2)}</Text>
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing(2) }}>
            {initial && onDelete && (
              <TouchableOpacity onPress={() => onDelete(initial.id)} style={{ padding: 12, borderRadius: 8, backgroundColor: theme.colors.divider }}>
                <Text style={{ color: theme.colors.text }}>Delete</Text>
              </TouchableOpacity>
            )}
            <View style={{ flexDirection: 'row', marginLeft: 'auto' }}>
              <TouchableOpacity onPress={onClose} style={{ padding: 12, borderRadius: 8, backgroundColor: theme.colors.divider, marginRight: 8 }}>
                <Text style={{ color: theme.colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={{ padding: 12, borderRadius: 8, backgroundColor: theme.colors.accent }}>
                <Text style={{ color: '#000' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}