export function buildEligibilityResearchPayload(values) {
  return {
    university: values.university,
    program: values.program,
    ...(values.admissionCycle ? { admissionCycle: values.admissionCycle } : { admissionCycle: null }),
    researchStatus: values.researchStatus,
    officialSourceUrl: values.officialSourceUrl.trim(),
    sourceTitle: values.sourceTitle.trim(),
    reviewedDate: values.reviewedDate,
    evidenceNotes: values.evidenceNotes.trim(),
    unresolvedItems: Array.isArray(values.unresolvedItems)
      ? values.unresolvedItems.map((item) => item.trim()).filter(Boolean)
      : String(values.unresolvedItems || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
  }
}
