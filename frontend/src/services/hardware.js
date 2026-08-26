import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export const HARDWARE_QUERY_KEY = ['hardware']
export const SENSOR_TYPES_QUERY_KEY = ['sensor-types']

export const HARDWARE_TYPES = {
  SENSOR: 'sensor',
  ACTUATOR: 'actuator',
}

const getHardwareEndpoint = (hardwareType) => {
  if (hardwareType === HARDWARE_TYPES.SENSOR) {
    return '/api/sensor'
  }

  if (hardwareType === HARDWARE_TYPES.ACTUATOR) {
    return '/api/solenoid'
  }

  throw new Error(`Unsupported hardware type ${hardwareType}`)
}

const formatActuatorState = (activeState) => {
  if (!activeState) {
    return 'Unknown'
  }
  return (
    activeState.charAt(0).toUpperCase() + activeState.slice(1).toLowerCase()
  )
}

export const normalizeSensor = (sensor) => ({
  id: `${HARDWARE_TYPES.SENSOR}:${sensor.id}`,
  backendId: sensor.id,
  hardwareType: HARDWARE_TYPES.SENSOR,
  category: 'Sensor',
  subtype: sensor.sensor_type,
  name: sensor.name,
  hardwareId: sensor.sensor_id,
  loggerId: sensor.logger_id,
  groupId: sensor.group_id,
  archived: sensor.archived,
  status: sensor.archived ? 'Archived' : 'Active',
  uuid: sensor.uuid,
  userId: sensor.user_id,
  legacyCellId: sensor.legacy_cell_id,
  activeState: null,
  dateCreated: null,
})

export const normalizeActuator = (solenoid) => ({
  id: `${HARDWARE_TYPES.ACTUATOR}:${solenoid.id}`,
  backendId: solenoid.id,
  hardwareType: HARDWARE_TYPES.ACTUATOR,
  category: 'Actuator',
  subtype: 'Solenoid',
  name: solenoid.name,
  hardwareId: solenoid.id,
  loggerId: solenoid.logger_id,
  groupId: solenoid.group_id,
  archived: solenoid.archived,
  status: solenoid.archived
    ? 'Archived'
    : formatActuatorState(solenoid.active_state),
  uuid: solenoid.uuid,
  userId: solenoid.user_id,
  activeState: solenoid.active_state,
  dateCreated: solenoid.date_created,
  legacyCellId: null,
})

export const getSensors = (axiosPrivate, includeArchived = true) =>
  axiosPrivate
    .get('/api/sensor/', {
      params: {
        include_archived: includeArchived,
      },
    })
    .then((response) => response.data)

export const getActuators = (axiosPrivate, includeArchived = true) =>
  axiosPrivate
    .get('/api/solenoid/', {
      params: {
        include_archived: includeArchived,
      },
    })
    .then((response) => response.data)

export const getHardware = async (axiosPrivate, includeArchived = true) => {
  const [sensors, actuators] = await Promise.all([
    getSensors(axiosPrivate, includeArchived),
    getActuators(axiosPrivate, includeArchived),
  ])

  return [
    ...sensors.map(normalizeSensor),
    ...actuators.map(normalizeActuator),
  ].sort((first, second) => first.name.localeCompare(second.name))
}

export const getSensorTypes = (axiosPrivate) =>
  axiosPrivate.get('/api/sensor/types').then((response) => response.data)

export const createHardware = (
  axiosPrivate,
  { hardwareType, name, loggerId, groupId, sensorType },
) => {
  const endpoint = getHardwareEndpoint(hardwareType)
  const payload = {
    name,
    logger_id: Number(loggerId),
    group_id: groupId || null,
  }
  if (hardwareType === HARDWARE_TYPES.SENSOR) {
    payload.sensor_type = sensorType
  }
  return axiosPrivate
    .post(`${endpoint}/`, payload)
    .then((response) => response.data)
}

export const updateHardware = (
  axiosPrivate,
  { hardwareType, backendId, name, loggerId, groupId, sensorType },
) => {
  const endpoint = getHardwareEndpoint(hardwareType)
  const payload = {
    name,
    logger_id: Number(loggerId),
    group_id: groupId || null,
  }
  if (hardwareType === HARDWARE_TYPES.SENSOR) {
    payload.sensor_type = sensorType
  }
  return axiosPrivate
    .put(`${endpoint}/${backendId}`, payload)
    .then((response) => response.data)
}

export const setHardwareArchived = (
  axiosPrivate,
  { hardwareType, backendId, archived },
) => {
  const endpoint = getHardwareEndpoint(hardwareType)
  return axiosPrivate
    .patch(`${endpoint}/${backendId}/archive`, {
      archived,
    })
    .then((response) => response.data)
}

export const useHardware = (axiosPrivate, { includeArchived = true } = {}) =>
  useQuery({
    queryKey: [
      ...HARDWARE_QUERY_KEY,
      {
        includeArchived,
      },
    ],
    queryFn: () => getHardware(axiosPrivate, includeArchived),
    refetchOnWindowFocus: true,
  })

export const useSensorTypes = (axiosPrivate) =>
  useQuery({
    queryKey: SENSOR_TYPES_QUERY_KEY,
    queryFn: () => getSensorTypes(axiosPrivate),
    staleTime: Infinity,
  })

const invalidateHardwareData = (queryClient) =>
  Promise.all([
    queryClient.invalidateQueries({
      queryKey: HARDWARE_QUERY_KEY,
    }),
    queryClient.invalidateQueries({
      queryKey: ['chart-sources'],
    }),
  ])

export const useCreateHardware = (axiosPrivate) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (hardware) => createHardware(axiosPrivate, hardware),
    onSuccess: () => invalidateHardwareData(queryClient),
  })
}

export const useUpdateHardware = (axiosPrivate) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (hardware) => updateHardware(axiosPrivate, hardware),
    onSuccess: () => invalidateHardwareData(queryClient),
  })
}

export const useSetHardwareArchived = (axiosPrivate) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (hardware) => setHardwareArchived(axiosPrivate, hardware),
    onSuccess: () => invalidateHardwareData(queryClient),
  })
}
