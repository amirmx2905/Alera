import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CreateHabitFlow } from "../../habits/components/creation/CreateHabitFlow";
import { useSupervisedHabits } from "../hooks/useSupervisedHabits";
import { useSupervisedActions } from "../hooks/useSupervisedActions";
import type { RootStackParamList } from "../../../navigation/RootNavigator";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "SupervisedCreateHabit"
>;

export function SupervisedCreateHabitScreen({ navigation, route }: Props) {
  const { profileId } = route.params;
  const {
    categories,
    isCategoriesLoading,
    refreshCategories,
    refreshHabits,
    categoryMap,
  } = useSupervisedHabits(profileId);
  const { createHabitWithGoal } = useSupervisedActions({
    profileId,
    refreshHabits,
    categoryMap,
  });

  return (
    <CreateHabitFlow
      subtitle="For supervised user"
      categories={categories}
      isCategoriesLoading={isCategoriesLoading}
      refreshCategories={refreshCategories}
      createHabitWithGoal={createHabitWithGoal}
      onSuccess={() => navigation.goBack()}
    />
  );
}
