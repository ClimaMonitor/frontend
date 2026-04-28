import { createContext, useContext, useReducer, useCallback } from 'react'

// Action types
const ACTIONS = {
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  OPEN_SIDEBAR: 'OPEN_SIDEBAR',
  CLOSE_SIDEBAR: 'CLOSE_SIDEBAR',
  SET_WIDTH: 'SET_WIDTH',
}

// Initial state
const initialState = {
  isOpen: false,
  width: 520,
}

// Reducer
function sidebarReducer(state, action) {
  switch (action.type) {
    case ACTIONS.TOGGLE_SIDEBAR:
      return {
        ...state,
        isOpen: !state.isOpen,
      }

    case ACTIONS.OPEN_SIDEBAR:
      return {
        ...state,
        isOpen: true,
      }

    case ACTIONS.CLOSE_SIDEBAR:
      return {
        ...state,
        isOpen: false,
      }

    case ACTIONS.SET_WIDTH:
      return {
        ...state,
        width: action.payload,
      }

    default:
      return state
  }
}

// Create context
const SidebarContext = createContext(null)

// Provider component
export function SidebarProvider({ children }) {
  const [state, dispatch] = useReducer(sidebarReducer, initialState)

  const toggle = useCallback(() => {
    dispatch({ type: ACTIONS.TOGGLE_SIDEBAR })
  }, [])

  const open = useCallback(() => {
    dispatch({ type: ACTIONS.OPEN_SIDEBAR })
  }, [])

  const close = useCallback(() => {
    dispatch({ type: ACTIONS.CLOSE_SIDEBAR })
  }, [])

  const setWidth = useCallback((width) => {
    // Clamp width between min and max
    const minWidth = 360
    const maxWidth = Math.min(Math.max(window.innerWidth - 24, minWidth), 760)
    const clampedWidth = Math.min(Math.max(width, minWidth), maxWidth)
    dispatch({ type: ACTIONS.SET_WIDTH, payload: clampedWidth })
  }, [])

  const value = {
    isOpen: state.isOpen,
    width: state.width,
    toggle,
    open,
    close,
    setWidth,
  }

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

// Hook to use sidebar context
export function useSidebarContext() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebarContext must be used within a SidebarProvider')
  }
  return context
}

export default SidebarContext
