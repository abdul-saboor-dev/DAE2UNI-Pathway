import mongoose from 'mongoose'
import ApiError from '../utils/ApiError.js'

export function notFoundHandler(request, response) {
  response.status(404).json({
    status: 'error',
    message: `Route not found: ${request.method} ${request.originalUrl}`,
  })
}

export function errorHandler(error, _request, response, _next) {
  let statusCode = error.statusCode || 500
  let code = error.code || 'INTERNAL_ERROR'
  let message = error.message
  let details = error.details

  if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400
    code = 'MODEL_VALIDATION_ERROR'
    message = 'The submitted data is invalid.'
    details = Object.values(error.errors).map((validationError) => ({
      path: validationError.path,
      message: validationError.message,
    }))
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400
    code = 'INVALID_IDENTIFIER'
    message = 'The supplied identifier is invalid.'
  } else if (error?.code === 11000) {
    statusCode = 409
    code = 'DUPLICATE_RECORD'
    message = 'A record with these unique values already exists.'
    details = undefined
  } else if (error?.type === 'entity.parse.failed') {
    statusCode = 400
    code = 'INVALID_JSON'
    message = 'Request body contains invalid JSON.'
  } else if (error?.type === 'entity.too.large') {
    statusCode = 413
    code = 'PAYLOAD_TOO_LARGE'
    message = 'Request body exceeds the permitted size.'
  }

  if (statusCode >= 500 && !(error instanceof ApiError)) {
    console.error(error.stack || error.message)
  }

  const body = {
    status: 'error',
    code,
    message: statusCode >= 500 ? 'Internal server error' : message,
  }

  if (details && statusCode < 500) {
    body.details = details
  }

  response.status(statusCode).json(body)
}
