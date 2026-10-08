import EligibilityRule from '../models/EligibilityRule.js'
import Program from '../models/Program.js'
import StudentProfile from '../models/StudentProfile.js'
import University from '../models/University.js'
import ApiError from '../utils/ApiError.js'

const verifiedPublished = { recordStatus: 'published', 'source.verificationStatus': 'verified' }
const unavailableMessage = 'No verified eligibility rule is available yet.'

function id(value) {
  return value?.toString()
}

function normalized(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

function safeSourceUrl(value) {
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password
      ? parsed.toString()
      : null
  } catch {
    return null
  }
}

function reason(code, outcome, message) {
  return { code, outcome, message }
}

function evaluateCriterion(criterion, profile) {
  const reasons = []
  let missing = false
  let failed = false
  let manual = false
  const dae = profile?.dae

  if (criterion.qualificationType !== 'DAE') {
    return { matched: false, missing: false, failed: false, manual: true, reasons: [reason('UNSUPPORTED_QUALIFICATION', 'manual_review', 'This qualification criterion requires manual review.')] }
  }

  if (!normalized(dae?.technologyCode)) {
    missing = true
    reasons.push(reason('DAE_TECHNOLOGY_REQUIRED', 'missing', 'Add your DAE technology to your profile.'))
  } else if (!criterion.technologyCodes.map(normalized).includes(normalized(dae.technologyCode))) {
    failed = true
    reasons.push(reason('DAE_TECHNOLOGY_NOT_ACCEPTED', 'failed', 'Your saved DAE technology is not listed by this rule.'))
  } else {
    reasons.push(reason('DAE_TECHNOLOGY_ACCEPTED', 'matched', 'Your saved DAE technology is listed by this rule.'))
  }

  if (Number.isFinite(criterion.minimumPercentage)) {
    if (!Number.isFinite(dae?.marks?.percentage)) {
      missing = true
      reasons.push(reason('DAE_PERCENTAGE_REQUIRED', 'missing', 'Complete your saved DAE marks.'))
    } else if (dae.marks.percentage < criterion.minimumPercentage) {
      failed = true
      reasons.push(reason('DAE_PERCENTAGE_BELOW_MINIMUM', 'failed', `Your saved DAE percentage is below the required ${criterion.minimumPercentage}%.`))
    } else {
      reasons.push(reason('DAE_PERCENTAGE_MEETS_MINIMUM', 'matched', `Your saved DAE percentage meets the required ${criterion.minimumPercentage}%.`))
    }
  }

  if (Number.isInteger(criterion.minimumPassingYear)) {
    if (!Number.isInteger(dae?.passingYear)) {
      missing = true
      reasons.push(reason('DAE_PASSING_YEAR_REQUIRED', 'missing', 'Add your DAE passing year to your profile.'))
    } else if (dae.passingYear < criterion.minimumPassingYear) {
      failed = true
      reasons.push(reason('DAE_PASSING_YEAR_TOO_EARLY', 'failed', `The rule requires a DAE passing year of ${criterion.minimumPassingYear} or later.`))
    } else {
      reasons.push(reason('DAE_PASSING_YEAR_ACCEPTED', 'matched', 'Your saved DAE passing year meets this rule.'))
    }
  }

  if (criterion.acceptedBoards?.length) {
    if (!normalized(dae?.boardName)) {
      missing = true
      reasons.push(reason('DAE_BOARD_REQUIRED', 'missing', 'Add your DAE board to your profile.'))
    } else if (!criterion.acceptedBoards.map(normalized).includes(normalized(dae.boardName))) {
      failed = true
      reasons.push(reason('DAE_BOARD_NOT_ACCEPTED', 'failed', 'Your saved DAE board is not listed by this rule.'))
    } else {
      reasons.push(reason('DAE_BOARD_ACCEPTED', 'matched', 'Your saved DAE board is listed by this rule.'))
    }
  }

  if (criterion.requiredSubjects?.length) {
    const savedSubjects = (dae?.subjects || []).map((subject) => normalized(subject.name)).filter(Boolean)
    if (!savedSubjects.length) {
      missing = true
      reasons.push(reason('DAE_SUBJECTS_REQUIRED', 'missing', 'Add your DAE subjects to your profile.'))
    } else {
      const absent = criterion.requiredSubjects.filter((subject) => !savedSubjects.includes(normalized(subject)))
      if (absent.length) {
        failed = true
        reasons.push(reason('DAE_REQUIRED_SUBJECTS_MISSING', 'failed', 'Your saved DAE subjects do not include every subject required by this rule.'))
      } else {
        reasons.push(reason('DAE_REQUIRED_SUBJECTS_PRESENT', 'matched', 'Your saved DAE subjects include those required by this rule.'))
      }
    }
  }

  if (criterion.equivalenceRequired) {
    manual = true
    reasons.push(reason('EQUIVALENCE_REQUIRES_REVIEW', 'manual_review', 'Required equivalence evidence must be reviewed manually.'))
  }

  return { matched: !missing && !failed && !manual, missing, failed, manual, reasons }
}

function evaluateRule(rule, profile) {
  const criterionResults = rule.qualificationCriteria.map((criterion) => evaluateCriterion(criterion, profile))
  const reasons = criterionResults.flatMap((result) => result.reasons)
  let manual = criterionResults.some((result) => result.manual)
  let missing = criterionResults.some((result) => result.missing)
  let failed = rule.qualificationMatchLogic === 'all'
    ? criterionResults.some((result) => result.failed)
    : !criterionResults.some((result) => result.matched) && criterionResults.every((result) => result.failed)

  if (rule.conditionGroups?.length) {
    manual = true
    reasons.push(reason('CONDITIONS_REQUIRE_MANUAL_REVIEW', 'manual_review', 'This rule contains conditions that are not safe to evaluate automatically.'))
  }

  if (rule.domicile?.required) {
    const province = normalized(profile?.domicile?.province)
    const district = normalized(profile?.domicile?.district)
    if (!province || (rule.domicile.allowedDistricts?.length && !district)) {
      missing = true
      reasons.push(reason('DOMICILE_INFORMATION_REQUIRED', 'missing', 'Complete your domicile information.'))
    } else if (rule.domicile.allowedProvinces?.length && !rule.domicile.allowedProvinces.map(normalized).includes(province)) {
      failed = true
      reasons.push(reason('DOMICILE_PROVINCE_NOT_ACCEPTED', 'failed', 'Your saved domicile province is not listed by this rule.'))
    } else if (rule.domicile.allowedDistricts?.length && !rule.domicile.allowedDistricts.map(normalized).includes(district)) {
      failed = true
      reasons.push(reason('DOMICILE_DISTRICT_NOT_ACCEPTED', 'failed', 'Your saved domicile district is not listed by this rule.'))
    } else {
      reasons.push(reason('DOMICILE_ACCEPTED', 'matched', 'Your saved domicile information meets this rule.'))
    }
  }

  if ((rule.entryTestRequirements || []).some((requirement) =>
    requirement.required || Number.isFinite(requirement.minimumScore) || Number.isFinite(requirement.minimumPercentage))) {
    missing = true
    reasons.push(reason('ENTRY_TEST_INFORMATION_REQUIRED', 'missing', 'Entry-test evidence required by this rule is not stored in your profile.'))
  }

  let state = 'eligible'
  let message = 'Your saved profile meets every criterion this verified rule can evaluate.'
  if (manual) {
    state = 'needs_manual_review'
    message = 'This rule includes criteria that require manual review.'
  } else if (missing) {
    state = 'needs_information'
    message = 'More saved profile information is required before this rule can be evaluated.'
  } else if (failed) {
    state = 'not_eligible'
    message = 'Your saved profile does not meet one or more explicit criteria in this verified rule.'
  }
  return { state, message, reasons }
}

function unavailableResult(program = null, university = null) {
  return {
    state: 'unavailable',
    message: unavailableMessage,
    university: university ? { id: id(university._id), name: university.name } : null,
    program: program ? { id: id(program._id), name: program.name, slug: program.slug } : null,
    rule: null,
    source: null,
    reasons: [reason('VERIFIED_RULE_UNAVAILABLE', 'unavailable', unavailableMessage)],
  }
}

function resultFor(rule, university, program, profile) {
  return {
    ...evaluateRule(rule, profile),
    university: { id: id(university._id), name: university.name },
    program: { id: id(program._id), name: program.name, slug: program.slug },
    rule: { code: rule.code, name: rule.name },
    source: { officialUrl: safeSourceUrl(rule.source.officialUrl) },
  }
}

function activeRuleFilter(now) {
  return {
    ...verifiedPublished,
    applicantCategory: 'DAE-CIT',
    $and: [
      { $or: [{ effectiveFrom: { $exists: false } }, { effectiveFrom: null }, { effectiveFrom: { $lte: now } }] },
      { $or: [{ effectiveUntil: { $exists: false } }, { effectiveUntil: null }, { effectiveUntil: { $gte: now } }] },
    ],
  }
}

async function findVisibleProgram(programId) {
  const program = await Program.findOne({ _id: programId, ...verifiedPublished }).select('name slug university').lean()
  if (!program) throw new ApiError(404, 'The selected program is not available.', 'PROGRAM_UNAVAILABLE')
  const university = await University.findOne({ _id: program.university, ...verifiedPublished }).select('name').lean()
  if (!university) throw new ApiError(404, 'The selected program is not available.', 'PROGRAM_UNAVAILABLE')
  return { program, university }
}

export async function evaluateStudentEligibility(userId, { programId } = {}) {
  const now = new Date()
  const profilePromise = StudentProfile.findOne({ user: userId })
    .select('dae.technologyCode dae.boardName dae.passingYear dae.marks.percentage dae.subjects domicile.province domicile.district')
    .lean()

  if (programId) {
    const [{ program, university }, profile] = await Promise.all([findVisibleProgram(programId), profilePromise])
    const rules = await EligibilityRule.find({
      ...activeRuleFilter(now),
      $or: [
        { scope: 'program', program: program._id, university: university._id },
        { scope: 'university', university: university._id },
      ],
    }).sort({ priority: -1, code: 1 }).lean()
    return rules.length
      ? rules.map((rule) => resultFor(rule, university, program, profile))
      : [unavailableResult(program, university)]
  }

  const [profile, rules] = await Promise.all([
    profilePromise,
    EligibilityRule.find(activeRuleFilter(now)).sort({ priority: -1, code: 1 }).lean(),
  ])
  if (!rules.length) return [unavailableResult()]

  const universityIds = [...new Set(rules.map((rule) => id(rule.university)))]
  const universities = await University.find({ _id: { $in: universityIds }, ...verifiedPublished }).select('name').lean()
  const universityMap = new Map(universities.map((university) => [id(university._id), university]))
  const programIds = rules.filter((rule) => rule.scope === 'program').map((rule) => rule.program).filter(Boolean)
  const universityRuleIds = rules.filter((rule) => rule.scope === 'university').map((rule) => rule.university)
  const programs = await Program.find({
    ...verifiedPublished,
    $or: [{ _id: { $in: programIds } }, { university: { $in: universityRuleIds } }],
  }).select('name slug university').lean()
  const programsById = new Map(programs.map((program) => [id(program._id), program]))

  const results = []
  for (const rule of rules) {
    const university = universityMap.get(id(rule.university))
    if (!university) continue
    const candidates = rule.scope === 'program'
      ? [programsById.get(id(rule.program))].filter(Boolean)
      : programs.filter((program) => id(program.university) === id(rule.university))
    for (const program of candidates) {
      if (id(program.university) === id(rule.university)) results.push(resultFor(rule, university, program, profile))
    }
  }
  return results.length ? results : [unavailableResult()]
}

export const eligibilityEvaluationInternals = { evaluateCriterion, evaluateRule, safeSourceUrl }
