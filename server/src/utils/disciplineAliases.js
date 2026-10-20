export function normalizeDisciplineAlias(value) {
  if (typeof value !== 'string') return ''
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function programDisciplineCandidates(program) {
  return [...new Set([
    program?.disciplineCode,
    program?.name,
    program?.degreeTitle,
  ].map(normalizeDisciplineAlias).filter(Boolean))]
}
