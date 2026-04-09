import { useEffect, useState } from "react";
import { useAuth } from "../../../state/AuthStore";
import { checkIsSupervised } from "../../../services/supervision";

let cachedUserId: string | null = null;
let cachedResult: boolean | null = null;

export function useIsSupervised() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const cacheValid = userId !== null && userId === cachedUserId;

  const [isSupervised, setIsSupervised] = useState(
    cacheValid ? (cachedResult ?? false) : false,
  );
  const [isLoading, setIsLoading] = useState(!cacheValid);

  useEffect(() => {
    if (!userId) {
      cachedUserId = null;
      cachedResult = null;
      setIsSupervised(false);
      setIsLoading(false);
      return;
    }

    if (userId === cachedUserId && cachedResult !== null) {
      setIsSupervised(cachedResult);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    checkIsSupervised()
      .then((result) => {
        cachedUserId = userId;
        cachedResult = result;
        setIsSupervised(result);
      })
      .catch(() => {
        cachedUserId = userId;
        cachedResult = false;
        setIsSupervised(false);
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  return { isSupervised, isLoading };
}
