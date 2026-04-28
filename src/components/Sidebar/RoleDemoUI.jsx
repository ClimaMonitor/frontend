import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { ROLES } from '../../data/rolePermissions.js'
import {
  createManagementClassroom,
  getManagementClassrooms,
  getManagementUsers,
  getTeacherClassroomStudents,
  getTeacherClassrooms,
  removeClassroomMember,
  updateManagementClassroom,
  updateManagementUser,
  upsertClassroomMember,
} from '../../services/api.js'
import styles from './RoleDemoUI.module.css'

const USER_ROLE_OPTIONS = [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN]
const ADMIN_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'classrooms', label: 'Classrooms' },
  { id: 'members', label: 'Members' },
]
const TEACHER_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'students', label: 'Students' },
]

export function RoleDemoUI() {
  const { currentUser, isAdmin, isTeacher, primaryRole } = useAuth()

  if (!primaryRole) {
    return (
      <Workspace>
        <EmptyState
          icon={<InfoIcon />}
          title="Role access"
          message="Sign in with a seeded account to load your role and classroom access."
        />
      </Workspace>
    )
  }

  return (
    <Workspace>
      {isAdmin && <AdminWorkspace currentUser={currentUser} primaryRole={primaryRole} />}
      {isTeacher && !isAdmin && <TeacherWorkspace currentUser={currentUser} primaryRole={primaryRole} />}
      {primaryRole === ROLES.STUDENT && <StudentWorkspace currentUser={currentUser} primaryRole={primaryRole} />}
    </Workspace>
  )
}

function Workspace({ children }) {
  return <div className={styles.workspace}>{children}</div>
}

function AdminWorkspace({ currentUser, primaryRole }) {
  const [users, setUsers] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [selectedClassroomId, setSelectedClassroomId] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [pendingUserId, setPendingUserId] = useState(null)
  const [pendingClassroomId, setPendingClassroomId] = useState(null)
  const [pendingMembershipKey, setPendingMembershipKey] = useState(null)
  const [error, setError] = useState(null)
  const [userNotice, setUserNotice] = useState(null)
  const [classroomNotice, setClassroomNotice] = useState(null)
  const [membershipNotice, setMembershipNotice] = useState(null)

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
    setUserNotice(null)
    setClassroomNotice(null)
    setMembershipNotice(null)

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
      setUserNotice({ type: 'error', message: 'Use the database directly if you need to change your own admin account.' })
      return
    }

    setPendingUserId(user.user_id)
    setUserNotice(null)

    try {
      const response = await updateManagementUser(user.user_id, patch)
      const updatedUser = response.user

      setUsers((currentUsers) => currentUsers.map((current) => (
        current.user_id === updatedUser.user_id ? updatedUser : current
      )))
      setUserNotice({ type: 'success', message: `${updatedUser.display_name || updatedUser.email} updated.` })
    } catch (updateError) {
      setUserNotice({ type: 'error', message: updateError.message || 'Unable to update user.' })
    } finally {
      setPendingUserId(null)
    }
  }, [currentUser?.userId])

  const createClassroom = useCallback(async (name) => {
    setPendingClassroomId('new')
    setClassroomNotice(null)

    try {
      const response = await createManagementClassroom({ name })
      const classroom = response.classroom

      setClassrooms((currentClassrooms) => [...currentClassrooms, classroom].sort(compareClassrooms))
      setSelectedClassroomId(classroom.classroom_id)
      setClassroomNotice({ type: 'success', message: `${classroom.name} created.` })
      return true
    } catch (createError) {
      setClassroomNotice({ type: 'error', message: createError.message || 'Unable to create classroom.' })
      return false
    } finally {
      setPendingClassroomId(null)
    }
  }, [])

  const updateClassroom = useCallback(async (classroom, patch) => {
    setPendingClassroomId(classroom.classroom_id)
    setClassroomNotice(null)

    try {
      const response = await updateManagementClassroom(classroom.classroom_id, patch)
      const updatedClassroom = response.classroom

      setClassrooms((currentClassrooms) => currentClassrooms
        .map((current) => (
          current.classroom_id === updatedClassroom.classroom_id ? updatedClassroom : current
        ))
        .sort(compareClassrooms))
      setClassroomNotice({ type: 'success', message: `${updatedClassroom.name} updated.` })
      return true
    } catch (updateError) {
      setClassroomNotice({ type: 'error', message: updateError.message || 'Unable to update classroom.' })
      return false
    } finally {
      setPendingClassroomId(null)
    }
  }, [])

  const addMembership = useCallback(async ({ classroomId, userId, membershipRole }) => {
    setPendingMembershipKey(`add:${classroomId}`)
    setMembershipNotice(null)

    try {
      await upsertClassroomMember(classroomId, {
        user_id: userId,
        membership_role: membershipRole,
      })
      await refreshManagementData()
      setMembershipNotice({ type: 'success', message: 'Membership added.' })
      return true
    } catch (addError) {
      setMembershipNotice({ type: 'error', message: addError.message || 'Unable to add classroom membership.' })
      return false
    } finally {
      setPendingMembershipKey(null)
    }
  }, [refreshManagementData])

  const removeMembership = useCallback(async (classroomId, user) => {
    setPendingMembershipKey(`remove:${classroomId}:${user.user_id}`)
    setMembershipNotice(null)

    try {
      await removeClassroomMember(classroomId, user.user_id)
      await refreshManagementData()
      setMembershipNotice({ type: 'success', message: `${user.display_name || user.email} removed from classroom.` })
    } catch (removeError) {
      setMembershipNotice({ type: 'error', message: removeError.message || 'Unable to remove classroom membership.' })
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
      <WorkspaceHero
        action={<RefreshButton onClick={load} disabled={isLoading} />}
        currentUser={currentUser}
        icon={<DashboardIcon />}
        kicker="Admin workspace"
        primaryRole={primaryRole}
        title="Manage access"
      >
        <MetricStrip>
          <Metric value={users.length} label="Users" />
          <Metric value={classrooms.length} label="Classrooms" />
          <Metric value={counts.teachers} label="Teachers" />
          <Metric value={counts.students} label="Students" />
        </MetricStrip>
      </WorkspaceHero>

      <Tabs activeTab={activeTab} tabs={ADMIN_TABS} onChange={setActiveTab} />

      <div className={styles.tabPanel}>
        {isLoading ? (
          <EmptyState icon={<InfoIcon />} title="Loading management data" message="Fetching users and classrooms from the backend." />
        ) : error ? (
          <EmptyState icon={<InfoIcon />} title="Management data unavailable" message={error} tone="error" />
        ) : (
          <>
            {activeTab === 'overview' && (
              <AdminOverview
                classrooms={classrooms}
                counts={counts}
                currentUser={currentUser}
                users={users}
                onOpenTab={setActiveTab}
              />
            )}
            {activeTab === 'users' && (
              <UsersPanel
                counts={counts}
                currentUserId={currentUser?.userId}
                notice={userNotice}
                onUpdate={updateUser}
                pendingUserId={pendingUserId}
                users={users}
              />
            )}
            {activeTab === 'classrooms' && (
              <ClassroomsPanel
                classrooms={classrooms}
                notice={classroomNotice}
                onCreate={createClassroom}
                onUpdate={updateClassroom}
                pendingClassroomId={pendingClassroomId}
              />
            )}
            {activeTab === 'members' && (
              <MembershipPanel
                classrooms={classrooms}
                notice={membershipNotice}
                onAdd={addMembership}
                onRemove={removeMembership}
                onSelectClassroom={setSelectedClassroomId}
                pendingKey={pendingMembershipKey}
                selectedClassroomId={selectedClassroomId}
                users={users}
              />
            )}
          </>
        )}
      </div>
    </>
  )
}

function AdminOverview({ classrooms, counts, currentUser, users, onOpenTab }) {
  const activeClassrooms = classrooms.filter((classroom) => classroom.active === true).length
  const activeUsers = users.filter((user) => user.active === true).length

  return (
    <div className={styles.panelStack}>
      <Section title="Snapshot" icon={<DashboardIcon />}>
        <div className={styles.summaryGrid}>
          <SummaryItem label="Signed in as" value={currentUser?.displayName || currentUser?.email || 'Unknown'} />
          <SummaryItem label="Active users" value={`${activeUsers} of ${users.length}`} />
          <SummaryItem label="Active classrooms" value={`${activeClassrooms} of ${classrooms.length}`} />
          <SummaryItem label="Role mix" value={`${counts.admins} admin / ${counts.teachers} teacher / ${counts.students} student`} />
        </div>
      </Section>

      <Section title="Common tasks" icon={<InfoIcon />}>
        <div className={styles.actionGrid}>
          <button type="button" className={styles.taskButton} onClick={() => onOpenTab('users')}>
            <span>Review users</span>
            <small>Set role and active status</small>
          </button>
          <button type="button" className={styles.taskButton} onClick={() => onOpenTab('classrooms')}>
            <span>Manage classrooms</span>
            <small>Create, rename, or deactivate</small>
          </button>
          <button type="button" className={styles.taskButton} onClick={() => onOpenTab('members')}>
            <span>Edit memberships</span>
            <small>Add teachers and students</small>
          </button>
        </div>
      </Section>
    </div>
  )
}

function UsersPanel({ counts, currentUserId, notice, onUpdate, pendingUserId, users }) {
  return (
    <Section title="Users" icon={<UsersIcon />}>
      <MetricStrip>
        <Metric value={counts.admins} label="Admins" />
        <Metric value={counts.teachers} label="Teachers" />
        <Metric value={counts.students} label="Students" />
      </MetricStrip>
      <Notice notice={notice} />
      <List
        items={users}
        emptyLabel="No users found."
        renderItem={(user) => (
          <UserManagementRow
            currentUserId={currentUserId}
            isPending={pendingUserId === user.user_id}
            onUpdate={onUpdate}
            user={user}
          />
        )}
      />
    </Section>
  )
}

function ClassroomsPanel({ classrooms, notice, onCreate, onUpdate, pendingClassroomId }) {
  return (
    <Section title="Classrooms" icon={<SchoolIcon />}>
      <CreateClassroomForm
        disabled={pendingClassroomId === 'new'}
        onCreate={onCreate}
      />
      <Notice notice={notice} />
      <List
        items={classrooms}
        emptyLabel="No classrooms found."
        renderItem={(classroom) => (
          <ClassroomManagementRow
            classroom={classroom}
            isPending={pendingClassroomId === classroom.classroom_id}
            onUpdate={onUpdate}
          />
        )}
      />
    </Section>
  )
}

function UserManagementRow({ currentUserId, isPending, onUpdate, user }) {
  const isCurrentUser = user.user_id === currentUserId
  const disabled = isPending || isCurrentUser
  const label = user.display_name || user.email || 'Unknown user'

  return (
    <div className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.itemTitle}>{label}</span>
        <span className={styles.itemMeta}>{user.email}</span>
      </div>
      <div className={styles.rowControls}>
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
    <form className={styles.row} onSubmit={handleSubmit}>
      <div className={styles.rowMain}>
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
      <div className={styles.rowControls}>
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
  notice,
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
    <Section title="Memberships" icon={<UsersIcon />}>
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

          <Notice notice={notice} />

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
        <EmptyState icon={<SchoolIcon />} title="No classrooms yet" message="Create a classroom before adding members." />
      )}
    </Section>
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
    <div className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.itemTitle}>{user.display_name || user.email}</span>
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

function TeacherWorkspace({ currentUser, primaryRole }) {
  const [classrooms, setClassrooms] = useState([])
  const [selectedClassroomId, setSelectedClassroomId] = useState('')
  const [students, setStudents] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
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
      return undefined
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

  const selectedClassroom = classrooms.find((classroom) => classroom.classroom_id === selectedClassroomId)

  return (
    <>
      <WorkspaceHero
        action={<RefreshButton onClick={loadClassrooms} disabled={isLoading} />}
        currentUser={currentUser}
        icon={<SchoolIcon />}
        kicker="Teacher workspace"
        primaryRole={primaryRole}
        title="Classroom view"
      >
        <MetricStrip>
          <Metric value={classrooms.length} label="Classrooms" />
          <Metric value={students.length} label="Students shown" />
        </MetricStrip>
      </WorkspaceHero>

      <Tabs activeTab={activeTab} tabs={TEACHER_TABS} onChange={setActiveTab} />

      <div className={styles.tabPanel}>
        {isLoading ? (
          <EmptyState icon={<InfoIcon />} title="Loading classrooms" message="Fetching your active classroom memberships." />
        ) : error ? (
          <EmptyState icon={<InfoIcon />} title="Teacher data unavailable" message={error} tone="error" />
        ) : activeTab === 'overview' ? (
          <TeacherOverviewPanel
            classrooms={classrooms}
            selectedClassroom={selectedClassroom}
            selectedClassroomId={selectedClassroomId}
            setSelectedClassroomId={setSelectedClassroomId}
          />
        ) : (
          <TeacherStudentsPanel
            classrooms={classrooms}
            isStudentsLoading={isStudentsLoading}
            selectedClassroomId={selectedClassroomId}
            setSelectedClassroomId={setSelectedClassroomId}
            students={students}
          />
        )}
      </div>
    </>
  )
}

function TeacherOverviewPanel({ classrooms, selectedClassroom, selectedClassroomId, setSelectedClassroomId }) {
  return (
    <div className={styles.panelStack}>
      <Section title="Classroom" icon={<SchoolIcon />}>
        {classrooms.length ? (
          <>
            <select
              aria-label="Teacher classroom"
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
            <div className={styles.summaryGrid}>
              <SummaryItem label="Selected classroom" value={selectedClassroom?.name || 'None'} />
              <SummaryItem label="Students" value={String(selectedClassroom?.student_count || 0)} />
            </div>
          </>
        ) : (
          <EmptyState icon={<SchoolIcon />} title="No classrooms" message="No active classroom memberships found." />
        )}
      </Section>
    </div>
  )
}

function TeacherStudentsPanel({ classrooms, isStudentsLoading, selectedClassroomId, setSelectedClassroomId, students }) {
  return (
    <Section title="Students" icon={<UsersIcon />}>
      {classrooms.length ? (
        <>
          <select
            aria-label="Teacher student classroom"
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
          {isStudentsLoading ? (
            <EmptyState icon={<InfoIcon />} title="Loading students" message="Fetching the selected classroom roster." />
          ) : (
            <List
              items={students}
              emptyLabel="No students found for this classroom."
              renderItem={(student) => (
                <div className={styles.row}>
                  <div className={styles.rowMain}>
                    <span className={styles.itemTitle}>{student.display_name || student.email}</span>
                    <span className={styles.itemMeta}>{student.email}</span>
                  </div>
                  <span className={student.active ? styles.statusPill : styles.inactivePill}>
                    {student.active ? 'active' : 'inactive'}
                  </span>
                </div>
              )}
            />
          )}
        </>
      ) : (
        <EmptyState icon={<SchoolIcon />} title="No classrooms" message="No active classroom memberships found." />
      )}
    </Section>
  )
}

function StudentWorkspace({ currentUser, primaryRole }) {
  return (
    <>
      <WorkspaceHero
        currentUser={currentUser}
        icon={<UserIcon />}
        kicker="Student workspace"
        primaryRole={primaryRole}
        title="Your access"
      >
        <MetricStrip>
          <Metric value={currentUser?.classroomIds?.length || 0} label="Classrooms" />
        </MetricStrip>
      </WorkspaceHero>

      <Section title="Access" icon={<InfoIcon />}>
        <EmptyState
          icon={<InfoIcon />}
          title="Ready for chat"
          message={`Your account is active in ${currentUser?.classroomIds?.length || 0} ${currentUser?.classroomIds?.length === 1 ? 'classroom' : 'classrooms'}.`}
        />
      </Section>
    </>
  )
}

function WorkspaceHero({ action, children, currentUser, icon, kicker, primaryRole, title }) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroTop}>
        <div className={styles.heroIcon}>{icon}</div>
        <div className={styles.heroText}>
          <span className={styles.kicker}>{kicker}</span>
          <h2>{title}</h2>
          <p>{currentUser?.displayName || currentUser?.email || 'Unknown user'} · {primaryRole}</p>
        </div>
        {action}
      </div>
      {children}
    </header>
  )
}

function Tabs({ activeTab, onChange, tabs }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Role workspace sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          aria-selected={activeTab === tab.id}
          className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ''}`}
          onClick={() => onChange(tab.id)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function Section({ action, children, icon, title }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>
          {icon}
          {title}
        </span>
        {action}
      </div>
      <div className={styles.sectionContent}>
        {children}
      </div>
    </section>
  )
}

function MetricStrip({ children }) {
  return <div className={styles.metricStrip}>{children}</div>
}

function Metric({ value, label }) {
  return (
    <div className={styles.metric}>
      <span>{value}</span>
      <small>{label}</small>
    </div>
  )
}

function SummaryItem({ label, value }) {
  return (
    <div className={styles.summaryItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Notice({ notice }) {
  if (!notice) return null

  return (
    <p className={notice.type === 'error' ? styles.errorNote : styles.successNote}>
      {notice.message}
    </p>
  )
}

function EmptyState({ icon, message, title, tone = 'neutral' }) {
  return (
    <div className={`${styles.emptyState} ${tone === 'error' ? styles.emptyStateError : ''}`}>
      <span className={styles.emptyIcon}>{icon}</span>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}

function compareClassrooms(a, b) {
  return (a.name || '').localeCompare(b.name || '')
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

function getRoleBadgeClass(role) {
  return [styles.roleBadge, styles[role]].filter(Boolean).join(' ')
}

function List({ items, emptyLabel, renderItem }) {
  if (!items.length) {
    return <EmptyState icon={<InfoIcon />} title="Nothing here yet" message={emptyLabel} />
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
