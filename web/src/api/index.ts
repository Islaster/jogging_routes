import { createFixtureApi } from "./fixture";
import { createHttpApi } from "./http";
import type { PlannerApi } from "./types";

export const plannerApi: PlannerApi =
  import.meta.env.VITE_USE_FIXTURES === "true"
    ? createFixtureApi()
    : createHttpApi();

export * from "./types";
