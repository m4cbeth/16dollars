export type CategoryType = 'good' | 'bad' | 'selfcare';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string; // hex color
}

export interface Activity {
  id: string;
  name: string;
  category: string; // Category.id
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  cost: number; // derived from duration in hours (can exceed 1 hour)
}

export interface UserSettings {
  bedtime: string; // e.g. "23:00"
  wakeTime: string; // e.g. "07:00"
}