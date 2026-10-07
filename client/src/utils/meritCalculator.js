export const emptyTemporaryDaeMarks = {
  year1TotalMarks: '', year1ObtainedMarks: '',
  year2TotalMarks: '', year2ObtainedMarks: '',
  year3TotalMarks: '', year3ObtainedMarks: '',
}

export function profileDaeToTemporaryMarks(profile) {
  const value = { ...emptyTemporaryDaeMarks }
  for (const year of [1, 2, 3]) {
    value[`year${year}TotalMarks`] = profile?.dae?.[`year${year}`]?.totalMarks?.toString() ?? ''
    value[`year${year}ObtainedMarks`] = profile?.dae?.[`year${year}`]?.obtainedMarks?.toString() ?? ''
  }
  return value
}

export function validateTemporaryDaeMarks(marks) {
  const errors = {}
  for (const year of [1, 2, 3]) {
    const totalKey = `year${year}TotalMarks`, obtainedKey = `year${year}ObtainedMarks`
    const totalText = String(marks[totalKey] ?? '').trim()
    const obtainedText = String(marks[obtainedKey] ?? '').trim()
    if (year === 3 && !totalText && !obtainedText) continue
    if (!totalText || !obtainedText) {
      errors[totalKey] = `Enter both Year ${year} marks.`
      errors[obtainedKey] = `Enter both Year ${year} marks.`
      continue
    }
    const total = Number(totalText), obtained = Number(obtainedText)
    if (!Number.isFinite(total) || total <= 0) errors[totalKey] = `Year ${year} total must be greater than zero.`
    if (!Number.isFinite(obtained) || obtained < 0 || obtained > total) errors[obtainedKey] = `Year ${year} obtained marks must be between 0 and the total.`
  }
  return errors
}

export function buildMeritCalculationPayload(formulaId, scores, marks, needsDae = false) {
  return {
    formulaId,
    entryTestScores: Object.entries(scores).map(([entryTestId, obtainedMarks]) => ({
      entryTestId,
      obtainedMarks: Number(obtainedMarks),
    })),
    ...(needsDae ? { daeMarks: {
      year1: { totalMarks: Number(marks.year1TotalMarks), obtainedMarks: Number(marks.year1ObtainedMarks) },
      year2: { totalMarks: Number(marks.year2TotalMarks), obtainedMarks: Number(marks.year2ObtainedMarks) },
      ...(String(marks.year3TotalMarks ?? '').trim() && String(marks.year3ObtainedMarks ?? '').trim()
        ? { year3: { totalMarks: Number(marks.year3TotalMarks), obtainedMarks: Number(marks.year3ObtainedMarks) } }
        : {}),
    } } : {}),
  }
}
