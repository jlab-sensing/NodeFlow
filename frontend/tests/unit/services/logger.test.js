import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addLogger,
  deleteLogger,
  getLogger,
  getLoggers,
  updateLogger,
} from '../../../src/services/logger'

describe('logger service', () => {
  let axiosPrivate

  beforeEach(() => {
    axiosPrivate = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('gets shared loggers', async () => {
    axiosPrivate.get.mockResolvedValue({
      data: [
        {
          id: 123,
          logger_id: 123,
          name: 'Shared Logger',
        },
      ],
    })

    const result = await getLoggers(axiosPrivate)

    expect(axiosPrivate.get).toHaveBeenCalledWith('/api/logger/')
    expect(result).toHaveLength(1)
    expect(result[0].logger_id).toBe(123)
  })

  it('creates a shared logger using the backend contract', async () => {
    axiosPrivate.post.mockResolvedValue({
      data: {
        id: 123,
        logger_id: 123,
      },
    })

    await addLogger(
      {
        name: '  Greenhouse Logger  ',
        type: 'ents',
        deviceEui: '0080E1150546D093',
        description: '  Greenhouse logger  ',
      },
      axiosPrivate,
    )

    expect(axiosPrivate.post).toHaveBeenCalledWith('/api/logger/', {
      name: 'Greenhouse Logger',
      type: 'ents',
      device_eui: '0080E1150546D093',
      description: 'Greenhouse logger',
    })
  })

  it('allows an empty logger description', async () => {
    axiosPrivate.post.mockResolvedValue({
      data: {
        id: 123,
        logger_id: 123,
      },
    })

    await addLogger(
      {
        name: 'Shared Logger',
        type: 'ents',
        deviceEui: null,
        description: null,
      },
      axiosPrivate,
    )

    expect(axiosPrivate.post).toHaveBeenCalledWith('/api/logger/', {
      name: 'Shared Logger',
      type: 'ents',
      device_eui: null,
      description: '',
    })
  })

  it('gets one shared logger', async () => {
    axiosPrivate.get.mockResolvedValue({
      data: {
        id: 123,
        logger_id: 123,
      },
    })

    await getLogger(123, axiosPrivate)

    expect(axiosPrivate.get).toHaveBeenCalledWith(
      '/api/logger/123',
    )
  })

  it('updates a shared logger', async () => {
    axiosPrivate.put.mockResolvedValue({
      data: {
        id: 123,
        name: 'Updated Logger',
      },
    })

    await updateLogger(
      123,
      {
        name: 'Updated Logger',
        description: 'Updated description',
      },
      axiosPrivate,
    )

    expect(axiosPrivate.put).toHaveBeenCalledWith(
      '/api/logger/123',
      {
        name: 'Updated Logger',
        description: 'Updated description',
      },
    )
  })

  it('deletes a shared logger', async () => {
    axiosPrivate.delete.mockResolvedValue({
      data: {
        ok: true,
        logger_id: 123,
      },
    })

    await deleteLogger(123, axiosPrivate)

    expect(axiosPrivate.delete).toHaveBeenCalledWith(
      '/api/logger/123',
    )
  })

  it('preserves API errors for the calling modal', async () => {
    const error = {
      response: {
        status: 409,
        data: {
          detail: 'Logger is assigned to hardware',
        },
      },
    }

    axiosPrivate.delete.mockRejectedValue(error)

    await expect(
      deleteLogger(123, axiosPrivate),
    ).rejects.toBe(error)
  })
})