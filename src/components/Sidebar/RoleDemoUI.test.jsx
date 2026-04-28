import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ROLES } from '../../data/rolePermissions.js'
import {
  createManagementClassroom,
  getManagementClassrooms,
  getManagementUsers,
  removeClassroomMember,
  upsertClassroomMember,
  updateManagementUser,
} from '../../services/api.js'
import { RoleDemoUI } from './RoleDemoUI.jsx'

vi.mock('../../hooks/useAuth.js', () => ({
  useAuth: () => ({
    currentUser: {
      userId: 'admin-1',
      displayName: 'Admin User',
      email: 'admin@example.com',
      classroomIds: [],
    },
    isAdmin: true,
    isTeacher: false,
    primaryRole: ROLES.ADMIN,
  }),
}))

vi.mock('../../services/api.js', () => ({
  createManagementClassroom: vi.fn(),
  getManagementClassrooms: vi.fn(),
  getManagementUsers: vi.fn(),
  getTeacherClassroomStudents: vi.fn(),
  getTeacherClassrooms: vi.fn(),
  removeClassroomMember: vi.fn(),
  updateManagementClassroom: vi.fn(),
  updateManagementUser: vi.fn(),
  upsertClassroomMember: vi.fn(),
}))

const adminUser = {
  user_id: 'admin-1',
  email: 'admin@example.com',
  display_name: 'Admin User',
  role: ROLES.ADMIN,
  active: true,
  classroom_memberships: [],
}

const teacherUser = {
  user_id: 'teacher-1',
  email: 'teacher@example.com',
  display_name: 'Teacher User',
  role: ROLES.TEACHER,
  active: true,
  classroom_memberships: [
    {
      classroom_id: 'class-1',
      classroom_name: 'Demo Classroom',
      role: ROLES.TEACHER,
      active: true,
    },
  ],
}

const studentUser = {
  user_id: 'student-1',
  email: 'student@example.com',
  display_name: 'Student User',
  role: ROLES.STUDENT,
  active: true,
  classroom_memberships: [],
}

const classroom = {
  classroom_id: 'class-1',
  name: 'Demo Classroom',
  active: true,
  teacher_count: 1,
  student_count: 0,
}

function seedManagementData({
  users = [adminUser, teacherUser, studentUser],
  classrooms = [classroom],
} = {}) {
  getManagementUsers.mockResolvedValue({ users })
  getManagementClassrooms.mockResolvedValue({ classrooms })
}

describe('RoleDemoUI admin management', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    seedManagementData()
    createManagementClassroom.mockResolvedValue({
      classroom: {
        classroom_id: 'class-2',
        name: 'New Class',
        active: true,
        teacher_count: 0,
        student_count: 0,
      },
    })
    updateManagementUser.mockResolvedValue({
      user: {
        ...studentUser,
        role: ROLES.TEACHER,
      },
    })
    upsertClassroomMember.mockResolvedValue({
      membership: {
        classroom_id: 'class-1',
        user_id: 'student-1',
        membership_role: ROLES.STUDENT,
        active: true,
      },
    })
    removeClassroomMember.mockResolvedValue({
      membership: {
        classroom_id: 'class-1',
        user_id: 'teacher-1',
        membership_role: ROLES.TEACHER,
        active: false,
      },
    })
  })

  it('lets admins update an existing user role', async () => {
    render(<RoleDemoUI />)

    const roleSelect = await screen.findByLabelText('Role for Student User')
    fireEvent.change(roleSelect, { target: { value: ROLES.TEACHER } })

    await waitFor(() => {
      expect(updateManagementUser).toHaveBeenCalledWith('student-1', { role: ROLES.TEACHER })
    })
    expect(await screen.findByText('Student User updated.')).toBeInTheDocument()
  })

  it('lets admins create classrooms', async () => {
    render(<RoleDemoUI />)

    const input = await screen.findByLabelText('New classroom name')
    fireEvent.change(input, { target: { value: 'New Class' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(createManagementClassroom).toHaveBeenCalledWith({ name: 'New Class' })
    })
    expect(await screen.findByText('New Class created.')).toBeInTheDocument()
  })

  it('lets admins add and remove classroom memberships', async () => {
    render(<RoleDemoUI />)

    const userSelect = await screen.findByLabelText('User to add')

    fireEvent.submit(userSelect.closest('form'))

    await waitFor(() => {
      expect(upsertClassroomMember).toHaveBeenCalledWith('class-1', {
        user_id: 'student-1',
        membership_role: ROLES.STUDENT,
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => {
      expect(removeClassroomMember).toHaveBeenCalledWith('class-1', 'teacher-1')
    })
  })
})
