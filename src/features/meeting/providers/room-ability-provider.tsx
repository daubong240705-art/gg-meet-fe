"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  AbilityProvider,
  Can as CaslCan,
  useAbility,
} from "@casl/react";

import { defineRoomAbility, type RoomAbility, type RoomAbilityInput } from "@/lib/auth/ability";

const RoomAbilityContext = createContext<RoomAbility | null>(null);

export const Can = CaslCan<RoomAbility>;

type RoomAbilityProviderProps = RoomAbilityInput & {
  children: ReactNode;
};

export function RoomAbilityProvider({
  isHost,
  canUseHostMediaControls,
  roomSettings,
  children,
}: RoomAbilityProviderProps) {
  const {
    allowParticipantShareScreen,
    allowParticipantUnmute,
  } = roomSettings;
  const ability = useMemo(
    () => defineRoomAbility({
      isHost,
      canUseHostMediaControls,
      roomSettings: {
        allowParticipantShareScreen,
        allowParticipantUnmute,
      },
    }),
    [
      isHost,
      canUseHostMediaControls,
      allowParticipantUnmute,
      allowParticipantShareScreen,
    ],
  );

  return (
    <AbilityProvider value={ability}>
      <RoomAbilityContext.Provider value={ability}>
        {children}
      </RoomAbilityContext.Provider>
    </AbilityProvider>
  );
}

export function useRoomAbility(): RoomAbility {
  const contextAbility = useContext(RoomAbilityContext);
  const ability = useAbility<RoomAbility>();

  if (!contextAbility) {
    throw new Error("useRoomAbility must be used within RoomAbilityProvider.");
  }

  return ability;
}
