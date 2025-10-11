import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Activity, ActivityTemplate, Category, CategoryType, UserSettings } from '../types';
import { durationHoursAcrossMidnight, resolveTimeReference, formatTimeReference } from '../utils/time';
import { useTheme } from '../useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (activity: Activity) => void;
  onDelete?: (id: string) => void;
  templates: ActivityTemplate[];
  categories: Record<CategoryType, Category>;
  initial?: Activity | null;
  baseDay: Date; // most recent wake day for anchoring times
  settings: UserSettings;
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

export default function ActivityModal({ visible, onClose, onSave, onDelete, templates, categories, initial, baseDay, settings }: Props) {
  const { theme } = useTheme();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [start, setStart] = useState<Date>(new Date());
  const [end, setEnd] = useState<Date>(new Date());

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Reset state when modal opens or initial changes
  useEffect(() => {
    if (visible) {
      const initTemplate = initial ? templates.find(t => t.name === initial.name)?.id : templates[0]?.id;

      let initStart: Date;
      let initEnd: Date;

      if (initial) {
        // Editing existing activity
        initStart = new Date(initial.startTime);
        initEnd = new Date(initial.endTime);
      } else {
        // Adding new activity - use current time
        const now = new Date();
        initEnd = setTime(baseDay, now.getHours(), now.getMinutes());
        // Start time is 1 hour earlier
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        initStart = setTime(baseDay, oneHourAgo.getHours(), oneHourAgo.getMinutes());
      }

      setSelectedTemplateId(initTemplate || '');
      setStart(initStart);
      setEnd(initEnd);
      setShowStartPicker(false);
      setShowEndPicker(false);
    }
  }, [visible, initial, templates, baseDay]);

  const cost = useMemo(() => {
    const c = durationHoursAcrossMidnight(start.toISOString(), end.toISOString());
    return Math.round(c * 100) / 100;
  }, [start, end]);

  const selectedTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId);
  }, [templates, selectedTemplateId]);

  const categoryType = useMemo(() => {
    return selectedTemplate?.categoryType ?? 'good';
  }, [selectedTemplate]);

  function handleSave() {
    const id = initial?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // If end before start, assume next day
    let endAdj = end;
    if (endAdj < start) {
      endAdj = new Date(endAdj.getTime() + 24 * 60 * 60 * 1000);
    }

    const activity: Activity = {
      id,
      name: selectedTemplate?.name || 'Activity',
      categoryType,
      startTime: start.toISOString(),
      endTime: endAdj.toISOString(),
      cost,
    };

    onSave(activity);
  }

  function selectTemplate(id: string) {
    setSelectedTemplateId(id);
  }

  function handleQuickAction(actionId: string) {
    const action = settings.quickActions?.find(qa => qa.id === actionId);
    if (!action) return;

    const template = templates.find(t => t.id === action.templateId);
    if (!template) return;

    // Resolve times
    let startDate = resolveTimeReference(action.startTime, settings, baseDay);
    let endDate = resolveTimeReference(action.endTime, settings, baseDay);

    // If end is before start, assume it crosses midnight (add 24 hours)
    if (endDate < startDate) {
      endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    }

    // Create and save activity directly
    const activity: Activity = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: template.name,
      categoryType: template.categoryType,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      cost: durationHoursAcrossMidnight(startDate.toISOString(), endDate.toISOString()),
    };

    onSave(activity);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: theme.colors.card, padding: theme.spacing(3), borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' }}>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '600', marginBottom: theme.spacing(2) }}>{initial ? 'Edit Activity' : 'Add Activity'}</Text>

          <ScrollView style={{ maxHeight: 450 }}>
            {/* Quick Actions - Only show when adding new */}
            {!initial && settings.quickActions && settings.quickActions.filter(qa => qa.enabled).length > 0 && (
              <View style={{ marginBottom: theme.spacing(3) }}>
                <Text style={{ color: theme.colors.muted, marginBottom: 12, fontSize: 14, fontWeight: '600' }}>Quick Actions</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {settings.quickActions.filter(qa => qa.enabled).map((action) => {
                    const template = templates.find(t => t.id === action.templateId);
                    if (!template) return null;

                    const catColor = categories[template.categoryType]?.color ?? theme.colors.divider;
                    const startTimeStr = formatTimeReference(action.startTime, settings);
                    const endTimeStr = formatTimeReference(action.endTime, settings);

                    return (
                      <TouchableOpacity
                        key={action.id}
                        onPress={() => handleQuickAction(action.id)}
                        style={{
                          backgroundColor: catColor,
                          borderRadius: 16,
                          padding: theme.spacing(2),
                          marginRight: theme.spacing(1),
                          marginBottom: theme.spacing(1),
                          minWidth: 100,
                        }}
                      >
                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16, marginBottom: 4 }}>
                          {template.name}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                          {startTimeStr} - {endTimeStr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Activity Templates - Wrapping */}
            <Text style={{ color: theme.colors.muted, marginBottom: 8, fontSize: 14, fontWeight: '600' }}>Activity</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.spacing(3) }}>
              {templates.map((t) => {
                const catColor = categories[t.categoryType]?.color ?? theme.colors.divider;
                const isSelected = selectedTemplateId === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => selectTemplate(t.id)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 20,
                      marginRight: 8,
                      marginBottom: 8,
                      backgroundColor: isSelected ? catColor : theme.colors.divider
                    }}
                  >
                    <Text style={{ color: isSelected ? '#FFF' : theme.colors.text, fontWeight: isSelected ? '600' : '400' }}>{t.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cost Display */}
            <View style={{ alignItems: 'center', marginBottom: theme.spacing(3), paddingVertical: theme.spacing(2) }}>
              <View>
                <Text style={{ color: theme.colors.muted, fontSize: 18, fontWeight: '600', marginBottom: 4 }}>Cost:</Text>
                <Text style={{ color: theme.colors.text, fontSize: 64, fontWeight: '900', letterSpacing: -2, lineHeight: 64 }}>
                  ${cost.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Horizontal Time Pickers */}
            <View style={{ flexDirection: 'row', marginBottom: theme.spacing(2) }}>
              {/* Start Time */}
              <View style={{ flex: 1, marginRight: theme.spacing(1) }}>
                <Text style={{ color: theme.colors.muted, marginBottom: 8, fontSize: 14, fontWeight: '600' }}>Start</Text>
                <TouchableOpacity onPress={() => setShowStartPicker(true)} style={{ padding: 14, backgroundColor: theme.colors.background, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.divider }}>
                  <Text style={{ color: theme.colors.text, textAlign: 'center', fontSize: 18, fontWeight: '600' }}>{format12h(start.getHours(), start.getMinutes())}</Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={start}
                    mode="time"
                    is24Hour={false}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_e, d) => {
                      setShowStartPicker(false);
                      if (d) {
                        // Preserve the baseDay date, only update the time
                        const newStart = setTime(baseDay, d.getHours(), d.getMinutes());
                        setStart(newStart);
                      }
                    }}
                  />
                )}
              </View>

              {/* End Time */}
              <View style={{ flex: 1, marginLeft: theme.spacing(1) }}>
                <Text style={{ color: theme.colors.muted, marginBottom: 8, fontSize: 14, fontWeight: '600' }}>End</Text>
                <TouchableOpacity onPress={() => setShowEndPicker(true)} style={{ padding: 14, backgroundColor: theme.colors.background, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.divider }}>
                  <Text style={{ color: theme.colors.text, textAlign: 'center', fontSize: 18, fontWeight: '600' }}>{format12h(end.getHours(), end.getMinutes())}</Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={end}
                    mode="time"
                    is24Hour={false}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_e, d) => {
                      setShowEndPicker(false);
                      if (d) {
                        // Preserve the baseDay date, only update the time
                        const newEnd = setTime(baseDay, d.getHours(), d.getMinutes());
                        setEnd(newEnd);
                      }
                    }}
                  />
                )}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ marginTop: theme.spacing(3) }}>
            <View style={{ flexDirection: 'row', marginBottom: theme.spacing(1) }}>
              <TouchableOpacity onPress={onClose} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.colors.divider, marginRight: theme.spacing(1) }}>
                <Text style={{ color: theme.colors.text, textAlign: 'center', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.colors.accent, marginLeft: theme.spacing(1) }}>
                <Text style={{ color: theme.colors.accentText, fontWeight: '700', textAlign: 'center' }}>Save</Text>
              </TouchableOpacity>
            </View>

            {initial && onDelete && (
              <TouchableOpacity onPress={() => onDelete(initial.id)} style={{ padding: 14, borderRadius: 12, backgroundColor: theme.colors.red }}>
                <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: '600' }}>Delete Activity</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}