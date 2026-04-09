import React, { createContext, useContext, useMemo } from "react";

type SupervisedProfileValue = {
  profileId: string;
  firstName: string;
  lastName: string;
  fullName: string;
};

const SupervisedProfileContext =
  createContext<SupervisedProfileValue | null>(null);

type ProviderProps = {
  profileId: string;
  firstName: string;
  lastName: string;
  children: React.ReactNode;
};

export function SupervisedProfileProvider({
  profileId,
  firstName,
  lastName,
  children,
}: ProviderProps) {
  const value = useMemo<SupervisedProfileValue>(
    () => ({
      profileId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim() || "User",
    }),
    [profileId, firstName, lastName],
  );

  return (
    <SupervisedProfileContext.Provider value={value}>
      {children}
    </SupervisedProfileContext.Provider>
  );
}

export function useSupervisedProfile(): SupervisedProfileValue | null {
  return useContext(SupervisedProfileContext);
}
