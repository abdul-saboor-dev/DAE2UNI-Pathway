import ApiError from '../utils/ApiError.js'

export default function validateRequest(schema) {
  return function requestValidator(request, _response, next) {
    const result = schema.safeParse({
      body: request.body ?? {},
      params: request.params ?? {},
      query: request.query ?? {},
    })

    if (!result.success) {
      return next(
        new ApiError(
          400,
          'Request validation failed.',
          'REQUEST_VALIDATION_ERROR',
          result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        ),
      )
    }

    request.validated = result.data
    return next()
  }
}
