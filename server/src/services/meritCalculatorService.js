import EntryTest from '../models/EntryTest.js'
import MeritFormula from '../models/MeritFormula.js'
import Program from '../models/Program.js'
import StudentProfile from '../models/StudentProfile.js'
import University from '../models/University.js'
import ApiError from '../utils/ApiError.js'

const supportedInputs = new Set(['matric_percentage', 'dae_percentage', 'entry_test_percentage'])
const verifiedPublished = { recordStatus: 'published', 'source.verificationStatus': 'verified' }

function id(value) {
  return value?.toString()
}

function validMarks(marks) {
  return Number.isFinite(marks?.obtainedMarks) && Number.isFinite(marks?.totalMarks) &&
    marks.totalMarks > 0 && marks.obtainedMarks >= 0 && marks.obtainedMarks <= marks.totalMarks
}

function rawPercentage(marks) {
  return (marks.obtainedMarks / marks.totalMarks) * 100
}

function daeCalculation(marks) {
  if (!marks || !validMarks(marks.year1) || !validMarks(marks.year2) ||
    (marks.year3 !== undefined && !validMarks(marks.year3))) return null
  const years = marks.year3 ? [marks.year1, marks.year2, marks.year3] : [marks.year1, marks.year2]
  const obtained = years.reduce((sum, year) => sum + year.obtainedMarks, 0)
  const total = years.reduce((sum, year) => sum + year.totalMarks, 0)
  return { percentage: (obtained / total) * 100, status: marks.year3 ? 'final' : 'provisional' }
}

function roundForDisplay(value) {
  return Number(value.toFixed(2))
}

function validComponents(components) {
  if (!Array.isArray(components) || components.length === 0) return false
  const inputs = components.map((component) => component.inputSource)
  if (new Set(inputs).size !== inputs.length) return false
  if (components.some((component) =>
    !supportedInputs.has(component.inputSource) ||
    component.operation !== 'weighted_percentage' ||
    !Number.isFinite(component.weightPercentage) ||
    component.weightPercentage < 0 ||
    component.weightPercentage > 100 ||
    (component.inputSource === 'entry_test_percentage' && !component.entryTest)
  )) return false
  const total = components.reduce((sum, component) => sum + component.weightPercentage, 0)
  return Math.abs(total - 100) <= 0.0001
}

function serializeOption(formula, university, program, tests) {
  return {
    id: id(formula._id),
    name: formula.name,
    code: formula.code,
    university: { id: id(university._id), name: university.name },
    program: program ? { id: id(program._id), name: program.name } : null,
    components: formula.components.map((component) => ({
      basis: component.inputSource.replace('_percentage', ''),
      label: component.label,
      weightPercentage: component.weightPercentage,
      entryTest: component.entryTest ? {
        id: id(component.entryTest),
        name: tests.get(id(component.entryTest)).name,
        code: tests.get(id(component.entryTest)).code,
        maximumMarks: tests.get(id(component.entryTest)).scoring.maximumScore,
      } : null,
    })),
  }
}

export async function getAvailableMeritFormulas() {
  const formulas = await MeritFormula.find(verifiedPublished)
    .select('code name university program components')
    .sort({ name: 1, _id: 1 })
    .lean()
  if (!formulas.length) return []

  const universityIds = [...new Set(formulas.map((formula) => id(formula.university)))]
  const programIds = [...new Set(formulas.map((formula) => id(formula.program)).filter(Boolean))]
  const testIds = [...new Set(formulas.flatMap((formula) => formula.components.map((component) => id(component.entryTest)).filter(Boolean)))]
  const [universities, programs, entryTests] = await Promise.all([
    University.find({ _id: { $in: universityIds }, ...verifiedPublished }).select('name').lean(),
    Program.find({ _id: { $in: programIds }, ...verifiedPublished }).select('name university').lean(),
    EntryTest.find({ _id: { $in: testIds }, ...verifiedPublished, 'scoring.maximumScore': { $gt: 0 } })
      .select('name code scoring.maximumScore').lean(),
  ])
  const universityMap = new Map(universities.map((item) => [id(item._id), item]))
  const programMap = new Map(programs.map((item) => [id(item._id), item]))
  const testMap = new Map(entryTests.filter((item) => Number.isFinite(item.scoring?.maximumScore))
    .map((item) => [id(item._id), item]))

  return formulas.flatMap((formula) => {
    if (!validComponents(formula.components)) return []
    const university = universityMap.get(id(formula.university))
    if (!university) return []
    const program = formula.program ? programMap.get(id(formula.program)) : null
    if (formula.program && (!program || id(program.university) !== id(formula.university))) return []
    const requiredTestIds = formula.components
      .filter((component) => component.inputSource === 'entry_test_percentage')
      .map((component) => id(component.entryTest))
    if (requiredTestIds.some((testId) => !testMap.has(testId))) return []
    return [serializeOption(formula, university, program, testMap)]
  })
}

export async function calculateStudentMerit(userId, input) {
  const [profile, options] = await Promise.all([
    StudentProfile.findOne({ user: userId }).select('matric.marks').lean(),
    getAvailableMeritFormulas(),
  ])
  const formula = options.find((item) => item.id === input.formulaId)
  if (!formula) throw new ApiError(404, 'The selected merit formula is not available.', 'MERIT_FORMULA_UNAVAILABLE')
  if (formula.components.some((component) => component.basis === 'matric') && !validMarks(profile?.matric?.marks)) {
    throw new ApiError(409, 'Complete your saved Matric marks before calculating merit.', 'PROFILE_MARKS_REQUIRED')
  }
  const dae = formula.components.some((component) => component.basis === 'dae')
    ? daeCalculation(input.daeMarks) : null
  if (formula.components.some((component) => component.basis === 'dae') && !dae) {
    throw new ApiError(400, 'Enter valid DAE Year 1 and Year 2 marks, with a complete Year 3 pair if available.', 'DAE_MARKS_REQUIRED')
  }
  if (!dae && input.daeMarks) {
    throw new ApiError(400, 'DAE marks are not required by the selected formula.', 'DAE_MARKS_UNEXPECTED')
  }

  const requiredTests = formula.components.filter((component) => component.entryTest)
  const submittedScores = new Map(input.entryTestScores.map((item) => [item.entryTestId, item.obtainedMarks]))
  if (submittedScores.size !== requiredTests.length || requiredTests.some((component) => !submittedScores.has(component.entryTest.id))) {
    throw new ApiError(400, 'Submit one score for every required entry test.', 'ENTRY_TEST_SCORES_INVALID')
  }
  for (const submittedId of submittedScores.keys()) {
    if (!requiredTests.some((component) => component.entryTest.id === submittedId)) {
      throw new ApiError(400, 'Only scores required by the selected formula may be submitted.', 'ENTRY_TEST_SCORES_INVALID')
    }
  }

  let aggregate = 0
  const breakdown = formula.components.map((component) => {
    let percentage
    if (component.basis === 'matric') percentage = rawPercentage(profile.matric.marks)
    else if (component.basis === 'dae') percentage = dae.percentage
    else {
      const obtained = submittedScores.get(component.entryTest.id)
      if (!Number.isFinite(obtained) || obtained < 0 || obtained > component.entryTest.maximumMarks) {
        throw new ApiError(400, `Enter a score from 0 to ${component.entryTest.maximumMarks} for ${component.entryTest.name}.`, 'ENTRY_TEST_SCORE_OUT_OF_RANGE')
      }
      percentage = (obtained / component.entryTest.maximumMarks) * 100
    }
    const contribution = percentage * (component.weightPercentage / 100)
    aggregate += contribution
    return {
      label: component.label,
      basis: component.basis,
      percentage: roundForDisplay(percentage),
      weightPercentage: component.weightPercentage,
      contribution: roundForDisplay(contribution),
    }
  })

  return {
    formula: { id: formula.id, name: formula.name, university: formula.university, program: formula.program },
    breakdown,
    daeResultStatus: dae?.status ?? null,
    finalAggregate: roundForDisplay(aggregate),
    disclaimer: 'This is a merit calculation, not an eligibility or admission decision.',
  }
}

export const meritCalculatorInternals = { validMarks, validComponents, rawPercentage, roundForDisplay, daeCalculation }
