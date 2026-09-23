import AdminRecordList from './AdminRecordList.jsx'
import { adminProgramQueryDefinition } from '../../utils/adminCatalogue.js'
import { deleteAdminProgram, listAdminPrograms } from '../../services/adminCatalogueApi.js'

export default function AdminProgramsPage() {
  return <AdminRecordList kind="program" definition={adminProgramQueryDefinition} load={listAdminPrograms} remove={deleteAdminProgram} />
}
