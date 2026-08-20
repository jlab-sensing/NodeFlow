import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import useAuth from '../auth/hooks/useAuth'
import { SENSOR_SOCKET_EVENTS } from './sensorSocketContract'

export function useSensorSocket({
  enabled,
  sensorUuids,
  onMeasurement,
  onSensorCreated,
}) {
  const auth = useAuth()?.auth
  const measurementHandlerRef = useRef(onMeasurement)
  const sensorCreatedHandlerRef = useRef(onSensorCreated)

  useEffect(() => {
    measurementHandlerRef.current = onMeasurement
  }, [onMeasurement])

  useEffect(() => {
    sensorCreatedHandlerRef.current = onSensorCreated
  }, [onSensorCreated])

  const sensorKey = [...sensorUuids].sort().join(',')

  useEffect(() => {
    if (!enabled || !auth?.accessToken) {
      return undefined
    }

    const subscribedSensorUuids = sensorKey ? sensorKey.split(',') : []
    const socketUrl =
      import.meta.env.VITE_API_BASE_URL || window.location.origin
    const socket = io(socketUrl, {
      autoConnect: false,
      auth: {
        token: auth.accessToken,
      },
    })

    const handleConnect = () => {
      if (subscribedSensorUuids.length > 0) {
        socket.emit(SENSOR_SOCKET_EVENTS.SUBSCRIBE, {
          sensorUuids: subscribedSensorUuids,
        })
      }
    }

    const handleMeasurement = (measurement) => {
      measurementHandlerRef.current?.(measurement)
    }

    const handleSensorCreated = (sensor) => {
      sensorCreatedHandlerRef.current?.(sensor)
    }

    socket.on('connect', handleConnect)
    socket.on(SENSOR_SOCKET_EVENTS.MEASUREMENT_RECEIVED, handleMeasurement)
    socket.on(SENSOR_SOCKET_EVENTS.SENSOR_CREATED, handleSensorCreated)

    socket.connect()

    return () => {
      if (socket.connected) {
        socket.emit(SENSOR_SOCKET_EVENTS.UNSUBSCRIBE, {
          sensorUuids: subscribedSensorUuids,
        })
      }

      socket.off('connect', handleConnect)
      socket.off(SENSOR_SOCKET_EVENTS.MEASUREMENT_RECEIVED, handleMeasurement)
      socket.off(SENSOR_SOCKET_EVENTS.SENSOR_CREATED, handleSensorCreated)
      socket.disconnect()
    }
  }, [enabled, auth?.accessToken, sensorKey])
}
