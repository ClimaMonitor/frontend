import { useAuth } from '../../hooks/useAuth.js'
import styles from './LoginPage.module.css'

export function LoginPage({ onContinueWithoutAuth }) {
  const {
    canContinueWithoutAuth,
    isAuthConfigured,
    isLocalApiTarget,
    isLoading,
    login,
    authError,
  } = useAuth()

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brand}>
          <img
            src="/climamonitor_logo.jpeg"
            alt="ClimaMonitor"
            className={styles.logo}
          />
          <div>
            <p className={styles.eyebrow}>Climate Science Assistant</p>
            <h1 className={styles.title}>Sign in to ClimaMonitor</h1>
          </div>
        </div>

        <p className={styles.copy}>
          Use your role-based account to access the student, teacher, or admin experience.
        </p>

        {!isAuthConfigured && (
          <div className={styles.notice}>
            Authentication is not configured yet. Add the Azure auth environment variables to enable sign-in.
          </div>
        )}

        {authError && <div className={styles.error}>{authError}</div>}

        {!isLocalApiTarget && (
          <div className={styles.notice}>
            This dev session is pointed at the deployed Azure API. Anonymous dev mode is only available when the frontend is running against the local API.
          </div>
        )}

        <button
          type="button"
          className={styles.primaryButton}
          onClick={login}
          disabled={!isAuthConfigured || isLoading}
        >
          {isLoading ? 'Opening sign-in...' : 'Sign in'}
        </button>

        {canContinueWithoutAuth && onContinueWithoutAuth && (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onContinueWithoutAuth}
            disabled={isLoading}
          >
            Continue in local dev mode
          </button>
        )}

        {!canContinueWithoutAuth && isLocalApiTarget && (
          <p className={styles.helperText}>
            Anonymous dev mode is currently unavailable because auth is not in optional mode.
          </p>
        )}
      </section>
    </main>
  )
}

export default LoginPage
