import { createAaveBaseLaminarDataProviderSnapshot } from "./AaveBaseLaminarDataProvider.js";
import type { AaveBaseProviderSnapshotOptions } from "./AaveBaseLaminarDataProvider.js";
import { CombinedLaminarDataProvider } from "./CombinedLaminarDataProvider.js";
import { createFluidBaseLaminarDataProviderSnapshot } from "./FluidBaseLaminarDataProvider.js";
import type { FluidBaseProviderSnapshotOptions } from "./FluidBaseLaminarDataProvider.js";
import { createMorphoBaseLaminarDataProviderSnapshot } from "./MorphoBaseLaminarDataProvider.js";
import type { MorphoBaseProviderSnapshotOptions } from "./MorphoBaseLaminarDataProvider.js";
import { createMoonwellBaseLaminarDataProviderSnapshot } from "./MoonwellBaseLaminarDataProvider.js";
import type { MoonwellBaseProviderSnapshotOptions } from "./MoonwellBaseLaminarDataProvider.js";
import type { LaminarDataProvider } from "./types.js";

export type CreateCombinedRealProviderOptions = {
  env?: NodeJS.ProcessEnv;
  aaveSnapshotOptions?: AaveBaseProviderSnapshotOptions;
  morphoSnapshotOptions?: MorphoBaseProviderSnapshotOptions;
  moonwellSnapshotOptions?: MoonwellBaseProviderSnapshotOptions;
  fluidSnapshotOptions?: FluidBaseProviderSnapshotOptions;
  createAaveSnapshot?: typeof createAaveBaseLaminarDataProviderSnapshot;
  createMorphoSnapshot?: typeof createMorphoBaseLaminarDataProviderSnapshot;
  createMoonwellSnapshot?: typeof createMoonwellBaseLaminarDataProviderSnapshot;
  createFluidSnapshot?: typeof createFluidBaseLaminarDataProviderSnapshot;
};

/**
 * Builds CombinedLaminarDataProvider from real read-only provider snapshots.
 *
 * Always includes Aave and Morpho. Moonwell and Fluid are included only when
 * they expose at least one real-data-eligible opportunity (no static Moonwell
 * fallback).
 */
export async function createCombinedRealProvider(
  options: CreateCombinedRealProviderOptions = {},
): Promise<LaminarDataProvider> {
  const env = options.env ?? process.env;
  const createAave =
    options.createAaveSnapshot ?? createAaveBaseLaminarDataProviderSnapshot;
  const createMorpho =
    options.createMorphoSnapshot ?? createMorphoBaseLaminarDataProviderSnapshot;
  const createMoonwell =
    options.createMoonwellSnapshot ??
    createMoonwellBaseLaminarDataProviderSnapshot;
  const createFluid =
    options.createFluidSnapshot ?? createFluidBaseLaminarDataProviderSnapshot;

  const [aaveProvider, morphoProvider, moonwellProvider, fluidProvider] =
    await Promise.all([
      createAave(options.aaveSnapshotOptions ?? {}),
      createMorpho(options.morphoSnapshotOptions ?? {}),
      createMoonwell({
        requireRealData: true,
        ...options.moonwellSnapshotOptions,
      }),
      createFluid({
        disableApi: env.FLUID_BASE_API_URL === "",
        ...options.fluidSnapshotOptions,
      }),
    ]);

  const subProviders: LaminarDataProvider[] = [aaveProvider, morphoProvider];

  if (moonwellProvider.discoverOpportunities().length > 0) {
    subProviders.push(moonwellProvider);
  }

  if (fluidProvider.discoverOpportunities().length > 0) {
    subProviders.push(fluidProvider);
  }

  return new CombinedLaminarDataProvider(subProviders);
}
