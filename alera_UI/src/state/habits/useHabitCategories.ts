import { useCallback, useEffect, useState } from "react";
import { listHabitCategories } from "../../features/habits/services/habitCategories";
import { buildCategoryState } from "./habits.helpers";
import type { HabitCategory } from "./habits.types";

export function useHabitCategories() {
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);

  const refreshCategories = useCallback(async () => {
    const rawCategories = await listHabitCategories();
    const { nextCategories, nextMap } = buildCategoryState(rawCategories);
    setCategories(nextCategories);
    setCategoryMap(nextMap);
    return { nextCategories, nextMap };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsCategoriesLoading(true);

    refreshCategories()
      .catch(() => {
        if (!isMounted) return;
        setCategories([]);
        setCategoryMap({});
      })
      .finally(() => {
        if (!isMounted) return;
        setIsCategoriesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshCategories]);

  return {
    categories,
    categoryMap,
    isCategoriesLoading,
    setCategories,
    setCategoryMap,
    refreshCategories,
  };
}
