import {
  getProfileForUser,
  updateProfileForUser,
} from '../services/studentProfileService.js'
import asyncHandler from '../utils/asyncHandler.js'

export const getStudentProfile = asyncHandler(async (request, response) => {
  const profile = await getProfileForUser(request.user._id)
  response.status(200).json({ status: 'success', data: { profile } })
})

export const updateStudentProfile = asyncHandler(async (request, response) => {
  const profile = await updateProfileForUser(request.user._id, request.validated.body)
  response.status(200).json({ status: 'success', data: { profile } })
})
