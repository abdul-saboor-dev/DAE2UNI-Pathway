import CatalogueFilterPanel, { FilterField, filterControlClass } from '../components/CatalogueFilterPanel.jsx'
import CataloguePageHeader from '../components/CataloguePageHeader.jsx'
import { CatalogueEmpty, CatalogueError, CatalogueLoading } from '../components/CatalogueStates.jsx'
import Pagination from '../components/Pagination.jsx'
import ResultSummary from '../components/ResultSummary.jsx'
import UniversityCard from '../components/UniversityCard.jsx'
import useCatalogueList from '../hooks/useCatalogueList.js'
import { getUniversities } from '../services/catalogueApi.js'
import { cataloguePageHref, universityQueryDefinition } from '../utils/catalogueQuery.js'

const institutionTypes = [
  ['', 'All institution types'],
  ['general', 'General'],
  ['engineering', 'Engineering'],
  ['technology', 'Technology'],
  ['specialized', 'Specialized'],
]

const sortOptions = [
  ['name', 'Name: A to Z'],
  ['-name', 'Name: Z to A'],
  ['establishedYear', 'Established: oldest first'],
  ['-establishedYear', 'Established: newest first'],
]

export default function UniversitiesPage() {
  const catalogue = useCatalogueList({ definition: universityQueryDefinition, load: getUniversities })
  const activeCount = ['search', 'city', 'institutionType'].filter((key) => catalogue.query[key]).length

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-14">
      <CataloguePageHeader
        eyebrow="University discovery"
        title="Explore verified universities across Punjab"
        description="Browse public catalogue records and official source links relevant to the next step after DAE CIT. Eligibility decisions are intentionally not shown yet."
      />

      <div className="mt-8 grid min-w-0 gap-7 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside aria-label="University filters">
          <CatalogueFilterPanel activeCount={activeCount} onClear={catalogue.clearFilters}>
            <FilterField id="university-search" label="Search" description="Search university names, abbreviations, or slugs.">
              <input id="university-search" type="search" value={catalogue.searchInput} onChange={(event) => catalogue.setSearchInput(event.target.value)} className={filterControlClass} placeholder="Search universities" autoComplete="off" aria-describedby="university-search-description" />
            </FilterField>
            <FilterField id="university-city" label="City">
              <input id="university-city" value={catalogue.query.city} onChange={(event) => catalogue.setQueryValue('city', event.target.value, { replace: true })} className={filterControlClass} placeholder="For example, Lahore" autoComplete="address-level2" />
            </FilterField>
            <FilterField id="university-type" label="Institution type">
              <select id="university-type" value={catalogue.query.institutionType} onChange={(event) => catalogue.setQueryValue('institutionType', event.target.value)} className={filterControlClass}>
                {institutionTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </FilterField>
            <FilterField id="university-sort" label="Sort results">
              <select id="university-sort" value={catalogue.query.sort} onChange={(event) => catalogue.setQueryValue('sort', event.target.value, { resetPage: false })} className={filterControlClass}>
                {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </FilterField>
          </CatalogueFilterPanel>
        </aside>

        <section id="university-results" tabIndex="-1" aria-label="University results" className="min-w-0 focus:outline-none">
          <div className="mb-5 flex min-h-11 flex-wrap items-center justify-between gap-3">
            <ResultSummary pagination={catalogue.pagination} noun="universities" />
            {activeCount > 0 && <span className="rounded-full bg-mint px-3 py-1.5 text-xs font-black text-forest">Filtered view</span>}
          </div>
          {catalogue.status === 'loading' && <CatalogueLoading label="Loading universities…" />}
          {catalogue.status === 'error' && <CatalogueError onRetry={catalogue.retry} />}
          {catalogue.status === 'ready' && catalogue.items.length === 0 && (
            <CatalogueEmpty title="No universities match this view" description="Try a broader search, remove a filter, or check a different city." onClear={activeCount ? catalogue.clearFilters : undefined} />
          )}
          {catalogue.status === 'ready' && catalogue.items.length > 0 && (
            <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {catalogue.items.map((university) => <UniversityCard key={university.id} university={university} />)}
            </div>
          )}
          {catalogue.pagination && (
            <Pagination
              page={catalogue.pagination.page}
              totalPages={catalogue.pagination.totalPages}
              hrefForPage={(page) => cataloguePageHref(catalogue.normalizedParams, universityQueryDefinition, page)}
              focusTargetId="university-results"
            />
          )}
        </section>
      </div>
    </section>
  )
}
