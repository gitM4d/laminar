import { AaveExecutionAdapter, validateTransactionPlan } from "@laminar/frontend-safe";
import {
  formatAaveSupplyIntentLabel,
  selectAaveSupplyIntents,
} from "@laminar/frontend-safe";
import type {
  EncodedTransactionRequest,
  ExecutionIntent,
  TransactionRequestPlan,
  TransactionSafetyValidation,
} from "@laminar/frontend-safe";

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
