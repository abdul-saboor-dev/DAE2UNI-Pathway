import { useEffect, useState } from 'react'
import CatalogueFilterPanel, { FilterField, filterControlClass } from '../components/CatalogueFilterPanel.jsx'
import CataloguePageHeader from '../components/CataloguePageHeader.jsx'
import { CatalogueEmpty, CatalogueError, CatalogueLoading } from '../components/CatalogueStates.jsx'
import Pagination from '../components/Pagination.jsx'
import ProgramCard from '../components/ProgramCard.jsx'
import ResultSummary from '../components/ResultSummary.jsx'
import useCatalogueList from '../hooks/useCatalogueList.js'
import { getPrograms, getUniversityOptions } from '../services/catalogueApi.js'
import { cataloguePageHref, programQueryDefinition } from '../utils/catalogueQuery.js'

const credentialTypes = ['', 'BS', 'BSc', 'BE', 'BTech', 'ADP', 'other']
const studyModes = [
  ['', 'All study modes'], ['morning', 'Morning'], ['evening', 'Evening'],
  ['weekend', 'Weekend'], ['multiple', 'Multiple'],
]
const sortOptions = [
  ['name', 'Name: A to Z'], ['-name', 'Name: Z to A'],
  ['degreeTitle', 'Degree title: A to Z'], ['-degreeTitle', 'Degree title: Z to A'],
]

export default function ProgramsPage() {
  const catalogue = useCatalogueList({ definition: programQueryDefinition, load: getPrograms })
  const [universities, setUniversities] = useState([])
  const activeCount = ['search', 'university', 'city', 'credentialType', 'degreeLevel', 'studyMode']
    .filter((key) => catalogue.query[key]).length

  useEffect(() => {
    const controller = new AbortController()
    getUniversityOptions(controller.signal)
      .then(setUniversities)
      .catch((error) => {
        if (error.name !== 'CanceledError') setUniversities([])
      })
    return () => controller.abort()
  }, [])

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-14">
      <CataloguePageHeader
        eyebrow="Program discovery"
        title="Find undergraduate programs for your next step"
        description="Compare verified public programme records by university, credential, study mode, and campus location. Eligibility and merit decisions remain a later milestone."
      />

      <div className="mt-8 grid min-w-0 gap-7 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside aria-label="Program filters">
          <CatalogueFilterPanel activeCount={activeCount} onClear={catalogue.clearFilters}>
            <FilterField id="program-search" label="Search" description="Search program names, degree titles, departments, or slugs.">
              <input id="program-search" type="search" value={catalogue.searchInput} onChange={(event) => catalogue.setSearchInput(event.target.value)} className={filterControlClass} placeholder="Search programs" autoComplete="off" aria-describedby="program-search-description" />
            </FilterField>
            <FilterField id="program-university" label="University">
              <select id="program-university" value={catalogue.query.university} onChange={(event) => catalogue.setQueryValue('university', event.target.value)} className={filterControlClass}>
                <option value="">All universities</option>
                {universities.map((university) => <option key={university.id} value={university.slug || university.id}>{university.name}</option>)}
              </select>
            </FilterField>
            <FilterField id="program-city" label="City">
              <input id="program-city" value={catalogue.query.city} onChange={(event) => catalogue.setQueryValue('city', event.target.value, { replace: true })} className={filterControlClass} placeholder="For example, Lahore" autoComplete="address-level2" />
            </FilterField>
            <FilterField id="program-credential" label="Credential type">
              <select id="program-credential" value={catalogue.query.credentialType} onChange={(event) => catalogue.setQueryValue('credentialType', event.target.value)} className={filterControlClass}>
                {credentialTypes.map((value) => <option key={value} value={value}>{value || 'All credentials'}</option>)}
              </select>
            </FilterField>
            <FilterField id="program-level" label="Degree level">
              <select id="program-level" value={catalogue.query.degreeLevel} onChange={(event) => catalogue.setQueryValue('degreeLevel', event.target.value)} className={filterControlClass}>
                <option value="">All supported levels</option>
                <option value="undergraduate">Undergraduate</option>
              </select>
            </FilterField>
            <FilterField id="program-mode" label="Study mode">
              <select id="program-mode" value={catalogue.query.studyMode} onChange={(event) => catalogue.setQueryValue('studyMode', event.target.value)} className={filterControlClass}>
                {studyModes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </FilterField>
            <FilterField id="program-sort" label="Sort results">
              <select id="program-sort" value={catalogue.query.sort} onChange={(event) => catalogue.setQueryValue('sort', event.target.value, { resetPage: false })} className={filterControlClass}>
                {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </FilterField>
          </CatalogueFilterPanel>
        </aside>

        <section id="program-results" tabIndex="-1" aria-label="Program results" className="min-w-0 focus:outline-none">
          <div className="mb-5 flex min-h-11 flex-wrap items-center justify-between gap-3">
            <ResultSummary pagination={catalogue.pagination} noun="programs" />
            {activeCount > 0 && <span className="rounded-full bg-mint px-3 py-1.5 text-xs font-black text-forest">Filtered view</span>}
          </div>
          {catalogue.status === 'loading' && <CatalogueLoading label="Loading programs…" />}
          {catalogue.status === 'error' && <CatalogueError onRetry={catalogue.retry} />}
          {catalogue.status === 'ready' && catalogue.items.length === 0 && (
            <CatalogueEmpty title="No programs match this view" description="Try a broader search or remove one of the programme filters." onClear={activeCount ? catalogue.clearFilters : undefined} />
          )}
          {catalogue.status === 'ready' && catalogue.items.length > 0 && (
            <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {catalogue.items.map((program) => <ProgramCard key={program.id} program={program} />)}
            </div>
          )}
          {catalogue.pagination && (
            <Pagination
              page={catalogue.pagination.page}
              totalPages={catalogue.pagination.totalPages}
              hrefForPage={(page) => cataloguePageHref(catalogue.normalizedParams, programQueryDefinition, page)}
              focusTargetId="program-results"
            />
          )}
        </section>
      </div>
    </section>
  )
}
