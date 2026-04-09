import { useSidebar } from '../../hooks/useSidebar.js'
import { ROLES } from '../../data/rolePermissions.js'
import styles from './RoleDemoUI.module.css'

export function RoleDemoUI() {
  const { currentRole } = useSidebar()
  const isTeacher = currentRole === ROLES.TEACHER || currentRole === ROLES.ADMIN
  const isAdmin = currentRole === ROLES.ADMIN

  return (
    <div className={styles.container}>
      <ConversationHistory role={currentRole} />
      {isTeacher && <DashboardPanel isAdmin={isAdmin} />}
      {isTeacher && <StudentManagement />}
      {isTeacher && <CurriculumViewer />}
      {isAdmin && <ClassroomManagement />}
      {isAdmin && <UserManagement />}
    </div>
  )
}

function ConversationHistory({ role }) {
  const isTeacher = role === ROLES.TEACHER || role === ROLES.ADMIN
  const isAdmin = role === ROLES.ADMIN

  const conversations = [
    { title: 'Global warming causes', date: 'Mar 2' },
    { title: 'Water cycle question', date: 'Mar 1' },
    { title: 'Carbon footprint', date: 'Feb 28' },
  ]

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionHeader}>
        <HistoryIcon />
        Conversations
      </h3>
      <div className={styles.sectionContent}>
        {isAdmin && (
          <select className={styles.mockSelect} disabled>
            <option>All Classrooms</option>
            <option>Class 7B</option>
            <option>Class 8A</option>
          </select>
        )}
        {isTeacher && (
          <select className={styles.mockSelect} disabled>
            <option>All Students</option>
            <option>Student 1</option>
            <option>Student 2</option>
          </select>
        )}
        <ul className={styles.mockList}>
          {conversations.map((conv, i) => (
            <li key={i} className={styles.mockListItem}>
              <span className={styles.mockListTitle}>{conv.title}</span>
              <span className={styles.mockListMeta}>{conv.date}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function DashboardPanel({ isAdmin }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionHeader}>
        <DashboardIcon />
        Dashboard
      </h3>
      <div className={styles.sectionContent}>
        <div className={styles.statCards}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>24</span>
            <span className={styles.statLabel}>Questions</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>18</span>
            <span className={styles.statLabel}>Students</span>
          </div>
        </div>

        {isAdmin && (
          <label className={styles.mockCheckboxLabel}>
            <input type="checkbox" disabled />
            <span>Show system-wide stats</span>
          </label>
        )}

        <div className={styles.topTopics}>
          <span className={styles.topTopicsLabel}>Top Topics:</span>
          <ul className={styles.mockListCompact}>
            <li>Greenhouse gases (12)</li>
            <li>Water cycle (8)</li>
            <li>Carbon cycle (5)</li>
          </ul>
        </div>

        <select className={styles.mockSelect} disabled>
          <option>Export Report...</option>
          <option>Export as CSV</option>
          <option>Export as PDF</option>
        </select>
      </div>
    </section>
  )
}

function StudentManagement() {
  const students = [
    { name: 'Student 1', code: 'ABC123', status: 'active' },
    { name: 'Student 2', code: 'DEF456', status: 'active' },
    { name: 'Student 3', code: null, status: 'revoked' },
  ]

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionHeader}>
        <UsersIcon />
        Students
      </h3>
      <div className={styles.sectionContent}>
        <ul className={styles.mockList}>
          {students.map((student, i) => (
            <li key={i} className={styles.mockListItem}>
              <span className={styles.mockListTitle}>{student.name}</span>
              {student.status === 'active' ? (
                <span className={styles.codeBadge}>{student.code}</span>
              ) : (
                <span className={styles.revokedBadge}>Revoked</span>
              )}
            </li>
          ))}
        </ul>
        <div className={styles.buttonGroup}>
          <button className={styles.mockButton} disabled>
            + Generate New Code
          </button>
          <select className={styles.mockSelect} disabled>
            <option>Revoke Code...</option>
            <option>Student 1</option>
            <option>Student 2</option>
          </select>
        </div>
      </div>
    </section>
  )
}

function CurriculumViewer() {
  const documents = [
    { name: 'Climate_Basics.pdf', status: 'indexed' },
    { name: 'Water_Cycle.pdf', status: 'indexed' },
    { name: 'Carbon_Unit.docx', status: 'processing' },
  ]

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionHeader}>
        <BookIcon />
        Curriculum
      </h3>
      <div className={styles.sectionContent}>
        <ul className={styles.mockList}>
          {documents.map((doc, i) => (
            <li key={i} className={styles.mockListItem}>
              <span className={styles.mockListTitle}>{doc.name}</span>
              <span className={`${styles.statusBadge} ${styles[doc.status]}`}>
                {doc.status}
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.infoNote}>
          <InfoIcon />
          Curriculum managed by development team
        </p>
      </div>
    </section>
  )
}

function ClassroomManagement() {
  const classrooms = [
    { name: 'Class 7B', teacher: 'Ms. Smith' },
    { name: 'Class 8A', teacher: 'Mr. Jones' },
    { name: 'Class 6C', teacher: null },
  ]

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionHeader}>
        <SchoolIcon />
        Classrooms
      </h3>
      <div className={styles.sectionContent}>
        <ul className={styles.mockList}>
          {classrooms.map((classroom, i) => (
            <li key={i} className={styles.mockListItem}>
              <span className={styles.mockListTitle}>{classroom.name}</span>
              <span className={styles.mockListMeta}>
                {classroom.teacher || '(unassigned)'}
              </span>
            </li>
          ))}
        </ul>
        <div className={styles.buttonGroup}>
          <button className={styles.mockButton} disabled>
            + Create Classroom
          </button>
          <select className={styles.mockSelect} disabled>
            <option>Assign Teacher...</option>
            <option>Ms. Smith</option>
            <option>Mr. Jones</option>
          </select>
        </div>
      </div>
    </section>
  )
}

function UserManagement() {
  const teachers = [
    { name: 'Ms. Smith', email: 'smith@school.cz' },
    { name: 'Mr. Jones', email: 'jones@school.cz' },
  ]

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionHeader}>
        <UserIcon />
        Teachers
      </h3>
      <div className={styles.sectionContent}>
        <ul className={styles.mockList}>
          {teachers.map((teacher, i) => (
            <li key={i} className={styles.mockListItem}>
              <span className={styles.mockListTitle}>{teacher.name}</span>
              <button className={styles.mockButtonSmall} disabled>
                Reset Password
              </button>
            </li>
          ))}
        </ul>
        <button className={styles.mockButton} disabled>
          + Create Teacher Account
        </button>
      </div>
    </section>
  )
}

// Icons
function HistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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

function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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
