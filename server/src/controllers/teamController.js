import { grantCoOwner, listTeamMembers, promoteStudent, revokeAdmin, revokeCoOwner } from '../services/teamService.js'
import asyncHandler from '../utils/asyncHandler.js'

export const listAdministrators = asyncHandler(async (request, response) => {
  const result = await listTeamMembers(request.validated.query)
  response.json({ status: 'success', data: result })
})

export const promote = asyncHandler(async (request, response) => {
  const user = await promoteStudent(request.user._id, request.validated.body)
  response.json({ status: 'success', data: { user } })
})

export const revoke = asyncHandler(async (request, response) => {
  const user = await revokeAdmin(request.user._id, request.validated.params.userId, request.validated.body)
  response.json({ status: 'success', data: { user } })
})

export const grantCoOwnerAccess = asyncHandler(async (request, response) => {
  const user = await grantCoOwner(request.user._id, request.validated.params.userId, request.validated.body)
  response.json({ status: 'success', data: { user } })
})

export const revokeCoOwnerAccess = asyncHandler(async (request, response) => {
  const user = await revokeCoOwner(request.user._id, request.validated.params.userId, request.validated.body)
  response.json({ status: 'success', data: { user } })
})
