import React, { useRef, useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Alert, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainLayout } from "../../layouts/MainLayout";
import { PrimaryButton } from "../../components/shared/PrimaryButton";
import { HabitDetailActions } from "../../components/habits/details/HabitDetailActions";
import { HabitEntryForm } from "../../components/habits/details/HabitEntryForm";
import { HabitEntryHistory } from "../../components/habits/details/HabitEntryHistory";
import { HabitProgressCard } from "../../components/habits/details/HabitProgressCard";
import type { HabitsStackParamList } from "../../navigation/HabitsStack";
import { useHabits } from "../../state/HabitsContext";
import { useHabitDetail } from "../../composables/habits/useHabitDetail";
import { getProgressData } from "../../composables/habits/useHabitProgress";

type Props = NativeStackScreenProps<HabitsStackParamList, "HabitDetail">;

export function HabitDetailScreen({ navigation, route }: Props) {
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
  const primaryScale = useRef(new Animated.Value(1)).current;
  const isMounted = useRef(true);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const animatePrimaryButton = useCallback(
    (toValue: number) => {
      Animated.spring(primaryScale, {
        toValue,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    },
    [primaryScale],
  );

  const {
    entryState,
    setEntryState,
    entries,
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
      .catch((error) => {
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Unable to update habit status.",
        );
      })
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
              .catch((error) => {
                Alert.alert(
                  "Error",
                  error instanceof Error
                    ? error.message
                    : "Unable to delete habit.",
                );
              })
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
            onPressIn={() => animatePrimaryButton(0.96)}
            onPressOut={() => animatePrimaryButton(1)}
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
          className="h-10 w-[50px] items-center justify-center rounded-xl border border-white/10 bg-white/5"
        >
          <Ionicons name="chevron-back" size={18} color="#e2e8f0" />
        </Pressable>
      }
    >
      <View className="gap-5 pb-10">
        <HabitDetailActions
          archived={habit.archived}
          isArchiveLoading={isArchiveLoading}
          isDeleteLoading={isDeleteLoading}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />

        <HabitProgressCard
          progress={progress}
          currentAmount={currentAmount}
          goalAmount={habit.goalAmount}
          unit={habit.unit}
          goalType={habit.goalType}
        />

        <HabitEntryForm
          amount={entryState.amount}
          editingEntry={entryState.editingEntry}
          unit={habit.unit}
          isFuture={isFuture}
          isSaving={isEntrySaving}
          scaleAnim={primaryScale}
          onChangeAmount={(value) =>
            setEntryState((prev) => ({ ...prev, amount: value }))
          }
          onCancelEdit={() => setEntryState({ amount: "", editingEntry: null })}
          onAddEntry={async () => {
            try {
              await handleAddEntry();
            } catch (error) {
              Alert.alert(
                "Error",
                error instanceof Error ? error.message : "Unable to add entry.",
              );
            }
          }}
          onUpdateEntry={async () => {
            try {
              await handleUpdateEntry();
            } catch (error) {
              Alert.alert(
                "Error",
                error instanceof Error
                  ? error.message
                  : "Unable to update entry.",
              );
            }
          }}
          onPressIn={() => animatePrimaryButton(0.96)}
          onPressOut={() => animatePrimaryButton(1)}
        />

        <HabitEntryHistory
          selectedDate={selectedDate}
          isToday={isToday}
          canGoPrevious={canGoPrevious}
          showDatePicker={showDatePicker}
          minDate={minDate}
          entries={entriesForSelectedDate}
          unit={habit.unit}
          isLogsLoading={isLogsLoading}
          deletingEntryId={deletingEntryId}
          onShowDatePicker={setShowDatePicker}
          onPreviousDay={goToPreviousDay}
          onNextDay={goToNextDay}
          onToday={goToToday}
          onDateChange={handleDateChange}
          onEditEntry={handleEditEntry}
          onDeleteEntry={async (entryId) => {
            try {
              await handleDeleteEntry(entryId);
            } catch (error) {
              Alert.alert(
                "Error",
                error instanceof Error
                  ? error.message
                  : "Unable to delete entry.",
              );
            }
          }}
        />
      </View>
    </MainLayout>
  );
}
