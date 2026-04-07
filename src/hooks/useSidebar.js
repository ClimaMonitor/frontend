import { useSidebarContext } from '../context/SidebarContext.jsx'
import { ROLES } from '../data/rolePermissions.js'

/**
 * Custom hook for sidebar functionality
 * Provides a clean interface to sidebar state and actions
 */
export function useSidebar() {
  const {
    isOpen,
    width,
    currentRole,
    toggle,
    open,
    close,
    setWidth,
    setRole,
  } = useSidebarContext()

  return {
    // State
    isOpen,
    width,
    currentRole,

    // Actions
    toggle,
    open,
    close,
    setWidth,
    setRole,

    // Derived state
    isStudent: currentRole === ROLES.STUDENT,
    isTeacher: currentRole === ROLES.TEACHER,
    isAdmin: currentRole === ROLES.ADMIN,
  }
}

export default useSidebar
