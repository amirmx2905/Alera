import { supabase } from "../../../services/supabase";
export type HabitCategory = {
  id: string;
  name: string;
  created_at: string;
};

export async function listHabitCategories() {
  const { data, error } = await supabase
    .from("habit_categories")
    .select("id, name, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as HabitCategory[];
}
