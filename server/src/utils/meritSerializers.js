function source(sourceValue) {
  return {
    officialUrl: sourceValue?.officialUrl,
    verificationStatus: sourceValue?.verificationStatus,
    lastVerifiedAt: sourceValue?.lastVerifiedAt,
  }
}

function reference(value) {
  if (!value) return null
  if (value.name) return { id: value._id?.toString(), name: value.name, code: value.code }
  return { id: value.toString() }
}

export function serializeEntryTest(document) {
  return {
    id: document._id.toString(),
    name: document.name,
    code: document.code,
    conductingBody: document.conductingBody,
    category: document.category,
    scoring: document.scoring,
    applicableQualificationCodes: document.applicableQualificationCodes,
    source: source(document.source),
    recordStatus: document.recordStatus,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  }
}

const basisByInput = {
  matric_percentage: 'matric',
  dae_percentage: 'dae',
  entry_test_percentage: 'entry_test',
}

export function serializeMeritFormula(document) {
  return {
    id: document._id.toString(),
    code: document.code,
    name: document.name,
    university: reference(document.university),
    program: reference(document.program),
    admissionCycle: reference(document.admissionCycle),
    components: document.components.map((component) => ({
      basis: basisByInput[component.inputSource],
      label: component.label,
      weightPercentage: component.weightPercentage,
      entryTest: reference(component.entryTest),
    })),
    weightedTotal: document.components.reduce((total, component) => total + component.weightPercentage, 0),
    source: source(document.source),
    recordStatus: document.recordStatus,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  }
}
