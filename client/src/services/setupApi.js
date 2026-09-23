import api from './api.js'

export async function getOwnerSetupStatus(signal) {
  const { data } = await api.get('/setup/status', { signal })
  return data.data?.ownerSetupRequired === true
}

export async function createFirstOwner({ name, email, password, passwordConfirmation, setupSecret }) {
  const { data } = await api.post('/setup/admin', {
    name, email, password, passwordConfirmation, setupSecret,
  })
  return data.data?.user
}
