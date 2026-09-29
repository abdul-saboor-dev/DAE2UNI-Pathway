# Priority computing-program research batch 1

Reviewed: 2026-09-28

Scope: undergraduate computing catalogue facts only

Import policy: `programs_only`; no record in this batch is approved for publication or verification

## Batch summary

- Universities researched: 5
- Evidence-supported program proposals: 13
- Programs already in MongoDB before validation: 0
- Program proposals by university: Punjab 4, GCU Lahore 1, ITU 3, UET Taxila 3, BZU 2
- Proposed records are intended to be created only as `draft` with source verification `pending_review`. Those states are enforced by the importer and therefore are not client-supplied fields in the strict JSON contract.
- No eligibility rule, merit formula, entry test, admission cycle, deadline, minimum mark, or DAE-CIT eligibility conclusion is included.

## Import safety mode

The `programs_only` strategy matches each existing university by its global slug, resolves campus references only against that stored university, and plans only new draft programs. It does not update university or campus fields and skips existing `(university, program slug)` matches without replacing them.

## Database identity and integrity review

Read-only database inspection confirmed each target university and every referenced campus ID. All five university records were `draft` and `pending_review`; the program collection was empty. Program `campusKeys` resolve only within their university group.

UET Taxila is stored independently from UET Lahore. The UET Lahore draft contains Lahore Main Campus, Kala Shah Kaku Campus, Faisalabad Campus, Rachna College of Engineering and Technology/Ghakhar Mandi, and Narowal Campus. It does **not** contain Taxila. No UET Lahore correction is needed for this boundary, and no UET Lahore record was edited.

## University of the Punjab

Current-offering source: [Admission notice 2026-27](https://pu.edu.pk/home/admission_notice/698) (reviewed 2026-09-28).

Supporting duration/curriculum sources: [BSCS four-year date sheet](https://pu.edu.pk/home/datesheet/4906), [BSCS (AI) curriculum](https://pu.edu.pk/images/file/Course-Outlines/Annex-D%20%28BSCS%28AI%29%20Curriculum%29.pdf), and [BSCS (IT) curriculum](https://pu.edu.pk/images/file/Course-Outlines/Annex-B%20%28BSCS%28IT%29%20Curriculum%29.pdf) (reviewed 2026-09-28).

| Proposed program | Slug | Campus assignment | Supported claims and evidence | Evidence strength / limitation |
| --- | --- | --- | --- | --- |
| BS Computer Science | `bs-computer-science` | Quaid-e-Azam, Allama Iqbal, Gujranwala, Jhelum | The current notice names BS Computer Science and identifies these four offering locations. The official four-year BSCS material supports 4 years / 8 semesters. The notice shows morning and self-supporting sessions across locations, represented as `multiple`. | Strong current offering and campus evidence. “Self-Supporting” is a funding/session label, not independently converted to evening. |
| BS Computer Science (Specialization in Artificial Intelligence) | `bs-computer-science-artificial-intelligence` | Quaid-e-Azam, Allama Iqbal | The current notice names the specialization at both Lahore campuses in the morning. Official curriculum supports an eight-semester BSCS specialization. | Strong current offering, campus, and structure evidence. |
| BS Computer Science (Specialization in Software Engineering) | `bs-computer-science-software-engineering` | Quaid-e-Azam, Allama Iqbal | The current notice names the specialization at both Lahore campuses; morning and self-supporting sessions occur across them. The four-year BSCS structure supports 4 years / 8 semesters. | Strong current offering and campus evidence; `multiple` represents the multiple listed sessions without equating self-supporting with a time of day. |
| BS Data Science | `bs-data-science` | Quaid-e-Azam | The current notice names BS Data Science at the New/Quaid-e-Azam campus in morning and self-supporting sessions. The current four-year undergraduate structure supports 4 years / 8 semesters. | Strong current offering and campus evidence. |

Excluded: BSCS (Information Technology) is documented in `excluded-records.json` because its supported included-campus entries are self-supporting only, which cannot be mapped safely to the importer’s time-based study-mode enum. The current notice’s Pothohar offering is also excluded because no matching stored campus exists.

## Government College University Lahore

Current-offering source: [Undergraduate admissions 2026](https://gcu.edu.pk/admissions.php?pg=bs-program) (reviewed 2026-09-28).

Supporting source: [Department of Computer Science](https://gcu.edu.pk/computer-science.php) (reviewed 2026-09-28).

| Proposed program | Slug | Campus assignment | Supported claims and evidence | Evidence strength / limitation |
| --- | --- | --- | --- | --- |
| BS Computer Science | `bs-computer-science` | Lahore Main Campus | The current admissions page lists Computer Science in morning and evening. The department page describes the four-year BS Computer Science program and locates the department at the Lahore university campus. | Strong current offering, Lahore delivery, duration, and mode evidence. No BS assignment is made to Kala Shah Kaku. |

The admissions page references accreditation rules for Computer Science, Artificial Intelligence, and Software Engineering, but its current program list does not list new AI or SE admissions. A [current fee notice](https://gcu.edu.pk/uploads/updates/1771561532_Fee-Notice-11022026.pdf) establishes older AI/SE cohorts, not a 2026 intake. Those programs remain unresolved. The Kala Shah Kaku announcement supports an ADP, not this BS program.

## Information Technology University of the Punjab

Current-offering source: [ITU admissions](https://itu.edu.pk/admissions/) (reviewed 2026-09-28).

Program sources: [BS Computer Science](https://itu.edu.pk/admissions/bs-computer-science/), [BS Software Engineering](https://itu.edu.pk/admissions/bs-software-engineering/), and [BS Artificial Intelligence](https://itu.edu.pk/admissions/bs-artificial-intelligence/) (reviewed 2026-09-28).

Campus-context sources: [ITU Job Fair 2026](https://itu.edu.pk/up-events/itu-job-fair-2026-is-coming/), [SparkUp Innovation Summit 2026](https://itu.edu.pk/itu-sparkup-innovation-summit-2026/), and [admissions FAQ](https://newitu2.itu.edu.pk/admissions/faqs/) (reviewed 2026-09-28).

| Proposed program | Slug | Campus assignment | Supported claims and evidence | Evidence strength / limitation |
| --- | --- | --- | --- | --- |
| BS Computer Science | `bs-computer-science` | Unassigned | Current admissions and program pages name the degree; the undergraduate structure is 4 years / 8 semesters. | Strong program evidence. Official location pages do not unambiguously assign degree teaching between Barki and Arfa Tower, so no campus ID is guessed. |
| BS Software Engineering | `bs-software-engineering` | Unassigned | Current admissions and the program page name the degree and show an eight-semester structure. | Strong program evidence; campus delivery unresolved. |
| BS Artificial Intelligence | `bs-artificial-intelligence` | Unassigned | Current admissions and the program page name the degree and support a four-year/eight-semester structure. | Strong program evidence; campus delivery unresolved. |

`campusKeys: []` is valid under the current import contract and is intentionally used until ITU confirms a program-to-campus mapping. Current official event and FAQ pages establish that Barki and the city/Arfa location are in use, but they are not treated as authoritative per-program delivery assignments.

## University of Engineering and Technology, Taxila

Current-offering sources: [Fall 2026 programs offered](https://admissions.uettaxila.edu.pk/ProgramsOffered.php) and [undergraduate programs](https://www.uettaxila.edu.pk/UGprogram.aspx) (reviewed 2026-09-28).

| Proposed program | Slug | Campus assignment | Supported claims and evidence | Evidence strength / limitation |
| --- | --- | --- | --- | --- |
| BS Computer Science | `bs-computer-science` | Taxila Campus | The current admissions list names Computer Science. The [BSCS page](https://uettaxila.edu.pk/CS/bsCS.asp) identifies the Taxila department and a 4-year / 8-semester curriculum. | Strong current offering, campus, title, and duration evidence. |
| B.Sc. Software Engineering | `bsc-software-engineering` | Taxila Campus | The current admissions list and [Software Engineering department](https://web.uettaxila.edu.pk/SED/index.asp) identify the program and current Taxila cohorts; the curriculum is four years / eight semesters. | Strong current offering, campus, and duration evidence. |
| B.Sc. Computer Engineering | `bsc-computer-engineering` | Taxila Campus | The current admissions list names Computer Engineering. The [undergraduate curriculum](https://www.uettaxila.edu.pk/CPED/courses_UG.asp) identifies the current 4-year / 8-semester program at UET Taxila. | Strong current offering, campus, and duration evidence. |

Cyber Security Engineering Technology and Software Engineering Technology are current-list candidates but excluded because the reviewed official pages did not establish the required duration. Artificial Intelligence Technology has departmental evidence but is absent from the current Fall 2026 programs-offered list.

## Bahauddin Zakariya University

Current-offering sources: [Department of Computer Science undergraduate programs](https://bzu.edu.pk/programs.php?did=41&ptype=1), [Department of Information and Communication Technology undergraduate programs](https://bzu.edu.pk/programs.php?did=42&ptype=1), and [Lodhran Campus department page](https://bzu.edu.pk/view_department.php?deptID=77) (reviewed 2026-09-28).

Supporting duration sources: [Computer Science programs](https://cs.bzu.edu.pk/programs.php) and [official 2025 prospectus](https://bzu.edu.pk/assets/pdf/prospectus_2025.pdf) (reviewed 2026-09-28).

| Proposed program | Slug | Campus assignment | Supported claims and evidence | Evidence strength / limitation |
| --- | --- | --- | --- | --- |
| BS Computer Science | `bs-computer-science` | Multan Main Campus | The current university program list names BSCS in morning and evening; the department page identifies it as a four-year/eight-semester program at BZU Multan. | Strong current offering, main-campus, duration, and mode evidence. |
| BS Information Technology | `bs-information-technology` | Multan Main Campus; Lodhran Campus | The current ICT program list names BSIT; the prospectus supports the four-year/eight-semester structure. The Lodhran department page explicitly lists BS-IT for Fall 2026. | Strong current main-campus and Lodhran title evidence. `multiple` reflects the documented university offering modes; the source does not assign a separate time-of-day mode to Lodhran. |

BS Artificial Intelligence, BS Data Science, and BS Software Engineering are named in current official material but withheld because reviewed current sources did not establish the mandatory duration field. Vehari is withheld from BSIT campus assignment because sufficiently current 2026 campus-level evidence was not found.

## Source and verification boundary

Every URL above is an official university source. A source-backed proposal is not a DAE2UNI verification decision. No reviewer identity, verification timestamp, or `SourceVerification` record is present. Publication and verification remain separate administrator actions after manual review.

## Duplicate and status assessment

- MongoDB contained zero programs before this batch, so no stored `(university, slug)` duplicate was found.
- Slugs are unique within each university group. Identical slugs across different universities are valid under the compound unique index.
- All campus references are restricted to the selected university and use the stored campus import keys/IDs.
- A dry run should match all five existing universities and report the 13 proposed programs as creatable without writing them.
