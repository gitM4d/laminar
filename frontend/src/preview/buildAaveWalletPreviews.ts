import { AaveExecutionAdapter } from "@laminar/execution-adapters/aave/AaveExecutionAdapter.js";
import {
  formatAaveSupplyIntentLabel,
  selectAaveSupplyIntents,
} from "@laminar/execution-adapters/preview/walletPreviewHelpers.js";
import { validateTransactionPlan } from "@laminar/execution-adapters/safety/validateTransactionPlan.js";
import type {
  EncodedTransactionRequest,
  TransactionRequestPlan,
} from "@laminar/execution-adapters/types.js";
import type { ExecutionIntent } from "@laminar/core/execution/types.js";
import type { TransactionSafetyValidation } from "@laminar/execution-adapters/safety/types.js";

export type AaveWalletIntentPreview = {
  intentLabel: string;
  intent: ExecutionIntent;
  plan: TransactionRequestPlan;
  safety: TransactionSafetyValidation;
  encodedTransactions: EncodedTransactionRequest[];
};

export async function buildAaveWalletPreviews(
  intents: ExecutionIntent[] | undefined,
  userAddress: string,
): Promise<AaveWalletIntentPreview[]> {
  const aaveSupplyIntents = selectAaveSupplyIntents(intents);

  if (aaveSupplyIntents.length === 0) {
    return [];
  }

  const adapter = new AaveExecutionAdapter({
    encodeCalldata: true,
    userAddress,
  });

  const previews: AaveWalletIntentPreview[] = [];

  for (const intent of aaveSupplyIntents) {
    const plan = await adapter.buildTransactions(intent);
    const safety = validateTransactionPlan(plan);

    previews.push({
      intent,
      intentLabel: formatAaveSupplyIntentLabel(intent),
      plan,
      safety,
      encodedTransactions: plan.encodedTransactions ?? [],
    });
  }

  return previews;
}
