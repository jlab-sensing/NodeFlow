import { Box, Button, MenuItem, TextField, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import useAxiosPrivate from '../../../auth/hooks/useAxiosPrivate'
import GroupSection from './GroupSection'

const flowUnitsByType = {
  yfs210c: 'L/Min',
  waterflow: 'L/Min',
  d10: 'G/Min',
  waterflowd10: 'G/Min',
}

const getFlowUnit = (sensor) =>
  flowUnitsByType[sensor?.sensor_type?.toLowerCase()]

function NotificationPrefSection({ selectedSensorIds, value, onChange }) {
  const axiosPrivate = useAxiosPrivate()
  const [sensors, setSensors] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const nextId = useRef(1)

  useEffect(() => {
    let active = true

    async function loadSensors() {
      try {
        const response = await axiosPrivate.get('/api/sensor/')
        if (active) setSensors(response.data)
      } catch {
        if (active) setLoadError('Unable to load sensors for alerts.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSensors()
    return () => {
      active = false
    }
  }, [axiosPrivate])

  const flowSensors = sensors.filter(
    (sensor) =>
      selectedSensorIds.includes(sensor.id) &&
      !sensor.archived &&
      getFlowUnit(sensor),
  )

  const updateAlert = (id, changes) => {
    onChange(
      value.map((alert) =>
        alert.id === id ? { ...alert, ...changes } : alert,
      ),
    )
  }

  const addAlert = () => {
    const id = `draft-${nextId.current++}`

    onChange([
      ...value,
      {
        id,
        alertType: 'bad_flowrate',
        sensorId: '',
        operator: '>',
        threshold: '',
      },
    ])
  }

  return (
    <GroupSection title="Alert Preferences">
      <Box sx={{ width: '90%', mx: 'auto', mt: 1 }}>
        <Typography variant="body2" sx={{ mb: 2 }}>
          functionality coming soon
        </Typography>

        {loading && <Typography>Loading sensors...</Typography>}

        {loadError && <Typography color="error">{loadError}</Typography>}

        {!loading && !loadError && flowSensors.length === 0 && (
          <Typography sx={{ mb: 2 }}>
            Select a flowmeter in the Sensors section to configure alerts.
          </Typography>
        )}

        {value.map((alert) => {
          const sensor = flowSensors.find(
            (item) => item.id === Number(alert.sensorId),
          )
          const unit = getFlowUnit(sensor)

          return (
            <Box
              key={alert.id}
              sx={{
                mb: 2,
                p: 2,
                border: '1px solid #000000',
                borderRadius: '6px',
                backgroundColor: '#F6F6F6',
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(4, minmax(0, 1fr))',
                  },
                  gap: 2,
                }}
              >
                <TextField
                  select
                  fullWidth
                  label="Alert type"
                  value={alert.alertType}
                  onChange={(event) =>
                    updateAlert(alert.id, {
                      alertType: event.target.value,
                    })
                  }
                >
                  <MenuItem value="bad_flowrate">Bad flowrate</MenuItem>
                </TextField>

                <TextField
                  select
                  fullWidth
                  label="Sensor"
                  value={sensor?.id ?? ''}
                  disabled={loading || !!loadError || flowSensors.length === 0}
                  onChange={(event) =>
                    updateAlert(alert.id, {
                      sensorId:
                        event.target.value === ''
                          ? ''
                          : Number(event.target.value),
                      threshold: '',
                    })
                  }
                >
                  <MenuItem value="">Select a flowmeter</MenuItem>

                  {flowSensors.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name || item.sensor_type} (#{item.id})
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  label="Operator"
                  value={alert.operator}
                  onChange={(event) =>
                    updateAlert(alert.id, {
                      operator: event.target.value,
                    })
                  }
                >
                  <MenuItem value=">">&gt;</MenuItem>
                  <MenuItem value="<">&lt;</MenuItem>
                  <MenuItem value="=">=</MenuItem>
                </TextField>

                <TextField
                  fullWidth
                  type="number"
                  label={unit ? `Threshold (${unit})` : 'Threshold'}
                  value={alert.threshold}
                  disabled={!sensor}
                  slotProps={{ htmlInput: { step: 'any' } }}
                  onChange={(event) =>
                    updateAlert(alert.id, {
                      threshold: event.target.value,
                    })
                  }
                />
              </Box>

              <Button
                type="button"
                color="error"
                sx={{ mt: 1 }}
                onClick={() =>
                  onChange(value.filter((item) => item.id !== alert.id))
                }
              >
                Remove alert
              </Button>
            </Box>
          )
        })}

        <Button
          type="button"
          variant="outlined"
          disabled={loading || !!loadError}
          onClick={addAlert}
        >
          Add alert
        </Button>
      </Box>
    </GroupSection>
  )
}

export default NotificationPrefSection
