import jwt from 'jsonwebtoken'

const JWT_ISSUER = 'dae2uni-api'
const JWT_AUDIENCE = 'dae2uni-client'
const JWT_ALGORITHM = 'HS256'

export function signAccessToken(user) {
  return jwt.sign(
    {
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      algorithm: JWT_ALGORITHM,
      subject: user._id.toString(),
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
  )
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  })
}
