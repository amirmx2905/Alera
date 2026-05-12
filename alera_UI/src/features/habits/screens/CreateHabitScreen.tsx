import React from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CreateHabitFlow } from "../components/creation/CreateHabitFlow";
import type { RootStackParamList } from "../../../navigation/RootNavigator";
import { useHabits } from "../../../state/HabitsStore";

type Props = NativeStackScreenProps<RootStackParamList, "CreateHabit">;

export function CreateHabitScreen({ navigation }: Props) {
  const {
    createHabitWithGoal,
    categories,
    isCategoriesLoading,
    refreshCategories,
  } = useHabits();

  return (
    <CreateHabitFlow
      subtitle="Set up a new habit"
      categories={categories}
      isCategoriesLoading={isCategoriesLoading}
      refreshCategories={refreshCategories}
      createHabitWithGoal={createHabitWithGoal}
      onSuccess={() => navigation.goBack()}
    />
  );
}
