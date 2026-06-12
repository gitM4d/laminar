import { MockLaminarDataProvider } from "./MockLaminarDataProvider.js";
import {
  createCombinedRealProvider,
  type CreateCombinedRealProviderOptions,
} from "./createCombinedRealProvider.js";
import type { LaminarDataProvider } from "./types.js";

export type ProviderMode = "real" | "mock";

export class InvalidProviderModeError extends Error {
  readonly mode: string;

  constructor(mode: string) {
    super(
      `Invalid LAMINAR_PROVIDER_MODE "${mode}". Expected "real" or "mock".`,
    );
    this.name = "InvalidProviderModeError";
    this.mode = mode;
  }
}

export function resolveProviderMode(
  env: NodeJS.ProcessEnv = process.env,
): ProviderMode {
  const raw = env.LAMINAR_PROVIDER_MODE?.trim().toLowerCase();

  if (raw === undefined || raw === "") {
    return "real";
  }

  if (raw === "real") {
    return "real";
  }

  if (raw === "mock") {
    return "mock";
  }

  throw new InvalidProviderModeError(env.LAMINAR_PROVIDER_MODE ?? "");
}

export type BuildDefaultLaminarDataProviderOptions = {
  mode?: ProviderMode;
  env?: NodeJS.ProcessEnv;
  createCombinedRealProvider?: (
    options?: CreateCombinedRealProviderOptions,
  ) => Promise<LaminarDataProvider>;
  combinedRealProviderOptions?: CreateCombinedRealProviderOptions;
};

export async function buildDefaultLaminarDataProvider(
  options: BuildDefaultLaminarDataProviderOptions = {},
): Promise<LaminarDataProvider> {
  const env = options.env ?? process.env;
  const mode = options.mode ?? resolveProviderMode(env);

  if (mode === "mock") {
    return new MockLaminarDataProvider();
  }

  const createCombined =
    options.createCombinedRealProvider ?? createCombinedRealProvider;

  return createCombined({
    env,
    ...options.combinedRealProviderOptions,
  });
}
