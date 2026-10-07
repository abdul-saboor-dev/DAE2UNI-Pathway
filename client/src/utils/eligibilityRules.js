const list = (value) => String(value || '').split(/[,\n]/).map((item) => item.trim()).filter(Boolean)
const optionalNumber = (value) => value === '' || value == null ? null : Number(value)

export const emptyQualificationCriterion = () => ({
  qualificationType: 'DAE',
  technologyCodes: 'CIT',
  minimumPercentage: '',
  minimumPassingYear: '',
  acceptedBoards: '',
  requiredSubjects: '',
  equivalenceRequired: false,
  explanation: '',
})

export const emptyEntryTestRequirement = () => ({
  entryTest: '', required: true, minimumScore: '', minimumPercentage: '', explanation: '',
})

export function buildEligibilityRulePayload(values) {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    university: values.university,
    program: values.scope === 'program' ? values.program || null : null,
    admissionCycle: values.admissionCycle || null,
    eligibilityResearch: values.eligibilityResearch || null,
    scope: values.scope,
    qualificationMatchLogic: values.qualificationMatchLogic,
    qualificationCriteria: values.qualificationCriteria.map((item) => ({
      qualificationType: 'DAE',
      technologyCodes: list(item.technologyCodes).map((value) => value.toUpperCase()),
      minimumPercentage: optionalNumber(item.minimumPercentage),
      minimumPassingYear: optionalNumber(item.minimumPassingYear),
      acceptedBoards: list(item.acceptedBoards),
      requiredSubjects: list(item.requiredSubjects),
      equivalenceRequired: Boolean(item.equivalenceRequired),
      explanation: item.explanation.trim(),
    })),
    domicile: {
      allowedProvinces: list(values.domicile.allowedProvinces),
      allowedDistricts: list(values.domicile.allowedDistricts),
      required: Boolean(values.domicile.required),
      explanation: values.domicile.explanation.trim(),
    },
    entryTestRequirements: values.entryTestRequirements.map((item) => ({
      entryTest: item.entryTest,
      required: Boolean(item.required),
      minimumScore: optionalNumber(item.minimumScore),
      minimumPercentage: optionalNumber(item.minimumPercentage),
      explanation: item.explanation.trim(),
    })),
    effectiveFrom: values.effectiveFrom || null,
    effectiveUntil: values.effectiveUntil || null,
    priority: Number(values.priority || 0),
    officialSourceUrl: values.officialSourceUrl.trim(),
  }
}

export function summarizeEligibilityRule(rule) {
  const criteria = rule.qualificationCriteria || []
  const parts = criteria.map((item) => {
    const technologies = item.technologyCodes?.join(', ') || 'DAE technology'
    const minimum = item.minimumPercentage == null ? 'minimum marks unresolved' : `minimum ${item.minimumPercentage}%`
    return `${technologies}: ${minimum}`
  })
  if (rule.domicile?.required) parts.push(`domicile: ${(rule.domicile.allowedProvinces || []).join(', ')}`)
  const tests = rule.entryTestRequirements || []
  if (tests.length) parts.push(`${tests.length} entry-test requirement${tests.length === 1 ? '' : 's'}`)
  return parts.join(' · ') || 'Criteria summary unavailable'
}
