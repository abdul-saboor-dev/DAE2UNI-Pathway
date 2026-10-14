export function buildMeritCalculationPayload(formulaId, scores) {
  return {
    formulaId,
    entryTestScores: Object.entries(scores).map(([entryTestId, obtainedMarks]) => ({
      entryTestId,
      obtainedMarks: Number(obtainedMarks),
    })),
  }
}
