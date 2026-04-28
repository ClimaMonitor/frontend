import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { ROLES } from '../../data/rolePermissions.js'
import {
  createManagementClassroom,
  getManagementClassrooms,
  getManagementUsers,
  removeClassroomMember,
  getTeacherClassroomStudents,
  getTeacherClassrooms,
  updateManagementUser,
  updateManagementClassroom,
  upsertClassroomMember,
} from '../../services/api.js'
import styles from './RoleDemoUI.module.css'

const USER_ROLE_OPTIONS = [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN]

export function RoleDemoUI() {
  const { currentUser, isAdmin, isTeacher, primaryRole } = useAuth()

  if (!primaryRole) {
    return (
      <div className={styles.container}>
        <Panel title="Role-based access" icon={<InfoIcon />}>
          <p className={styles.infoNote}>
            Sign in with a seeded account to load your ClimaMonitor role and classroom access.
          </p>
        </Panel>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <ProfilePanel currentUser={currentUser} primaryRole={primaryRole} />
      {isAdmin && <AdminOverview currentUser={currentUser} />}
      {isTeacher && !isAdmin && <TeacherOverview />}
      {primaryRole === ROLES.STUDENT && <StudentOverview currentUser={currentUser} />}
    </div>
  )
}

function ProfilePanel({ currentUser, primaryRole }) {
  return (
    <Panel title="Profile" icon={<UserIcon />}>
      <div className={styles.detailGrid}>
        <Detail label="Role" value={primaryRole} />
        <Detail label="Name" value={currentUser?.displayName || 'Unknown'} />
        <Detail label="Email" value={currentUser?.email || 'Unknown'} />
        <Detail label="Classrooms" value={String(currentUser?.classroomIds?.length || 0)} />
      </div>
    </Panel>
  )
}

function AdminOverview({ currentUser }) {
  const [users, setUsers] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [selectedClassroomId, setSelectedClassroomId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [pendingUserId, setPendingUserId] = useState(null)
  const [pendingClassroomId, setPendingClassroomId] = useState(null)
  const [pendingMembershipKey, setPendingMembershipKey] = useState(null)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)
  const [classroomError, setClassroomError] = useState(null)
  const [classroomMessage, setClassroomMessage] = useState(null)
  const [membershipError, setMembershipError] = useState(null)
  const [membershipMessage, setMembershipMessage] = useState(null)

  const refreshManagementData = useCallback(async () => {
    const [usersResponse, classroomsResponse] = await Promise.all([
      getManagementUsers(),
      getManagementClassrooms(),
    ])
    setUsers(usersResponse.users || [])
    setClassrooms(classroomsResponse.classrooms || [])
  }, [])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setActionError(null)
    setActionMessage(null)
    setClassroomError(null)
    setClassroomMessage(null)
    setMembershipError(null)
    setMembershipMessage(null)

    try {
      await refreshManagementData()
    } catch (loadError) {
      setError(loadError.message || 'Unable to load management data.')
    } finally {
      setIsLoading(false)
    }
  }, [refreshManagementData])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setSelectedClassroomId((currentId) => (
      classrooms.some((classroom) => classroom.classroom_id === currentId)
        ? currentId
        : classrooms[0]?.classroom_id || ''
    ))
  }, [classrooms])

  const updateUser = useCallback(async (user, patch) => {
    if (user.user_id === currentUser?.userId) {
      setActionError('Use the database directly if you need to change your own admin account.')
      setActionMessage(null)
      return
    }

    setPendingUserId(user.user_id)
    setActionError(null)
    setActionMessage(null)

    try {
      const response = await updateManagementUser(user.user_id, patch)
      const updatedUser = response.user

      setUsers((currentUsers) => currentUsers.map((current) => (
        current.user_id === updatedUser.user_id ? updatedUser : current
      )))
      setActionMessage(`${updatedUser.display_name || updatedUser.email} updated.`)
    } catch (updateError) {
      setActionError(updateError.message || 'Unable to update user.')
    } finally {
      setPendingUserId(null)
    }
  }, [currentUser?.userId])

  const createClassroom = useCallback(async (name) => {
    setPendingClassroomId('new')
    setClassroomError(null)
    setClassroomMessage(null)

    try {
      const response = await createManagementClassroom({ name })
      const classroom = response.classroom

      setClassrooms((currentClassrooms) => [...currentClassrooms, classroom].sort(compareClassrooms))
      setClassroomMessage(`${classroom.name} created.`)
      return true
    } catch (createError) {
      setClassroomError(createError.message || 'Unable to create classroom.')
      return false
    } finally {
      setPendingClassroomId(null)
    }
  }, [])

  const updateClassroom = useCallback(async (classroom, patch) => {
    setPendingClassroomId(classroom.classroom_id)
    setClassroomError(null)
    setClassroomMessage(null)

    try {
      const response = await updateManagementClassroom(classroom.classroom_id, patch)
      const updatedClassroom = response.classroom

      setClassrooms((currentClassrooms) => currentClassrooms
        .map((current) => (
          current.classroom_id === updatedClassroom.classroom_id ? updatedClassroom : current
        ))
        .sort(compareClassrooms))
      setClassroomMessage(`${updatedClassroom.name} updated.`)
      return true
    } catch (updateError) {
      setClassroomError(updateError.message || 'Unable to update classroom.')
      return false
    } finally {
      setPendingClassroomId(null)
    }
  }, [])

  const addMembership = useCallback(async ({ classroomId, userId, membershipRole }) => {
    setPendingMembershipKey(`add:${classroomId}`)
    setMembershipError(null)
    setMembershipMessage(null)

    try {
      await upsertClassroomMember(classroomId, {
        user_id: userId,
        membership_role: membershipRole,
      })
      await refreshManagementData()
      setMembershipMessage('Membership added.')
      return true
    } catch (addError) {
      setMembershipError(addError.message || 'Unable to add classroom membership.')
      return false
    } finally {
      setPendingMembershipKey(null)
    }
  }, [refreshManagementData])

  const removeMembership = useCallback(async (classroomId, user) => {
    setPendingMembershipKey(`remove:${classroomId}:${user.user_id}`)
    setMembershipError(null)
    setMembershipMessage(null)

    try {
      await removeClassroomMember(classroomId, user.user_id)
      await refreshManagementData()
      setMembershipMessage(`${user.display_name || user.email} removed from classroom.`)
    } catch (removeError) {
      setMembershipError(removeError.message || 'Unable to remove classroom membership.')
    } finally {
      setPendingMembershipKey(null)
    }
  }, [refreshManagementData])

  const counts = useMemo(() => ({
    admins: users.filter((user) => user.role === ROLES.ADMIN).length,
    teachers: users.filter((user) => user.role === ROLES.TEACHER).length,
    students: users.filter((user) => user.role === ROLES.STUDENT).length,
  }), [users])

  return (
    <>
      <Panel
        title="Management"
        icon={<DashboardIcon />}
        action={<RefreshButton onClick={load} disabled={isLoading} />}
      >
        {isLoading ? (
          <p className={styles.infoNote}>Loading management data...</p>
        ) : error ? (
          <p className={styles.errorNote}>{error}</p>
        ) : (
          <div className={styles.statCards}>
            <Stat value={users.length} label="Users" />
            <Stat value={classrooms.length} label="Classrooms" />
          </div>
        )}
      </Panel>

      {!isLoading && !error && (
        <>
          <Panel title="Users" icon={<UsersIcon />}>
            <div className={styles.statCards}>
              <Stat value={counts.admins} label="Admins" />
              <Stat value={counts.teachers} label="Teachers" />
              <Stat value={counts.students} label="Students" />
            </div>
            {actionError && <p className={styles.errorNote}>{actionError}</p>}
            {actionMessage && <p className={styles.successNote}>{actionMessage}</p>}
            <List
              items={users}
              emptyLabel="No users found."
              renderItem={(user) => (
                <UserManagementRow
                  currentUserId={currentUser?.userId}
                  isPending={pendingUserId === user.user_id}
                  onUpdate={updateUser}
                  user={user}
                />
              )}
            />
          </Panel>

          <Panel title="Classrooms" icon={<SchoolIcon />}>
            <CreateClassroomForm
              disabled={pendingClassroomId === 'new'}
              onCreate={createClassroom}
            />
            {classroomError && <p className={styles.errorNote}>{classroomError}</p>}
            {classroomMessage && <p className={styles.successNote}>{classroomMessage}</p>}
            <List
              items={classrooms}
              emptyLabel="No classrooms found."
              renderItem={(classroom) => (
                <ClassroomManagementRow
                  classroom={classroom}
                  isPending={pendingClassroomId === classroom.classroom_id}
                  onUpdate={updateClassroom}
                />
              )}
            />
          </Panel>

          <MembershipPanel
            classrooms={classrooms}
            error={membershipError}
            message={membershipMessage}
            onAdd={addMembership}
            onRemove={removeMembership}
            onSelectClassroom={setSelectedClassroomId}
            pendingKey={pendingMembershipKey}
            selectedClassroomId={selectedClassroomId}
            users={users}
          />
        </>
      )}
    </>
  )
}

function compareClassrooms(a, b) {
  return (a.name || '').localeCompare(b.name || '')
}

function UserManagementRow({ currentUserId, isPending, onUpdate, user }) {
  const isCurrentUser = user.user_id === currentUserId
  const disabled = isPending || isCurrentUser
  const label = user.display_name || user.email || 'Unknown user'

  return (
    <div className={styles.managementRow}>
      <div className={styles.managementIdentity}>
        <span className={styles.itemMain}>{label}</span>
        <span className={styles.itemMeta}>{user.email}</span>
      </div>
      <div className={styles.managementControls}>
        <select
          aria-label={`Role for ${label}`}
          className={styles.compactSelect}
          disabled={disabled}
          value={user.role || ROLES.STUDENT}
          onChange={(event) => onUpdate(user, { role: event.target.value })}
        >
          {USER_ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        <label className={styles.toggleLabel}>
          <input
            checked={user.active === true}
            disabled={disabled}
            onChange={(event) => onUpdate(user, { active: event.target.checked })}
            type="checkbox"
          />
          <span>Active</span>
        </label>
      </div>
    </div>
  )
}

function CreateClassroomForm({ disabled, onCreate }) {
  const [name, setName] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    const didCreate = await onCreate(trimmedName)
    if (didCreate) {
      setName('')
    }
  }

  return (
    <form className={styles.createForm} onSubmit={handleSubmit}>
      <input
        aria-label="New classroom name"
        className={styles.textInput}
        disabled={disabled}
        onChange={(event) => setName(event.target.value)}
        placeholder="New classroom"
        type="text"
        value={name}
      />
      <button
        className={styles.primaryButton}
        disabled={disabled || !name.trim()}
        type="submit"
      >
        Add
      </button>
    </form>
  )
}

function ClassroomManagementRow({ classroom, isPending, onUpdate }) {
  const [name, setName] = useState(classroom.name || '')

  useEffect(() => {
    setName(classroom.name || '')
  }, [classroom.name])

  const trimmedName = name.trim()
  const hasNameChange = trimmedName && trimmedName !== classroom.name

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!hasNameChange) return

    await onUpdate(classroom, { name: trimmedName })
  }

  return (
    <form className={styles.managementRow} onSubmit={handleSubmit}>
      <div className={styles.managementIdentity}>
        <input
          aria-label={`Name for ${classroom.name}`}
          className={styles.textInput}
          disabled={isPending}
          onChange={(event) => setName(event.target.value)}
          type="text"
          value={name}
        />
        <span className={styles.itemMeta}>
          {classroom.teacher_count} teachers / {classroom.student_count} students
        </span>
      </div>
      <div className={styles.managementControls}>
        <label className={styles.toggleLabel}>
          <input
            checked={classroom.active === true}
            disabled={isPending}
            onChange={(event) => onUpdate(classroom, { active: event.target.checked })}
            type="checkbox"
          />
          <span>Active</span>
        </label>
        <button
          className={styles.secondaryButton}
          disabled={isPending || !hasNameChange}
          type="submit"
        >
          Save
        </button>
      </div>
    </form>
  )
}

function MembershipPanel({
  classrooms,
  error,
  message,
  onAdd,
  onRemove,
  onSelectClassroom,
  pendingKey,
  selectedClassroomId,
  users,
}) {
  const selectedClassroom = classrooms.find((classroom) => classroom.classroom_id === selectedClassroomId)
  const memberships = useMemo(
    () => getActiveClassroomMemberships(users, selectedClassroomId),
    [users, selectedClassroomId],
  )

  return (
    <Panel title="Memberships" icon={<UsersIcon />}>
      {classrooms.length ? (
        <>
          <select
            aria-label="Classroom membership list"
            className={styles.select}
            onChange={(event) => onSelectClassroom(event.target.value)}
            value={selectedClassroomId}
          >
            {classrooms.map((classroom) => (
              <option key={classroom.classroom_id} value={classroom.classroom_id}>
                {classroom.name}
              </option>
            ))}
          </select>

          <AddMembershipForm
            disabled={!selectedClassroom || pendingKey?.startsWith('add:')}
            onAdd={onAdd}
            selectedClassroom={selectedClassroom}
            users={users}
          />

          {error && <p className={styles.errorNote}>{error}</p>}
          {message && <p className={styles.successNote}>{message}</p>}

          <List
            items={memberships}
            emptyLabel="No active members in this classroom."
            renderItem={(membership) => (
              <MembershipRow
                classroomId={selectedClassroomId}
                isPending={pendingKey === `remove:${selectedClassroomId}:${membership.user.user_id}`}
                membership={membership}
                onRemove={onRemove}
              />
            )}
          />
        </>
      ) : (
        <p className={styles.infoNote}>Create a classroom before adding members.</p>
      )}
    </Panel>
  )
}

function AddMembershipForm({ disabled, onAdd, selectedClassroom, users }) {
  const [membershipRole, setMembershipRole] = useState(ROLES.STUDENT)
  const [selectedUserId, setSelectedUserId] = useState('')
  const eligibleUsers = useMemo(
    () => users.filter((user) => (
      user.active === true &&
      user.role === membershipRole &&
      !hasActiveMembership(user, selectedClassroom?.classroom_id)
    )),
    [membershipRole, selectedClassroom?.classroom_id, users],
  )

  useEffect(() => {
    setSelectedUserId((currentId) => (
      eligibleUsers.some((user) => user.user_id === currentId)
        ? currentId
        : eligibleUsers[0]?.user_id || ''
    ))
  }, [eligibleUsers])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!selectedClassroom || !selectedUserId) return

    await onAdd({
      classroomId: selectedClassroom.classroom_id,
      userId: selectedUserId,
      membershipRole,
    })
  }

  return (
    <form className={styles.membershipForm} onSubmit={handleSubmit}>
      <select
        aria-label="Membership role"
        className={styles.compactSelect}
        disabled={disabled}
        onChange={(event) => setMembershipRole(event.target.value)}
        value={membershipRole}
      >
        <option value={ROLES.STUDENT}>student</option>
        <option value={ROLES.TEACHER}>teacher</option>
      </select>
      <select
        aria-label="User to add"
        className={styles.compactSelect}
        disabled={disabled || !eligibleUsers.length}
        onChange={(event) => setSelectedUserId(event.target.value)}
        value={selectedUserId}
      >
        {eligibleUsers.length ? (
          eligibleUsers.map((user) => (
            <option key={user.user_id} value={user.user_id}>
              {user.display_name || user.email}
            </option>
          ))
        ) : (
          <option value="">No eligible users</option>
        )}
      </select>
      <button
        className={styles.primaryButton}
        disabled={disabled || !selectedUserId}
        type="submit"
      >
        Add
      </button>
    </form>
  )
}

function MembershipRow({ classroomId, isPending, membership, onRemove }) {
  const { role, user } = membership

  return (
    <div className={styles.managementRow}>
      <div className={styles.managementIdentity}>
        <span className={styles.itemMain}>{user.display_name || user.email}</span>
        <span className={getRoleBadgeClass(role)}>{role}</span>
      </div>
      <button
        className={styles.secondaryButton}
        disabled={isPending}
        onClick={() => onRemove(classroomId, user)}
        type="button"
      >
        Remove
      </button>
    </div>
  )
}

function getActiveClassroomMemberships(users, classroomId) {
  if (!classroomId) return []

  return users
    .map((user) => {
      const membership = user.classroom_memberships?.find((entry) => (
        entry.classroom_id === classroomId && entry.active === true
      ))

      return membership ? { role: membership.role, user } : null
    })
    .filter(Boolean)
    .sort((a, b) => (
      a.role.localeCompare(b.role) ||
      (a.user.display_name || a.user.email || '').localeCompare(b.user.display_name || b.user.email || '')
    ))
}

function hasActiveMembership(user, classroomId) {
  if (!classroomId) return false

  return user.classroom_memberships?.some((membership) => (
    membership.classroom_id === classroomId && membership.active === true
  )) === true
}

function TeacherOverview() {
  const [classrooms, setClassrooms] = useState([])
  const [selectedClassroomId, setSelectedClassroomId] = useState('')
  const [students, setStudents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isStudentsLoading, setIsStudentsLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadClassrooms = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await getTeacherClassrooms()
      const nextClassrooms = response.classrooms || []
      setClassrooms(nextClassrooms)
      setSelectedClassroomId((currentId) => (
        nextClassrooms.some((classroom) => classroom.classroom_id === currentId)
          ? currentId
          : nextClassrooms[0]?.classroom_id || ''
      ))
    } catch (loadError) {
      setError(loadError.message || 'Unable to load teacher classrooms.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClassrooms()
  }, [loadClassrooms])

  useEffect(() => {
    if (!selectedClassroomId) {
      setStudents([])
      return
    }

    let isMounted = true
    setIsStudentsLoading(true)

    getTeacherClassroomStudents(selectedClassroomId)
      .then((response) => {
        if (!isMounted) return
        setStudents(response.students || [])
      })
      .catch((loadError) => {
        if (!isMounted) return
        setError(loadError.message || 'Unable to load classroom students.')
      })
      .finally(() => {
        if (!isMounted) return
        setIsStudentsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedClassroomId])

  return (
    <>
      <Panel
        title="Classrooms"
        icon={<SchoolIcon />}
        action={<RefreshButton onClick={loadClassrooms} disabled={isLoading} />}
      >
        {isLoading ? (
          <p className={styles.infoNote}>Loading classrooms...</p>
        ) : error ? (
          <p className={styles.errorNote}>{error}</p>
        ) : classrooms.length ? (
          <>
            <select
              className={styles.select}
              value={selectedClassroomId}
              onChange={(event) => setSelectedClassroomId(event.target.value)}
            >
              {classrooms.map((classroom) => (
                <option key={classroom.classroom_id} value={classroom.classroom_id}>
                  {classroom.name}
                </option>
              ))}
            </select>
            <List
              items={classrooms}
              emptyLabel="No classrooms found."
              renderItem={(classroom) => (
                <>
                  <span className={styles.itemMain}>{classroom.name}</span>
                  <span className={styles.itemMeta}>{classroom.student_count} students</span>
                </>
              )}
            />
          </>
        ) : (
          <p className={styles.infoNote}>No active classroom memberships found.</p>
        )}
      </Panel>

      <Panel title="Students" icon={<UsersIcon />}>
        {isStudentsLoading ? (
          <p className={styles.infoNote}>Loading students...</p>
        ) : (
          <List
            items={students}
            emptyLabel="No students found for this classroom."
            renderItem={(student) => (
              <>
                <span className={styles.itemMain}>{student.display_name || student.email}</span>
                <span className={styles.itemMeta}>{student.active ? 'active' : 'inactive'}</span>
              </>
            )}
          />
        )}
      </Panel>
    </>
  )
}

function StudentOverview({ currentUser }) {
  return (
    <Panel title="Student Access" icon={<InfoIcon />}>
      <p className={styles.infoNote}>
        Your account is active in {currentUser?.classroomIds?.length || 0} {currentUser?.classroomIds?.length === 1 ? 'classroom' : 'classrooms'}.
      </p>
    </Panel>
  )
}

function getRoleBadgeClass(role) {
  return [styles.roleBadge, styles[role]].filter(Boolean).join(' ')
}

function Panel({ title, icon, action, children }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>
          {icon}
          {title}
        </span>
        {action}
      </h3>
      <div className={styles.sectionContent}>
        {children}
      </div>
    </section>
  )
}

function Detail({ label, value }) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value || 'None'}</span>
    </div>
  )
}

function List({ items, emptyLabel, renderItem }) {
  if (!items.length) {
    return <p className={styles.infoNote}>{emptyLabel}</p>
  }

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.user_id || item.classroom_id || item.user?.user_id} className={styles.listItem}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  )
}

function Stat({ value, label }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statNumber}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

function RefreshButton({ onClick, disabled }) {
  return (
    <button type="button" className={styles.iconButton} onClick={onClick} disabled={disabled} aria-label="Refresh">
      <RefreshIcon />
    </button>
  )
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function SchoolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

export default RoleDemoUI
