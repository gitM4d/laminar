export type TransactionSafetySeverity = "error" | "warning";

export type TransactionSafetyIssue = {
  code: string;
  severity: TransactionSafetySeverity;
  transactionIndex?: number;
  message: string;
};

export type TransactionSafetyValidation = {
  safe: boolean;
  errors: TransactionSafetyIssue[];
  warnings: TransactionSafetyIssue[];
  summary: {
    totalTransactions: number;
    validatedTransactions: number;
    blockedTransactions: number;
  };
};
