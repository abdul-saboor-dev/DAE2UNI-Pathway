const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function utf8Length(value) {
  return new TextEncoder().encode(value).length
}

export function validateEmail(value) {
  const errors = {}
  const email = value.trim()

  if (!email) errors.email = 'Email is required.'
  else if (email.length > 254 || !emailPattern.test(email)) {
    errors.email = 'Enter a valid email address.'
  }
  return errors
}

export function validateLogin(values) {
  const errors = validateEmail(values.email)
  if (!values.password) errors.password = 'Password is required.'
  return errors
}

export function validateRegistration(values) {
  const errors = validateLogin(values)
  const name = values.name.trim()
  const password = values.password

  if (!name) errors.name = 'Name is required.'
  else if (name.length < 2) errors.name = 'Name must contain at least 2 characters.'
  else if (name.length > 120) errors.name = 'Name cannot exceed 120 characters.'

  if (password) {
    if (password.length < 8) errors.password = 'Password must contain at least 8 characters.'
    else if (password.length > 72) errors.password = 'Password cannot exceed 72 characters.'
    else if (utf8Length(password) > 72) errors.password = 'Password cannot exceed 72 UTF-8 bytes.'
    else if (!/[a-z]/.test(password)) errors.password = 'Password must contain a lowercase letter.'
    else if (!/[A-Z]/.test(password)) errors.password = 'Password must contain an uppercase letter.'
    else if (!/[0-9]/.test(password)) errors.password = 'Password must contain a number.'
  }

  if (!values.confirmPassword) errors.confirmPassword = 'Confirm your password.'
  else if (values.confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.'

  return errors
}
