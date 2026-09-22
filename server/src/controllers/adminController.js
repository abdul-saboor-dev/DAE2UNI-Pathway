export function getAdminPing(request, response) {
  response.status(200).json({
    status: 'success',
    data: {
      message: 'Admin authorization is working.',
      userId: request.user._id.toString(),
    },
  })
}
