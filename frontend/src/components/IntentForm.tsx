import { useState, type FormEvent } from "react";
import type { IntentInput } from "../types.js";

export type IntentFormValues = IntentInput & {
  portfolioValueUsd: number;
};

type IntentFormProps = {
  values: IntentFormValues;
  loading: boolean;
  onChange: (values: IntentFormValues) => void;
  onSubmit: (values: IntentFormValues) => void;
};

function SliderField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}: <strong>{value}</strong>
      </span>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function sanitizePortfolioDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

function normalizePortfolioDigits(digits: string): string {
  if (digits === "") {
    return "";
  }

  const normalized = digits.replace(/^0+(?=\d)/, "");
  return normalized === "" ? "0" : normalized;
}

function parsePortfolioValue(digits: string): number | null {
  const normalized = normalizePortfolioDigits(digits);
  if (normalized === "") {
    return null;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

function validatePortfolioValue(value: number | null): string | null {
  if (value === null) {
    return "Enter a portfolio value in USD.";
  }

  if (!Number.isFinite(value)) {
    return "Portfolio value must be a valid number.";
  }

  if (value <= 0) {
    return "Portfolio value must be greater than zero.";
  }

  return null;
}

export function IntentForm({
  values,
  loading,
  onChange,
  onSubmit,
}: IntentFormProps) {
  const [portfolioText, setPortfolioText] = useState(() =>
    String(values.portfolioValueUsd),
  );
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  function handlePortfolioChange(raw: string) {
    setPortfolioText(sanitizePortfolioDigits(raw));
    setPortfolioError(null);
  }

  function handlePortfolioBlur() {
    setPortfolioText((current) => normalizePortfolioDigits(current));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedText = normalizePortfolioDigits(portfolioText);
    setPortfolioText(normalizedText);

    const portfolioValueUsd = parsePortfolioValue(normalizedText);
    const validationError = validatePortfolioValue(portfolioValueUsd);

    if (validationError !== null) {
      setPortfolioError(validationError);
      return;
    }

    setPortfolioError(null);

    const submittedValues: IntentFormValues = {
      ...values,
      portfolioValueUsd: portfolioValueUsd as number,
    };

    onChange(submittedValues);
    onSubmit(submittedValues);
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Intent</h2>
      <p className="muted">
        Express risk, liquidity, and return preference. Laminar selects the
        portfolio implementation.
      </p>

      <SliderField
        label="Risk"
        value={values.risk}
        onChange={(risk) => onChange({ ...values, risk })}
      />
      <SliderField
        label="Liquidity"
        value={values.liquidity}
        onChange={(liquidity) => onChange({ ...values, liquidity })}
      />
      <SliderField
        label="Return Preference"
        value={values.returnPreference}
        onChange={(returnPreference) =>
          onChange({ ...values, returnPreference })
        }
      />

      <label className="field">
        <span className="field-label">Portfolio Value (USD)</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={portfolioText}
          onChange={(event) => handlePortfolioChange(event.target.value)}
          onBlur={handlePortfolioBlur}
          aria-invalid={portfolioError !== null}
          aria-describedby={
            portfolioError !== null ? "portfolio-value-error" : undefined
          }
        />
        {portfolioError !== null && (
          <p className="field-error" id="portfolio-value-error" role="alert">
            {portfolioError}
          </p>
        )}
      </label>

      <button type="submit" disabled={loading}>
        {loading ? "Generating..." : "Generate Recommendation"}
      </button>
    </form>
  );
}
