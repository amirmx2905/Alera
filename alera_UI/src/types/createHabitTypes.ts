export type CreateHabitFormState = {
  name: string;
  description: string;
  category: string;
  unit: string;
  goalAmount: string;
  goalType: "daily" | "weekly" | "monthly";
};
