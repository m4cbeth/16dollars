export type CategoryType = 'good' | 'bad' | 'selfcare';

export interface Category {
  name: string; // e.g. 'Good Time', 'Bad Time', 'Self Care'
  color: string; // hex color
}

export interface ActivityTemplate {
  id: string;
  name: string; // e.g. 'Reading', 'Exercise'
  categoryType: CategoryType; // references which category type this belongs to
}

export interface Activity {
  id: string;
  name: string;
  categoryType: CategoryType; // which category type
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  cost: number; // derived from duration in hours (can exceed 1 hour)
}

export interface CategoryGoals {
  good: number;
  bad: number;
  selfcare: number;
}

export type TimeReference =
  | { type: 'bedtime' }
  | { type: 'wakeTime' }
  | { type: 'offset'; minutes: number }; // offset from wakeTime in minutes

export interface QuickAction {
  id: string;
  templateId: string; // which activity template to use
  startTime: TimeReference;
  endTime: TimeReference;
  enabled: boolean;
}

export interface UserSettings {
  bedtime: string; // e.g. "23:00"
  wakeTime: string; // e.g. "07:00"
  themeMode?: 'light' | 'dark' | 'system'; // theme preference
  goals?: CategoryGoals; // target dollars for each category
  weekEndsOn?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'; // last day of week
  quickActions?: QuickAction[]; // one-tap preset activities
}
