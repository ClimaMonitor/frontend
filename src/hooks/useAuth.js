import { useAuthContext } from '../context/AuthContext.jsx'
import { ROLES } from '../data/rolePermissions.js'

export function useAuth() {
  const auth = useAuthContext()

  return {
    ...auth,
    isAdmin: auth.primaryRole === ROLES.ADMIN,
    isStudent: auth.primaryRole === ROLES.STUDENT,
    isTeacher: auth.primaryRole === ROLES.TEACHER,
  }
}

export default useAuth
