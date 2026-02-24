export type Entry = {
  id: string;
  date: string;
  amount: number;
};

export type HabitType = "numeric" | "binary";

export type Habit = {
  id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  goalAmount: number;
  goalType: "daily" | "weekly" | "monthly";
  type: HabitType;
  entries: Entry[];
  archived?: boolean;
};

export type CreateHabitFormState = {
  name: string;
  description: string;
  category: string;
  unit: string;
  goalAmount: string;
  goalType: "daily" | "weekly" | "monthly";
  type: HabitType;
};
