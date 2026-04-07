import { useSidebar } from '../../hooks/useSidebar.js'
import { ROLES, ROLE_LABELS } from '../../data/rolePermissions.js'
import styles from './RoleSwitcher.module.css'

export function RoleSwitcher() {
  const { currentRole, setRole } = useSidebar()

  const handleChange = (e) => {
    setRole(e.target.value)
  }

  return (
    <div className={styles.container}>
      <label htmlFor="role-select" className={styles.label}>
        View as role:
      </label>
      <select
        id="role-select"
        value={currentRole}
        onChange={handleChange}
        className={styles.select}
      >
        {Object.values(ROLES).map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
    </div>
  )
}

export default RoleSwitcher
