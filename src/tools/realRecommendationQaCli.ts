import "dotenv/config";
import {
  formatQaReportText,
  getQaReportExitCode,
  runRealRecommendationQa,
} from "./realRecommendationQa.js";

async function main(): Promise<void> {
  const jsonMode = process.argv.includes("--json");
  const report = await runRealRecommendationQa();

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatQaReportText(report));
  }

  process.exit(getQaReportExitCode(report));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
