export const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
}

export const ROLE_LABELS = {
  [ROLES.STUDENT]: 'Student',
  [ROLES.TEACHER]: 'Teacher',
  [ROLES.ADMIN]: 'Admin',
}

export const PERMISSION_CATEGORIES = [
  {
    name: 'Chat',
    permissions: [
      {
        key: 'chat_send',
        label: 'Send messages to chatbot',
        roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN]
      },
      {
        key: 'chat_view_sources',
        label: 'View sources/references for answers',
        roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN]
      },
    ]
  },
  {
    name: 'Conversations',
    permissions: [
      {
        key: 'conv_view_own',
        label: 'View own conversation history',
        roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN]
      },
      {
        key: 'conv_view_students',
        label: 'View all students\' conversations in classroom',
        roles: [ROLES.TEACHER, ROLES.ADMIN]
      },
      {
        key: 'conv_view_all_classrooms',
        label: 'View conversations across all classrooms',
        roles: [ROLES.ADMIN]
      },
      {
        key: 'conv_delete',
        label: 'Delete conversations',
        roles: [ROLES.ADMIN]
      },
      {
        key: 'conv_export',
        label: 'Export conversation data',
        roles: [ROLES.TEACHER, ROLES.ADMIN]
      },
    ]
  },
  {
    name: 'Curriculum',
    permissions: [
      {
        key: 'curriculum_view',
        label: 'View curriculum documents',
        roles: [ROLES.TEACHER, ROLES.ADMIN]
      },
      {
        key: 'curriculum_modify',
        label: 'Upload/edit/delete curriculum',
        roles: [] // No one can modify for MVP
      },
    ]
  },
  {
    name: 'Dashboard',
    permissions: [
      {
        key: 'dashboard_view',
        label: 'Access teacher dashboard',
        roles: [ROLES.TEACHER, ROLES.ADMIN]
      },
      {
        key: 'dashboard_stats',
        label: 'View usage statistics',
        roles: [ROLES.TEACHER, ROLES.ADMIN]
      },
      {
        key: 'dashboard_stats_all',
        label: 'View system-wide statistics',
        roles: [ROLES.ADMIN]
      },
      {
        key: 'dashboard_export',
        label: 'Export dashboard reports',
        roles: [ROLES.TEACHER, ROLES.ADMIN]
      },
    ]
  },
  {
    name: 'Student Management',
    permissions: [
      {
        key: 'students_view',
        label: 'View list of students in classroom',
        roles: [ROLES.TEACHER, ROLES.ADMIN]
      },
      {
        key: 'access_codes_generate',
        label: 'Generate student access codes',
        roles: [ROLES.TEACHER, ROLES.ADMIN]
      },
      {
        key: 'access_codes_revoke',
        label: 'Revoke student access codes',
        roles: [ROLES.TEACHER, ROLES.ADMIN]
      },
    ]
  },
  {
    name: 'Classroom Management',
    permissions: [
      {
        key: 'classroom_create',
        label: 'Create classrooms',
        roles: [ROLES.ADMIN]
      },
      {
        key: 'classroom_delete',
        label: 'Delete classrooms',
        roles: [ROLES.ADMIN]
      },
      {
        key: 'classroom_assign_teachers',
        label: 'Assign teachers to classrooms',
        roles: [ROLES.ADMIN]
      },
    ]
  },
  {
    name: 'User Management',
    permissions: [
      {
        key: 'teachers_create',
        label: 'Create teacher accounts',
        roles: [ROLES.ADMIN]
      },
      {
        key: 'teachers_delete',
        label: 'Delete teacher accounts',
        roles: [ROLES.ADMIN]
      },
      {
        key: 'teachers_reset',
        label: 'Reset teacher credentials',
        roles: [ROLES.ADMIN]
      },
    ]
  },
]

export const RATE_LIMITS = {
  [ROLES.STUDENT]: { questionsPerHour: 30 },
  [ROLES.TEACHER]: { questionsPerHour: 60 },
  [ROLES.ADMIN]: { questionsPerHour: 60 },
}

export function hasPermission(role, permissionKey) {
  for (const category of PERMISSION_CATEGORIES) {
    const permission = category.permissions.find(p => p.key === permissionKey)
    if (permission) {
      return permission.roles.includes(role)
    }
  }
  return false
}
