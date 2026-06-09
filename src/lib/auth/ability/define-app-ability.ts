import { AbilityBuilder, createMongoAbility } from "@casl/ability";

import type { AppAbility } from "./types";

export function defineAppAbility(role: Role | null): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (role === "ADMIN") {
    can("manage", "all");
  } else if (role === "USER") {
    can("read", "User");
  }

  return build();
}
