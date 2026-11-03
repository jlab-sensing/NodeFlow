import { Box, CircularProgress, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import useAxiosPrivate from '../../../auth/hooks/useAxiosPrivate'
import { USER_GROUPS_QUERY_KEY } from '../../../services/group'
import ManualAutoSwitch from './ManualAutoSwitch'
import OpenCloseButton from './OpenCloseButton'

function GroupBox({ group }) {
  const axiosPrivate = useAxiosPrivate()
  const queryClient = useQueryClient()
  const [devices, setDevices] = useState({
    solenoids: [],
    sensors: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [changingSolenoidId, setChangingSolenoidId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [activationPref, setActivationPref] = useState(null)
  const [loadingActivationPref, setLoadingActivationPref] = useState(true)
  const irrigationMode = group.irrigation_mode ?? 'manual'
  const [changingMode, setChangingMode] = useState(false)

  const setIrrigationMode = (mode) => {
    queryClient.setQueryData(USER_GROUPS_QUERY_KEY, (groups) =>
      groups?.map((cachedGroup) =>
        cachedGroup.uuid === group.uuid
          ? { ...cachedGroup, irrigation_mode: mode }
          : cachedGroup,
      ),
    )
  }

  useEffect(() => {
    let cancelled = false

    const loadDevices = async () => {
      try {
        setError('')
        const response = await axiosPrivate.get(
          `/api/groups/${group.uuid}/devices`,
        )

        if (!cancelled) {
          setDevices(response.data)
        }
      } catch (requestError) {
        console.error('Error loading group devices', requestError)

        if (!cancelled) {
          setError(
            requestError.response?.data?.detail ||
              'Unable to load group devices',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDevices()

    const intervalId = setInterval(() => {
      loadDevices()
    }, 2000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [axiosPrivate, group.uuid])

  useEffect(() => {
    let cancelled = false
    const loadActivationPref = async () => {
      try {
        const response = await axiosPrivate.get(
          `/api/groups/${group.uuid}/activationPref/`,
        )
        if (!cancelled) {
          setActivationPref(response.data)
        }
      } catch (requestError) {
        console.error('Unable to load activation preference', requestError)
        if (!cancelled) {
          setActivationPref(null)
        }
      } finally {
        if (!cancelled) {
          setLoadingActivationPref(false)
        }
      }
    }
    loadActivationPref()
    return () => {
      cancelled = true
    }
  }, [axiosPrivate, group.uuid, irrigationMode])

  const handleModeChange = async (requestedMode) => {
    try {
      setChangingMode(true)
      setActionError('')
      const response = await axiosPrivate.patch(
        `/api/groups/${group.uuid}/mode`,
        { mode: requestedMode },
      )
      setIrrigationMode(response.data.mode)
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.detail ||
          'Unable to change irrigation mode',
      )
    } finally {
      setChangingMode(false)
    }
  }

  const handleSolenoidStateChange = async (solenoidId, requestedState) => {
    try {
      setActionError('')
      setChangingSolenoidId(solenoidId)

      const action = requestedState === 'open' ? 'open' : 'close'
      const response = await axiosPrivate.post(
        `/api/solenoid/${solenoidId}/${action}`,
      )
      const confirmedState = response.data.state

      if (response.data.mode) {
        setIrrigationMode(response.data.mode)
      }
      await queryClient.invalidateQueries({ queryKey: USER_GROUPS_QUERY_KEY })

      setDevices((currentDevices) => ({
        ...currentDevices,
        solenoids: (currentDevices.solenoids ?? []).map((solenoid) =>
          solenoid.id === solenoidId
            ? {
                ...solenoid,
                active_state: confirmedState,
              }
            : solenoid,
        ),
      }))
    } catch (requestError) {
      console.error('Unable to change solenoid state', requestError)
      setActionError(
        requestError.response?.data?.detail ||
          'unable to change solenoid state',
      )
    } finally {
      setChangingSolenoidId(null)
    }
  }

  const solenoids = devices.solenoids ?? []
  const sensors = devices.sensors ?? []
  const activationSensor = sensors.find(
    (sensor) => sensor.id === activationPref?.sensor_id,
  )
  const activationCondition =
    activationPref && activationSensor
      ? `${activationSensor.sensor_type} ${activationPref.condition_operator} ${activationPref.condition_value}`
      : 'Not configured'
  const hasUsableCloseCondition =
    (activationPref?.close_condition_operator == null &&
      activationPref?.close_condition_value == null) ||
    (Number.isFinite(activationPref?.close_condition_value) &&
      (activationPref.condition_operator === '<'
        ? activationPref.close_condition_operator === '>' &&
          activationPref.close_condition_value > activationPref.condition_value
        : activationPref.close_condition_operator === '<' &&
          activationPref.close_condition_value <
            activationPref.condition_value))
  const hasUsableActivationPref = Boolean(
    activationPref?.enabled &&
    activationSensor &&
    !activationSensor.archived &&
    activationPref.measurement?.trim() &&
    ['<', '>'].includes(activationPref.condition_operator) &&
    Number.isFinite(activationPref.condition_value) &&
    hasUsableCloseCondition,
  )
  const hasRealSolenoid = solenoids.some(
    (solenoid) => solenoid.logger_id !== -1,
  )
  const autoUnavailableReason =
    loading || loadingActivationPref
      ? 'Loading automatic control settings…'
      : error
        ? 'Automatic control is unavailable while group devices cannot be loaded.'
        : hasRealSolenoid
          ? 'Real loggers currently support Manual mode only.'
          : !hasUsableActivationPref
            ? 'Save an enabled activation threshold for a sensor in this group to use Auto.'
            : ''

  return (
    <Box
      sx={{
        backgroundColor: '#D9D9D9',
        border: '1px solid #000000',
        borderRadius: '30px',
        p: 2,
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <ManualAutoSwitch
          state={irrigationMode}
          onStateChange={handleModeChange}
          loading={changingMode}
          disabled={irrigationMode !== 'auto' && Boolean(autoUnavailableReason)}
        />
      </Box>

      <Typography variant="h4" color="text.secondary">
        {group.name}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          mt: 0.5,
          color: '#1E3A5F',
        }}
      >
        <Box component="span" sx={{ fontWeight: 700 }}>
          Activation:
        </Box>{' '}
        {activationCondition}
      </Typography>

      {autoUnavailableReason && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {autoUnavailableReason}
        </Typography>
      )}

      {loading ? (
        <CircularProgress size={20} sx={{ mt: 2 }} />
      ) : error ? (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'flex',
            gap: 4,
            alignItems: 'flex-start',
            mt: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" component="h3" sx={{ mb: 1 }}>
              Solenoids
            </Typography>

            {solenoids.length > 0 ? (
              solenoids.map((solenoid) => (
                <Box
                  key={solenoid.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: 2,
                    mb: 1.5,
                  }}
                >
                  <Typography variant="body2">{solenoid.name}</Typography>

                  <OpenCloseButton
                    state={
                      solenoid.logger_id === -1
                        ? solenoid.active_state
                        : solenoid.last_queued_command?.requested_state
                    }
                    loading={changingSolenoidId === solenoid.id}
                    onStateChange={(requestedState) =>
                      handleSolenoidStateChange(solenoid.id, requestedState)
                    }
                  />
                </Box>
              ))
            ) : (
              <Typography variant="body2" component="div">
                No solenoids
              </Typography>
            )}

            {actionError && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {actionError}
              </Typography>
            )}
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" component="h3" sx={{ mb: 1 }}>
              Sensors
            </Typography>

            {sensors.length > 0 ? (
              sensors.map((sensor) => (
                <Typography
                  key={sensor.id}
                  variant="body2"
                  component="div"
                  sx={{ mb: 0.5 }}
                >
                  {sensor.sensor_type}
                </Typography>
              ))
            ) : (
              <Typography variant="body2" component="div">
                No sensors
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default GroupBox
