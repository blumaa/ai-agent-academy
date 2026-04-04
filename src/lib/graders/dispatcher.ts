import type { CriterionContext, GraderResult } from "./types";
import { automatedGrader } from "./automated";
import { modelGrader } from "./model";

export async function dispatchGrader(
  criterion: CriterionContext,
): Promise<GraderResult | null> {
  switch (criterion.graderType) {
    case "automated":
      return automatedGrader(criterion);
    case "model":
      return modelGrader(criterion);
    case "human":
      return null; // Human scores are entered manually via the UI
  }
}
