import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  io: vi.fn(),
  useAuth: vi.fn(),
}))

vi.mock('socket.io-client', () => ({
  io: mocks.io,
}))

vi.mock('../../../src/auth/hooks/useAuth', () => ({
  default: mocks.useAuth,
}))

import { useSensorSocket } from '../../../src/realtime_sensors/useSensorSocket'

function createSocket() {
  return {
    connected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    on: vi.fn(),
  }
}

function registeredHandler(socket, eventName) {
  return socket.on.mock.calls.find(([name]) => name === eventName)?.[1]
}

describe('useSensorSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useAuth.mockReturnValue({
      auth: { accessToken: 'access-token' },
    })
  })

  it('authenticates, subscribes, forwards events, and disconnects', () => {
    const socket = createSocket()
    const onMeasurement = vi.fn()
    const onSensorCreated = vi.fn()
    mocks.io.mockReturnValue(socket)

    const { unmount } = renderHook(() =>
      useSensorSocket({
        enabled: true,
        sensorUuids: ['sensor-b', 'sensor-a'],
        onMeasurement,
        onSensorCreated,
      }),
    )

    expect(mocks.io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        autoConnect: false,
        auth: { token: 'access-token' },
      }),
    )
    expect(socket.connect).toHaveBeenCalledOnce()

    act(() => {
      registeredHandler(socket, 'connect')()
    })

    expect(socket.emit).toHaveBeenCalledWith('subscribe_sensors', {
      sensorUuids: ['sensor-a', 'sensor-b'],
    })

    const measurement = { sensorUuid: 'sensor-a' }
    const sensor = { uuid: 'sensor-c' }

    act(() => {
      registeredHandler(socket, 'measurement_received')(measurement)
      registeredHandler(socket, 'sensor_created')(sensor)
    })

    expect(onMeasurement).toHaveBeenCalledWith(measurement)
    expect(onSensorCreated).toHaveBeenCalledWith(sensor)

    unmount()

    expect(socket.emit).toHaveBeenCalledWith('unsubscribe_sensors', {
      sensorUuids: ['sensor-a', 'sensor-b'],
    })
    expect(socket.disconnect).toHaveBeenCalledOnce()
  })

  it('does not connect when live mode is disabled', () => {
    renderHook(() =>
      useSensorSocket({
        enabled: false,
        sensorUuids: [],
      }),
    )

    expect(mocks.io).not.toHaveBeenCalled()
  })
})
