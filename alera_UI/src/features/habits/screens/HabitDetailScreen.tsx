import React, { useRef, useEffect, useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainLayout } from "../../../layouts/MainLayout";
import { PrimaryButton } from "../../../components/shared/PrimaryButton";
import { HabitDetailActions } from "../components/details/HabitDetailActions";
import { HabitEntryForm } from "../components/details/HabitEntryForm";
import { HabitEntryHistory } from "../components/details/HabitEntryHistory";
import { HabitProgressCard } from "../components/details/HabitProgressCard";
import type { HabitsStackParamList } from "../../../navigation/HabitsStack";
import type { RootStackParamList } from "../../../navigation/RootNavigator";
import { usePressScale } from "../../../hooks/usePressScale";
import { useHabits } from "../../../state/HabitsContext";
import { useHabitDetail } from "../hooks/useHabitDetail";
import { getProgressData } from "../utils/habitProgress";

type HabitDetailRoute = RouteProp<
  HabitsStackParamList & RootStackParamList,
  "HabitDetail"
>;
type HabitDetailNavigation = NativeStackNavigationProp<
  HabitsStackParamList & RootStackParamList,
  "HabitDetail"
>;

export function HabitDetailScreen() {
  const navigation = useNavigation<HabitDetailNavigation>();
  const route = useRoute<HabitDetailRoute>();
  const { habitId } = route.params;
  const {
    habits,
    addEntry,
    updateEntry,
    deleteEntry,
    toggleArchive,
    removeHabit,
  } = useHabits();
  const habit = habits.find((item) => item.id === habitId);
  const isMounted = useRef(true);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const {
    scale: primaryScale,
    onPressIn: onPrimaryPressIn,
    onPressOut: onPrimaryPressOut,
  } = usePressScale();

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const showActionError = (fallback: string, error: unknown) => {
    Alert.alert("Error", error instanceof Error ? error.message : fallback);
  };

  const {
    entryState,
    setEntryState,
    entries,
    hasEntryForSelectedDate,
    selectedDate,
    isToday,
    isFuture,
    canGoPrevious,
    showDatePicker,
    setShowDatePicker,
    minDate,
    isLogsLoading,
    entriesForSelectedDate,
    isEntrySaving,
    deletingEntryId,
    lastTouchedEntry,
    handleAddEntry,
    handleUpdateEntry,
    handleEditEntry,
    handleDeleteEntry,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    handleDateChange,
  } = useHabitDetail({
    habit,
    addEntry,
    updateEntry,
    deleteEntry,
  });

  const handleArchive = () => {
    if (!habit || isArchiveLoading || isDeleteLoading) return;
    setIsArchiveLoading(true);
    toggleArchive(habit.id)
      .then(() => navigation.goBack())
      .catch((error) =>
        showActionError("Unable to update habit status.", error),
      )
      .finally(() => {
        if (isMounted.current) {
          setIsArchiveLoading(false);
        }
      });
  };

  const handleDelete = () => {
    if (!habit || isArchiveLoading || isDeleteLoading) return;
    Alert.alert(
      "Delete habit",
      `Are you sure you want to delete "${habit.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setIsDeleteLoading(true);
            removeHabit(habit.id)
              .then(() => navigation.goBack())
              .catch((error) =>
                showActionError("Unable to delete habit.", error),
              )
              .finally(() => {
                if (isMounted.current) {
                  setIsDeleteLoading(false);
                }
              });
          },
        },
      ],
    );
  };

  if (!habit) {
    return (
      <MainLayout
        title="Habit"
        subtitle="Habit not found"
        headerVariant="icon"
        headerIconName="leaf-outline"
        showBackground={false}
      >
        <View className="rounded-3xl border border-white/10 bg-white/5 p-8 items-center">
          <Text className="text-white text-lg font-semibold mb-4">
            Habit not found
          </Text>
          <PrimaryButton
            label="Back to habits"
            isLoading={false}
            onPress={() => navigation.goBack()}
            onPressIn={onPrimaryPressIn}
            onPressOut={onPrimaryPressOut}
            scaleAnim={primaryScale}
            containerClassName="w-full"
          />
        </View>
      </MainLayout>
    );
  }

  const { progress, currentAmount } = getProgressData({
    entries,
    goalAmount: habit.goalAmount,
    goalType: habit.goalType,
  });
  const isArchived = habit.archived;
  const isLocked = isArchiveLoading || isDeleteLoading;
  const isBinary = habit.type === "binary";
  const progressUnitLabel = isBinary ? "days" : habit.unit;
  const entryUnitLabel = habit.unit;

  return (
    <MainLayout
      title={habit.name}
      subtitle={habit.category}
      headerVariant="icon"
      headerIconName="leaf-outline"
      showBackground={false}
      scrollable
      contentClassName="flex-1 px-6 pt-16"
      headerRight={
        <Pressable
          onPress={() => navigation.goBack()}
          disabled={isLocked}
          className="h-10 w-[50px] items-center justify-center rounded-xl border border-white/10 bg-white/5"
          style={{ opacity: isLocked ? 0.5 : 1 }}
        >
          <Ionicons name="chevron-back" size={18} color="#e2e8f0" />
        </Pressable>
      }
    >
      <View className="gap-5 pb-10">
        <View
          className={`${isLocked ? "opacity-60" : ""} gap-5`}
          pointerEvents={isLocked ? "none" : "auto"}
        >
          <HabitProgressCard
            progress={progress}
            currentAmount={currentAmount}
            goalAmount={habit.goalAmount}
            unit={progressUnitLabel}
            goalType={habit.goalType}
            habitType={habit.type}
          />

          {!isArchived ? (
            <HabitEntryForm
              amount={entryState.amount}
              editingEntry={entryState.editingEntry}
              unit={entryUnitLabel}
              habitType={habit.type}
              hasEntryForDate={hasEntryForSelectedDate}
              isFuture={isFuture}
              isSaving={isEntrySaving}
              isReadOnly={isLocked}
              scaleAnim={primaryScale}
              onChangeAmount={(value) =>
                setEntryState((prev) => ({ ...prev, amount: value }))
              }
              onCancelEdit={() =>
                setEntryState({ amount: "", editingEntry: null })
              }
              onAddEntry={async () => {
                try {
                  await handleAddEntry();
                } catch (error) {
                  showActionError("Unable to add entry.", error);
                }
              }}
              onUpdateEntry={async () => {
                try {
                  await handleUpdateEntry();
                } catch (error) {
                  showActionError("Unable to update entry.", error);
                }
              }}
              onPressIn={onPrimaryPressIn}
              onPressOut={onPrimaryPressOut}
            />
          ) : null}

          <HabitEntryHistory
            selectedDate={selectedDate}
            isToday={isToday}
            canGoPrevious={canGoPrevious}
            showDatePicker={showDatePicker}
            minDate={minDate}
            entries={entriesForSelectedDate}
            unit={entryUnitLabel}
            habitType={habit.type}
            isLogsLoading={isLogsLoading}
            showActions={!isArchived && !isLocked}
            deletingEntryId={deletingEntryId}
            highlightEntry={lastTouchedEntry}
            onShowDatePicker={setShowDatePicker}
            onPreviousDay={goToPreviousDay}
            onNextDay={goToNextDay}
            onToday={goToToday}
            onDateChange={handleDateChange}
            onEditEntry={isBinary ? undefined : handleEditEntry}
            onDeleteEntry={async (entryId) => {
              Alert.alert(
                "Delete entry",
                "Are you sure you want to delete this entry?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        await handleDeleteEntry(entryId);
                      } catch (error) {
                        showActionError("Unable to delete entry.", error);
                      }
                    },
                  },
                ],
              );
            }}
          />
        </View>

        <HabitDetailActions
          archived={Boolean(habit.archived)}
          isArchiveLoading={isArchiveLoading}
          isDeleteLoading={isDeleteLoading}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      </View>
    </MainLayout>
  );
}
