import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createHardware,
  getHardware,
  HARDWARE_TYPES,
  normalizeActuator,
  normalizeSensor,
  setHardwareArchived,
  updateHardware,
} from '../../../src/services/hardware'

describe('hardware service', () => {
  let axiosPrivate

  beforeEach(() => {
    axiosPrivate = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
    }
  })

  it('normalizes a sensor for the Hardware table', () => {
    const row = normalizeSensor({
      id: 12,
      uuid: 'sensor-uuid',
      user_id: 'user-uuid',
      name: 'Soil Sensor',
      sensor_type: 'soil_moisture',
      sensor_id: 12,
      logger_id: 123,
      legacy_cell_id: null,
      group_id: null,
      archived: false,
    })

    expect(row).toEqual({
      id: 'sensor:12',
      backendId: 12,
      hardwareType: 'sensor',
      category: 'Sensor',
      subtype: 'soil_moisture',
      name: 'Soil Sensor',
      hardwareId: 12,
      loggerId: 123,
      groupId: null,
      archived: false,
      status: 'Active',
      uuid: 'sensor-uuid',
      userId: 'user-uuid',
      legacyCellId: null,
      activeState: null,
      dateCreated: null,
    })
  })

  it('normalizes an actuator for the Hardware table', () => {
    const row = normalizeActuator({
      id: 7,
      uuid: 'actuator-uuid',
      user_id: 'user-uuid',
      name: 'Greenhouse Valve',
      active_state: 'closed',
      logger_id: 456,
      group_id: null,
      date_created: '2026-08-24T12:00:00',
      archived: false,
    })

    expect(row).toEqual({
      id: 'actuator:7',
      backendId: 7,
      hardwareType: 'actuator',
      category: 'Actuator',
      subtype: 'Solenoid',
      name: 'Greenhouse Valve',
      hardwareId: 7,
      loggerId: 456,
      groupId: null,
      archived: false,
      status: 'Closed',
      uuid: 'actuator-uuid',
      userId: 'user-uuid',
      activeState: 'closed',
      dateCreated: '2026-08-24T12:00:00',
      legacyCellId: null,
    })
  })

  it('fetches and combines sensors and actuators', async () => {
    axiosPrivate.get.mockImplementation((url) => {
      if (url === '/api/sensor/') {
        return Promise.resolve({
          data: [
            {
              id: 1,
              uuid: 'sensor-uuid',
              user_id: 'user-uuid',
              name: 'B Sensor',
              sensor_type: 'temperature',
              sensor_id: 1,
              logger_id: 100,
              legacy_cell_id: null,
              group_id: null,
              archived: false,
            },
          ],
        })
      }

      if (url === '/api/solenoid/') {
        return Promise.resolve({
          data: [
            {
              id: 1,
              uuid: 'actuator-uuid',
              user_id: 'user-uuid',
              name: 'A Valve',
              active_state: 'closed',
              logger_id: 100,
              group_id: null,
              date_created: '2026-08-24T12:00:00',
              archived: false,
            },
          ],
        })
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    const hardware = await getHardware(axiosPrivate, true)

    expect(axiosPrivate.get).toHaveBeenCalledWith('/api/sensor/', {
      params: {
        include_archived: true,
      },
    })
    expect(axiosPrivate.get).toHaveBeenCalledWith('/api/solenoid/', {
      params: {
        include_archived: true,
      },
    })

    expect(hardware).toHaveLength(2)

    // Sorted alphabetically by name.
    expect(hardware[0].id).toBe('actuator:1')
    expect(hardware[1].id).toBe('sensor:1')
  })

  it('creates a sensor without sending backend-owned fields', async () => {
    axiosPrivate.post.mockResolvedValue({
      data: {
        id: 10,
      },
    })

    await createHardware(axiosPrivate, {
      hardwareType: HARDWARE_TYPES.SENSOR,
      name: 'Soil Sensor',
      loggerId: '123',
      groupId: '',
      sensorType: 'soil_moisture',
    })

    expect(axiosPrivate.post).toHaveBeenCalledWith('/api/sensor/', {
      name: 'Soil Sensor',
      logger_id: 123,
      group_id: null,
      sensor_type: 'soil_moisture',
    })
  })

  it('creates an actuator without sending sensor fields', async () => {
    axiosPrivate.post.mockResolvedValue({
      data: {
        id: 11,
      },
    })

    await createHardware(axiosPrivate, {
      hardwareType: HARDWARE_TYPES.ACTUATOR,
      name: 'Greenhouse Valve',
      loggerId: 456,
      groupId: null,
      sensorType: 'ignored',
    })

    expect(axiosPrivate.post).toHaveBeenCalledWith('/api/solenoid/', {
      name: 'Greenhouse Valve',
      logger_id: 456,
      group_id: null,
    })
  })

  it('updates hardware using its backend ID', async () => {
    axiosPrivate.put.mockResolvedValue({
      data: {
        id: 9,
      },
    })

    await updateHardware(axiosPrivate, {
      hardwareType: HARDWARE_TYPES.ACTUATOR,
      backendId: 9,
      name: 'Updated Valve',
      loggerId: 456,
      groupId: null,
    })

    expect(axiosPrivate.put).toHaveBeenCalledWith('/api/solenoid/9', {
      name: 'Updated Valve',
      logger_id: 456,
      group_id: null,
    })
  })

  it('archives hardware using the category-specific endpoint', async () => {
    axiosPrivate.patch.mockResolvedValue({
      data: {
        id: 4,
        archived: true,
      },
    })

    await setHardwareArchived(axiosPrivate, {
      hardwareType: HARDWARE_TYPES.SENSOR,
      backendId: 4,
      archived: true,
    })

    expect(axiosPrivate.patch).toHaveBeenCalledWith('/api/sensor/4/archive', {
      archived: true,
    })
  })

  it('rejects unsupported hardware categories', () => {
    expect(() =>
      createHardware(axiosPrivate, {
        hardwareType: 'pump',
        name: 'Unsupported Hardware',
        loggerId: 123,
        groupId: null,
      }),
    ).toThrow('Unsupported hardware type pump')
  })
})
