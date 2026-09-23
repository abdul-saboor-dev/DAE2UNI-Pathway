export const CONTENT_MANAGER_ROLES = Object.freeze(['owner', 'co_owner', 'admin'])
export const ROLE_MANAGER_ROLES = Object.freeze(['owner', 'co_owner'])

export const canManageContent = (role) => CONTENT_MANAGER_ROLES.includes(role)
export const canManageRoles = (role) => ROLE_MANAGER_ROLES.includes(role)
