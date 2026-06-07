import apiErrorResponseSchemaJson from "./apiErrorResponse.schema.json" with { type: "json" };
import healthResponseSchemaJson from "./healthResponse.schema.json" with { type: "json" };
import recommendationRequestSchemaJson from "./recommendationRequest.schema.json" with { type: "json" };
import recommendationResponseSchemaJson from "./recommendationResponse.schema.json" with { type: "json" };

function withoutSchemaMeta<T extends Record<string, unknown>>(
  schema: T,
): Omit<T, "$schema"> {
  const { $schema: _schema, ...rest } = schema;
  return rest;
}

export const healthResponseSchema = withoutSchemaMeta(healthResponseSchemaJson);
export const recommendationRequestSchema = withoutSchemaMeta(
  recommendationRequestSchemaJson,
);
export const recommendationResponseSchema = withoutSchemaMeta(
  recommendationResponseSchemaJson,
);
export const apiErrorResponseSchema = withoutSchemaMeta(
  apiErrorResponseSchemaJson,
);
