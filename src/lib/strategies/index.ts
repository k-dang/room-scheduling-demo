import { advisory } from "./advisory";
import { excludeConstraint } from "./exclude";
import { forUpdate } from "./for-update";
import { naive } from "./naive";
import { readCommitted } from "./read-committed";
import { serializable } from "./serializable";
import type { Strategy, StrategyId } from "./types";

export const strategies: Record<StrategyId, Strategy> = {
  naive,
  "read-committed": readCommitted,
  "for-update": forUpdate,
  serializable,
  exclude: excludeConstraint,
  advisory,
};
