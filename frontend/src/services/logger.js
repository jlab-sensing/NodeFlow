import { useQuery } from '@tanstack/react-query'

export const getLoggers = (axiosPrivate) =>
  axiosPrivate.get('/api/logger/').then((response) => response.data)

export const addLogger = (
  { name, type, deviceEui, description },
  axiosPrivate,
) =>
  axiosPrivate
    .post('/api/logger/', {
      name: name.trim(),
      type,
      device_eui: deviceEui || null,
      description: description?.trim() || '',
    })
    .then((response) => response.data)

export const updateLogger = (loggerId, update, axiosPrivate) =>
  axiosPrivate
    .put(`/api/logger/${loggerId}`, update)
    .then((response) => response.data)

export const deleteLogger = (loggerId, axiosPrivate) =>
  axiosPrivate
    .delete(`/api/logger/${loggerId}`)
    .then((response) => response.data)

export const getLogger = (loggerId, axiosPrivate) =>
  axiosPrivate.get(`/api/logger/${loggerId}`).then((response) => response.data)

export const useLoggers = (axiosPrivate) =>
  useQuery({
    queryKey: ['shared-loggers'],
    queryFn: () => getLoggers(axiosPrivate),
    refetchOnWindowFocus: true,
  })

export const useUserLoggers = useLoggers
