export function universityMonogram(university) {
  const abbreviation = typeof university?.abbreviation === 'string' ? university.abbreviation.trim() : ''
  if (abbreviation) return abbreviation.slice(0, 5).toUpperCase()
  const words = typeof university?.name === 'string' ? university.name.match(/[\p{L}\p{N}]+/gu) || [] : []
  const meaningfulWords = words.filter((word) => !['of', 'the', 'and'].includes(word.toLowerCase()))
  return meaningfulWords.slice(0, 3).map((word) => word[0].toUpperCase()).join('') || 'U'
}
