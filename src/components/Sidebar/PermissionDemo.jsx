import { useSidebar } from '../../hooks/useSidebar.js'
import { PERMISSION_CATEGORIES, RATE_LIMITS, ROLE_LABELS } from '../../data/rolePermissions.js'
import styles from './PermissionDemo.module.css'

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.iconAllowed}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.iconDenied}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function PermissionDemo() {
  const { currentRole } = useSidebar()
  const rateLimit = RATE_LIMITS[currentRole]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {ROLE_LABELS[currentRole]} Permissions
        </h3>
        <p className={styles.subtitle}>
          Rate limit: {rateLimit.questionsPerHour} questions/hour
        </p>
      </div>

      <div className={styles.categories}>
        {PERMISSION_CATEGORIES.map((category) => (
          <div key={category.name} className={styles.category}>
            <h4 className={styles.categoryName}>{category.name}</h4>
            <ul className={styles.permissionList}>
              {category.permissions.map((permission) => {
                const isAllowed = permission.roles.includes(currentRole)
                return (
                  <li
                    key={permission.key}
                    className={`${styles.permissionItem} ${isAllowed ? styles.allowed : styles.denied}`}
                  >
                    <span className={styles.permissionIcon}>
                      {isAllowed ? <CheckIcon /> : <XIcon />}
                    </span>
                    <span className={styles.permissionLabel}>
                      {permission.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PermissionDemo
