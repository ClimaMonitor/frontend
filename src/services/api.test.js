import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api, {
  createManagementClassroom,
  getCurrentUser,
  getManagementClassrooms,
  getManagementUsers,
  getTeacherClassroomStudents,
  getTeacherClassrooms,
  removeClassroomMember,
  sendMessage,
  setAccessTokenProvider,
  updateManagementClassroom,
  updateManagementUser,
  upsertClassroomMember,
} from './api.js'

function createAdapter(handler = async (config) => ({
  data: { ok: true },
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
})) {
  return vi.fn(handler)
}

describe('api auth and payload handling', () => {
  beforeEach(() => {
    setAccessTokenProvider(null)
  })

  afterEach(() => {
    setAccessTokenProvider(null)
  })

  it('sends user and classroom ids only for explicit anonymous local-mode requests', async () => {
    const adapter = createAdapter(async (config) => ({
      data: {
        requestBody: JSON.parse(config.data),
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }))

    setAccessTokenProvider(async () => ({
      token: null,
      allowAnonymousRequest: true,
    }))

    const response = await sendMessage('Hello climate', null, {
      allowAnonymousRequest: true,
      signal: undefined,
      adapter,
    })

    expect(response.requestBody).toMatchObject({
      message: 'Hello climate',
      user_id: 'student_mock',
      classroom_id: 'class_mock',
    })
  })

  it('omits user identity fields for authenticated requests', async () => {
    const adapter = createAdapter(async (config) => ({
      data: {
        requestBody: JSON.parse(config.data),
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }))

    setAccessTokenProvider(async () => ({
      token: 'token-123',
      allowAnonymousRequest: false,
    }))

    const response = await sendMessage('Hello climate', null, {
      adapter,
    })

    expect(response.requestBody).toEqual({
      message: 'Hello climate',
    })
  })

  it('rejects requests when authentication fails outside anonymous mode', async () => {
    const adapter = createAdapter()

    setAccessTokenProvider(async () => ({
      token: null,
      allowAnonymousRequest: false,
    }))

    await expect(api.get('/chat/completions', { adapter })).rejects.toMatchObject({
      message: 'An unexpected error occurred. Please try again.',
    })
    expect(adapter).not.toHaveBeenCalled()
  })

  it('calls the current user endpoint with bearer auth', async () => {
    const adapter = createAdapter(async (config) => ({
      data: {
        url: config.url,
        method: config.method,
        authorization: config.headers.Authorization,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }))

    setAccessTokenProvider(async () => ({
      token: 'token-123',
      allowAnonymousRequest: false,
    }))

    await expect(getCurrentUser({ adapter })).resolves.toMatchObject({
      url: '/me',
      method: 'get',
      authorization: 'Bearer token-123',
    })
  })

  it('uses management routes for admin-backed user and classroom APIs', async () => {
    const calls = []
    const adapter = createAdapter(async (config) => {
      calls.push({
        method: config.method,
        url: config.url,
        body: config.data ? JSON.parse(config.data) : null,
      })

      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    })

    setAccessTokenProvider(async () => ({
      token: 'token-123',
      allowAnonymousRequest: false,
    }))

    await getManagementUsers({ adapter })
    await updateManagementUser('user-1', { active: false }, { adapter })
    await getManagementClassrooms({ adapter })
    await createManagementClassroom({ name: 'Class 7B' }, { adapter })
    await updateManagementClassroom('class-1', { active: false }, { adapter })
    await upsertClassroomMember('class-1', { user_id: 'user-1', membership_role: 'student' }, { adapter })
    await removeClassroomMember('class-1', 'user-1', { adapter })

    expect(calls).toEqual([
      { method: 'get', url: '/management/users', body: null },
      { method: 'patch', url: '/management/users/user-1', body: { active: false } },
      { method: 'get', url: '/management/classrooms', body: null },
      { method: 'post', url: '/management/classrooms', body: { name: 'Class 7B' } },
      { method: 'patch', url: '/management/classrooms/class-1', body: { active: false } },
      {
        method: 'put',
        url: '/management/classrooms/class-1/members',
        body: { user_id: 'user-1', membership_role: 'student' },
      },
      { method: 'delete', url: '/management/classrooms/class-1/members/user-1', body: null },
    ])
  })

  it('uses teacher-scoped classroom routes', async () => {
    const calls = []
    const adapter = createAdapter(async (config) => {
      calls.push({
        method: config.method,
        url: config.url,
      })

      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    })

    setAccessTokenProvider(async () => ({
      token: 'token-123',
      allowAnonymousRequest: false,
    }))

    await getTeacherClassrooms({ adapter })
    await getTeacherClassroomStudents('class-1', { adapter })

    expect(calls).toEqual([
      { method: 'get', url: '/teacher/classrooms' },
      { method: 'get', url: '/teacher/classrooms/class-1/students' },
    ])
  })
})
