import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import User from '../models/User.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import { verifyAccessToken } from '../utils/jwt.js'

const { TokenExpiredError } = jwt

export const authenticate = asyncHandler(async (request, _response, next) => {
  const authorizationHeader = request.get('authorization')
  const [scheme, token, extra] = authorizationHeader?.trim().split(/\s+/) || []

  if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
    throw new ApiError(401, 'Authentication is required.', 'AUTHENTICATION_REQUIRED')
  }

  let payload
  try {
    payload = verifyAccessToken(token)
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new ApiError(401, 'Authentication token has expired.', 'TOKEN_EXPIRED')
    }
    throw new ApiError(401, 'Authentication token is invalid.', 'INVALID_TOKEN')
  }

  if (
    typeof payload !== 'object' ||
    !payload?.sub ||
    !mongoose.isObjectIdOrHexString(payload.sub)
  ) {
    throw new ApiError(401, 'Authentication token is invalid.', 'INVALID_TOKEN')
  }

  const user = await User.findById(payload.sub)
  if (!user) {
    throw new ApiError(401, 'Authentication token is invalid.', 'INVALID_TOKEN')
  }
  if (user.accountStatus !== 'active') {
    throw new ApiError(403, 'This account is not active.', 'ACCOUNT_DISABLED')
  }

  request.user = user
  next()
})

export function authorize(...allowedRoles) {
  return function authorizeRole(request, _response, next) {
    if (!request.user) {
      return next(
        new ApiError(401, 'Authentication is required.', 'AUTHENTICATION_REQUIRED'),
      )
    }
    if (!allowedRoles.includes(request.user.role)) {
      return next(
        new ApiError(403, 'You do not have permission to access this resource.', 'FORBIDDEN'),
      )
    }
    return next()
  }
}
