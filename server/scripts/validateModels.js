import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import {
  AdmissionCycle,
  EligibilityRule,
  EntryTest,
  MeritFormula,
  Program,
  SourceVerification,
  StudentProfile,
  University,
  User,
} from '../src/models/index.js'

const ids = {
  user: new mongoose.Types.ObjectId(),
  university: new mongoose.Types.ObjectId(),
  program: new mongoose.Types.ObjectId(),
  entryTest: new mongoose.Types.ObjectId(),
  cycle: new mongoose.Types.ObjectId(),
}

const source = {
  officialUrl: 'https://example.edu.pk/admissions',
  verificationStatus: 'pending_review',
}

const documents = [
  new User({
    _id: ids.user,
    fullName: 'Model Validation Student',
    email: 'student@example.com',
  }),
  new StudentProfile({
    user: ids.user,
    profileStatus: 'complete',
    dae: {
      boardName: 'Punjab Board of Technical Education',
      instituteName: 'Example Institute of Technology',
      passingYear: 2026,
      marks: { totalMarks: 3450, obtainedMarks: 2760 },
    },
    matric: {
      boardName: 'Example BISE',
      group: 'Science',
      passingYear: 2023,
      marks: { totalMarks: 1100, obtainedMarks: 880 },
    },
    domicile: { district: 'Lahore' },
  }),
  new University({
    _id: ids.university,
    name: 'Example University',
    slug: 'example-university',
    sector: 'public',
    campuses: [{ name: 'Main Campus', city: 'Lahore', isMainCampus: true }],
    source,
  }),
  new Program({
    _id: ids.program,
    university: ids.university,
    name: 'BS Information Technology',
    slug: 'bs-information-technology',
    degreeTitle: 'Bachelor of Science in Information Technology',
    credentialType: 'BS',
    duration: { years: 4, semesters: 8 },
    source,
  }),
  new EntryTest({
    _id: ids.entryTest,
    name: 'Example University Admission Test',
    code: 'EUAT',
    conductingBody: 'Example University',
    category: 'university_specific',
    scoring: { maximumScore: 100, defaultPassingScore: 50 },
    source,
  }),
  new AdmissionCycle({
    _id: ids.cycle,
    university: ids.university,
    name: 'Fall 2026 Admissions',
    academicYear: '2026-2027',
    intake: 'fall',
    programOfferings: [{ program: ids.program }],
    source,
  }),
  new EligibilityRule({
    code: 'EU-BSIT-DAE-CIT-2026',
    name: 'DAE CIT eligibility for BS IT',
    university: ids.university,
    program: ids.program,
    admissionCycle: ids.cycle,
    qualificationCriteria: [
      {
        minimumPercentage: 60,
        explanation: 'Applicants need at least 60% in DAE CIT.',
      },
    ],
    entryTestRequirements: [
      {
        entryTest: ids.entryTest,
        minimumPercentage: 50,
        explanation: 'Applicants must score at least 50% in the admission test.',
      },
    ],
    source,
  }),
  new MeritFormula({
    code: 'EU-BSIT-MERIT-2026',
    name: 'BS IT merit formula for Fall 2026',
    university: ids.university,
    program: ids.program,
    admissionCycle: ids.cycle,
    recordStatus: 'published',
    components: [
      {
        key: 'dae',
        label: 'DAE percentage',
        inputSource: 'dae_percentage',
        operation: 'weighted_percentage',
        weightPercentage: 70,
        explanation: 'DAE marks contribute 70% of the aggregate.',
      },
      {
        key: 'entry_test',
        label: 'Entry-test percentage',
        inputSource: 'entry_test_percentage',
        entryTest: ids.entryTest,
        operation: 'weighted_percentage',
        weightPercentage: 30,
        explanation: 'The entry test contributes 30% of the aggregate.',
      },
    ],
    source,
  }),
  new SourceVerification({
    entityModel: 'Program',
    entity: ids.program,
    sourceUrl: 'https://example.edu.pk/admissions/bs-it',
    sourceTitle: 'BS IT Admission Requirements',
    sourceType: 'official_webpage',
    status: 'verified',
    verifiedBy: ids.user,
  }),
]

for (const document of documents) {
  await document.validate()
}

const invalidPublishedFormula = new MeritFormula({
  code: 'INVALID-WEIGHTS',
  name: 'Invalid published formula',
  university: ids.university,
  recordStatus: 'published',
  components: [
    {
      key: 'dae',
      label: 'DAE percentage',
      inputSource: 'dae_percentage',
      weightPercentage: 70,
      explanation: 'Incomplete weight allocation used to test validation.',
    },
  ],
  source,
})

await assert.rejects(
  invalidPublishedFormula.validate(),
  /Published formulas must allocate exactly 100%/,
)

const contradictoryComponentFormula = new MeritFormula({
  code: 'INVALID-FIXED-OPERATION',
  name: 'Invalid fixed-point operation',
  university: ids.university,
  components: [
    {
      key: 'bonus',
      label: 'Bonus points',
      inputSource: 'fixed_points',
      operation: 'weighted_percentage',
      weightPercentage: 100,
      fixedValue: 5,
      explanation: 'Contradictory component used to test validation.',
    },
  ],
  source,
})

await assert.rejects(
  contradictoryComponentFormula.validate(),
  /Fixed-point inputs must use an add\/subtract operation/,
)
assert.equal(MeritFormula.schema.path('expression'), undefined)

const invalidCompleteProfile = new StudentProfile({
  user: new mongoose.Types.ObjectId(),
  profileStatus: 'complete',
  dae: {
    boardName: 'Punjab Board of Technical Education',
    instituteName: 'Example Institute',
    passingYear: 2026,
    marks: { totalMarks: 3450, obtainedMarks: 2760 },
  },
})

await assert.rejects(invalidCompleteProfile.validate(), /matric\.boardName is required/)

const draftProfile = new StudentProfile({
  user: new mongoose.Types.ObjectId(),
  profileStatus: 'draft',
})

await draftProfile.validate()
assert.equal(documents.length, 9)

console.log('Validated all 9 domain models and cross-field safeguards.')
