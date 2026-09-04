import CloseIcon from '@mui/icons-material/Close'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PropTypes from 'prop-types'
import { useState } from 'react'
import useAxiosPrivate from '../../../auth/hooks/useAxiosPrivate'
import {
  HARDWARE_TYPES,
  useCreateHardware,
  useSensorTypes,
} from '../../../services/hardware'

const formatSensorType = (sensorType) =>
  sensorType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const getErrorMessage = (error) => {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') {
    return detail
  }

  return error?.message || 'Hardware could not be added.'
}

function AddHardwareModal({ open, onClose, loggers, groups }) {
  const axiosPrivate = useAxiosPrivate()
  const createHardwareMutation = useCreateHardware(axiosPrivate)
  const {
    data: sensorTypes = [],
    isLoading: sensorTypesAreLoading,
    isError: sensorTypesHaveError,
    error: sensorTypesError,
  } = useSensorTypes(axiosPrivate)

  const [hardwareType, setHardwareType] = useState(HARDWARE_TYPES.SENSOR)
  const [name, setName] = useState('')
  const [loggerId, setLoggerId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [sensorType, setSensorType] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const isSensor = hardwareType === HARDWARE_TYPES.SENSOR
  const formIsValid =
    name.trim().length > 0 &&
    loggerId !== '' &&
    (!isSensor || sensorType !== '')

  const resetForm = () => {
    setHardwareType(HARDWARE_TYPES.SENSOR)
    setName('')
    setLoggerId('')
    setGroupId('')
    setSensorType('')
    setSubmitted(false)
    createHardwareMutation.reset()
  }

  const handleClose = () => {
    if (createHardwareMutation.isPending) {
      return
    }
    resetForm()
    onClose()
  }

  const handleHardwareTypeChange = (event) => {
    const nextHardwareType = event.target.value
    setHardwareType(nextHardwareType)

    if (nextHardwareType === HARDWARE_TYPES.ACTUATOR) {
      setSensorType('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitted(true)
    if (!formIsValid) {
      return
    }
    try {
      await createHardwareMutation.mutateAsync({
        hardwareType,
        name: name.trim(),
        loggerId,
        groupId: groupId || null,
        sensorType: isSensor ? sensorType : undefined,
      })
      resetForm()
      onClose()
    } catch {
      // empty on purpose
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="add-hardware-title"
    >
      <Box component="form" onSubmit={handleSubmit}>
        <Box
          sx={{
            backgroundColor: '#588157',
            px: 3,
            py: 2.5,
            position: 'relative',
          }}
        >
          <IconButton
            type="button"
            aria-label="Close add hardware dialog"
            onClick={handleClose}
            disabled={createHardwareMutation.isPending}
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          <Typography
            id="add-hardware-title"
            variant="h5"
            component="h2"
            sx={{
              color: 'white',
              fontWeight: 600,
            }}
          >
            Add Hardware
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              mt: 0.5,
            }}
          >
            Register a sensor or actuator.
          </Typography>
        </Box>

        <DialogContent dividers>
          <Stack spacing={2.5}>
            {createHardwareMutation.isError && (
              <Alert severity="error">
                {getErrorMessage(createHardwareMutation.error)}
              </Alert>
            )}

            <FormControl fullWidth required>
              <InputLabel id="hardware-category-label">Category</InputLabel>

              <Select
                labelId="hardware-category-label"
                label="Category"
                value={hardwareType}
                onChange={handleHardwareTypeChange}
                disabled={createHardwareMutation.isPending}
              >
                <MenuItem value={HARDWARE_TYPES.SENSOR}>Sensor</MenuItem>

                <MenuItem value={HARDWARE_TYPES.ACTUATOR}>Actuator</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Hardware Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              fullWidth
              autoFocus
              disabled={createHardwareMutation.isPending}
              error={submitted && !name.trim()}
              helperText={
                submitted && !name.trim()
                  ? 'Hardware name is required.'
                  : 'Use a name that identifies this device.'
              }
            />

            <FormControl
              fullWidth
              required
              error={submitted && loggerId === ''}
            >
              <InputLabel id="hardware-logger-label">Logger</InputLabel>

              <Select
                labelId="hardware-logger-label"
                label="Logger"
                value={loggerId}
                onChange={(event) => setLoggerId(event.target.value)}
                disabled={
                  createHardwareMutation.isPending || loggers.length === 0
                }
              >
                {loggers.map((logger) => (
                  <MenuItem key={logger.logger_id} value={logger.logger_id}>
                    {logger.name || `Logger ${logger.logger_id}`}
                  </MenuItem>
                ))}
              </Select>

              <FormHelperText>
                {loggers.length === 0
                  ? 'Register a logger before adding hardware.'
                  : submitted && loggerId === ''
                    ? 'A logger is required.'
                    : 'The logger that owns this hardware.'}
              </FormHelperText>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="hardware-group-label">Group</InputLabel>

              <Select
                labelId="hardware-group-label"
                label="Group"
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                disabled={createHardwareMutation.isPending}
              >
                <MenuItem value="">
                  <em>No Group</em>
                </MenuItem>

                {groups.map((group) => (
                  <MenuItem key={group.uuid} value={group.uuid}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>

              <FormHelperText>
                Optional. Hardware can be assigned later.
              </FormHelperText>
            </FormControl>

            {isSensor && (
              <FormControl
                fullWidth
                required
                error={submitted && sensorType === '' && !sensorTypesAreLoading}
              >
                <InputLabel id="sensor-type-label">Sensor Type</InputLabel>

                <Select
                  labelId="sensor-type-label"
                  label="Sensor Type"
                  value={sensorType}
                  onChange={(event) => setSensorType(event.target.value)}
                  disabled={
                    createHardwareMutation.isPending ||
                    sensorTypesAreLoading ||
                    sensorTypesHaveError
                  }
                >
                  {sensorTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {formatSensorType(type)}
                    </MenuItem>
                  ))}
                </Select>

                <FormHelperText>
                  {sensorTypesAreLoading
                    ? 'Loading sensor types...'
                    : submitted && sensorType === ''
                      ? 'A sensor type is required.'
                      : 'The measurements provided by this sensor.'}
                </FormHelperText>
              </FormControl>
            )}

            {isSensor && sensorTypesAreLoading && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <CircularProgress size={18} />
                <Typography variant="body2">Loading sensor types</Typography>
              </Box>
            )}

            {isSensor && sensorTypesHaveError && (
              <Alert severity="error">
                {getErrorMessage(sensorTypesError)}
              </Alert>
            )}

            {!isSensor && (
              <Alert severity="info">
                Actuators are currently registered as solenoids and begin in the
                Closed state.
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            type="button"
            variant="outlined"
            onClick={handleClose}
            disabled={createHardwareMutation.isPending}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={
              createHardwareMutation.isPending ||
              sensorTypesAreLoading ||
              (isSensor && sensorTypesHaveError)
            }
            sx={{
              backgroundColor: '#588157',
              '&:hover': {
                backgroundColor: '#3a5a40',
              },
            }}
          >
            {createHardwareMutation.isPending ? 'Adding...' : 'Add Hardware'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

AddHardwareModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  loggers: PropTypes.arrayOf(
    PropTypes.shape({
      logger_id: PropTypes.number.isRequired,
      name: PropTypes.string,
    }),
  ).isRequired,
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
}

export default AddHardwareModal
