function source(value) {
  return {
    officialUrl: value.officialUrl.trim(),
    verificationStatus: value.verificationStatus,
    ...(value.lastVerifiedAt ? { lastVerifiedAt: new Date(value.lastVerifiedAt).toISOString() } : {}),
  }
}

export function buildEntryTestPayload(value) {
  return {
    name: value.name.trim(), code: value.code.trim(), conductingBody: value.conductingBody.trim(),
    category: value.category,
    scoring: {
      resultUnit: value.resultUnit,
      ...(value.maximumScore !== '' ? { maximumScore: Number(value.maximumScore) } : {}),
      ...(value.defaultPassingScore !== '' ? { defaultPassingScore: Number(value.defaultPassingScore) } : {}),
      negativeMarking: Boolean(value.negativeMarking),
    },
    ...(value.applicableQualificationCodes.trim() ? { applicableQualificationCodes: value.applicableQualificationCodes.split(',').map((item) => item.trim()).filter(Boolean) } : {}),
    source: source(value.source), recordStatus: value.recordStatus,
  }
}

export function buildMeritFormulaPayload(value) {
  return {
    code: value.code.trim(), name: value.name.trim(), university: value.university,
    ...(value.program ? { program: value.program } : { program: null }),
    ...(value.admissionCycle ? { admissionCycle: value.admissionCycle.trim() } : { admissionCycle: null }),
    components: value.components.map((component) => ({
      basis: component.basis, label: component.label.trim(), weightPercentage: Number(component.weightPercentage),
      ...(component.basis === 'entry_test' ? { entryTest: component.entryTest } : {}),
    })),
    source: source(value.source), recordStatus: value.recordStatus,
  }
}
