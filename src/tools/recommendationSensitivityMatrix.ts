import {
  DEFAULT_SENSITIVITY_AS_OF,
  formatSensitivityTable,
  runSensitivityMatrix,
} from "./sensitivityMatrix.js";

const jsonMode = process.argv.includes("--json");

const results = runSensitivityMatrix(undefined, DEFAULT_SENSITIVITY_AS_OF);

if (jsonMode) {
  console.log(
    JSON.stringify(
      {
        asOf: DEFAULT_SENSITIVITY_AS_OF.toISOString(),
        scenarios: results,
      },
      null,
      2,
    ),
  );
} else {
  console.log("Laminar Recommendation Sensitivity Matrix");
  console.log(`asOf: ${DEFAULT_SENSITIVITY_AS_OF.toISOString()}`);
  console.log("");
  console.log(formatSensitivityTable(results.map((entry) => entry.summary)));
}
