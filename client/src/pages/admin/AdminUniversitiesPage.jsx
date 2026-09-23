import AdminRecordList from './AdminRecordList.jsx'
import { adminUniversityQueryDefinition } from '../../utils/adminCatalogue.js'
import { deleteAdminUniversity, listAdminUniversities } from '../../services/adminCatalogueApi.js'

export default function AdminUniversitiesPage() {
  return <AdminRecordList kind="university" definition={adminUniversityQueryDefinition} load={listAdminUniversities} remove={deleteAdminUniversity} />
}
