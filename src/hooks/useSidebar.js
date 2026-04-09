import { useSidebarContext } from '../context/SidebarContext.jsx'

/**
 * Custom hook for sidebar functionality
 * Provides a clean interface to sidebar state and actions
 */
export function useSidebar() {
  const {
    isOpen,
    width,
    toggle,
    open,
    close,
    setWidth,
  } = useSidebarContext()

  return {
    // State
    isOpen,
    width,

    // Actions
    toggle,
    open,
    close,
    setWidth,
  }
}

export default useSidebar
