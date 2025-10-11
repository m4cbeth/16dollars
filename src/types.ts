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

export interface UserSettings {
  bedtime: string; // e.g. "23:00"
  wakeTime: string; // e.g. "07:00"
  themeMode?: 'light' | 'dark' | 'system'; // theme preference
}
