export type Entry = {
  id: string;
  date: string;
  amount: number;
};

export type Habit = {
  id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  goalAmount: number;
  goalType: "daily" | "weekly" | "monthly";
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
};
