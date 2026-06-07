import { ROUNDING_DECIMALS } from "./constructionConfig.js";

export type WeightEntry = {
  id: string;
  weight: number;
};

export function roundWeightsLargestRemainder(
  entries: WeightEntry[],
): Map<string, number> {
  if (entries.length === 0) {
    return new Map();
  }

  const factor = 10 ** ROUNDING_DECIMALS;
  const targetTotal = 1;

  const floored = entries.map((entry) => {
    const scaled = entry.weight * factor;
    const floor = Math.floor(scaled + 1e-12);
    const remainder = scaled - floor;
    return {
      id: entry.id,
      floor,
      remainder,
    };
  });

  const floorSum = floored.reduce((sum, entry) => sum + entry.floor, 0);
  let unitsToDistribute = Math.round(targetTotal * factor) - floorSum;

  const sorted = [...floored].sort((left, right) => {
    if (right.remainder !== left.remainder) {
      return right.remainder - left.remainder;
    }

    return left.id.localeCompare(right.id);
  });

  const finalUnits = new Map<string, number>(
    floored.map((entry) => [entry.id, entry.floor]),
  );

  let index = 0;
  while (unitsToDistribute > 0) {
    const entry = sorted[index % sorted.length];
    if (entry === undefined) {
      break;
    }
    finalUnits.set(entry.id, (finalUnits.get(entry.id) ?? 0) + 1);
    unitsToDistribute -= 1;
    index += 1;
  }

  return new Map(
    [...finalUnits.entries()].map(([id, units]) => [id, units / factor]),
  );
}
