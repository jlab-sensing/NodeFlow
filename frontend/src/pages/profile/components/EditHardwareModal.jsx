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
  useUpdateHardware,
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

  return error?.message || 'Hardware could not be edited.'
}

function EditHardwareModal({ open, onClose, hardware, loggers, groups }) {
  const axiosPrivate = useAxiosPrivate()
  const updateHardwareMutation = useUpdateHardware(axiosPrivate)
  const {
    data: sensorTypes = [],
    isLoading: sensorTypesAreLoading,
    isError: sensorTypesHaveError,
    error: sensorTypesError,
  } = useSensorTypes(axiosPrivate)

  const hardwareType = hardware.hardwareType
  const isSensor = hardwareType === HARDWARE_TYPES.SENSOR

  const [name, setName] = useState(hardware.name ?? '')
  const [loggerId, setLoggerId] = useState(hardware.loggerId ?? '')
  const [groupId, setGroupId] = useState(hardware.groupId ?? '')
  const [sensorType, setSensorType] = useState(
    isSensor ? (hardware.subtype ?? '') : '',
  )
  const [submitted, setSubmitted] = useState(false)

  const formIsValid =
    name.trim().length > 0 &&
    loggerId !== '' &&
    (!isSensor || sensorType !== '')

  const handleClose = () => {
    if (updateHardwareMutation.isPending) {
      return
    }
    onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (updateHardwareMutation.isPending) {
      return
    }
    setSubmitted(true)
    if (!formIsValid) {
      return
    }
    try {
      await updateHardwareMutation.mutateAsync({
        hardwareType,
        backendId: hardware.backendId,
        name: name.trim(),
        loggerId,
        groupId: groupId || null,
        sensorType: isSensor ? sensorType : undefined,
      })
      onClose()
    } catch {
      //empty on purpose
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="edit-hardware-title"
    >
      <Box component="form" onSubmit={handleSubmit}>
        <Box
          sx={{
            backgroundColor: '#1E3A5F',
            px: 3,
            py: 2.5,
            position: 'relative',
          }}
        >
          <IconButton
            type="button"
            aria-label="Close edit hardware dialog"
            onClick={handleClose}
            disabled={updateHardwareMutation.isPending}
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
            id="edit-hardware-title"
            variant="h5"
            component="h2"
            sx={{
              color: 'white',
              fontWeight: 600,
            }}
          >
            Edit Hardware
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              mt: 0.5,
            }}
          >
            Update this sensor or actuator
          </Typography>
        </Box>

        <DialogContent dividers>
          <Stack spacing={2.5}>
            {updateHardwareMutation.isError && (
              <Alert severity="error">
                {getErrorMessage(updateHardwareMutation.error)}
              </Alert>
            )}

            <TextField
              label="Category"
              value={isSensor ? 'Sensor' : 'Actuator'}
              fullWidth
              slotProps={{ input: { readOnly: true } }}
              helperText="Category cannot be changed after registration."
            />

            <TextField
              label="Hardware Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              fullWidth
              autoFocus
              disabled={updateHardwareMutation.isPending}
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
                  updateHardwareMutation.isPending || loggers.length === 0
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
                  ? 'No loggers are available'
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
                disabled={updateHardwareMutation.isPending}
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
                    updateHardwareMutation.isPending ||
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
              <TextField
                label="Actuator Type"
                value="Solenoid"
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            type="button"
            variant="outlined"
            onClick={handleClose}
            disabled={updateHardwareMutation.isPending}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={
              updateHardwareMutation.isPending ||
              (isSensor && (sensorTypesAreLoading || sensorTypesHaveError))
            }
            sx={{
              backgroundColor: '#1E3A5F',
              '&:hover': {
                backgroundColor: '#2AB0EE',
              },
            }}
          >
            {updateHardwareMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

EditHardwareModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  hardware: PropTypes.shape({
    backendId: PropTypes.number.isRequired,
    hardwareType: PropTypes.oneOf([
      HARDWARE_TYPES.SENSOR,
      HARDWARE_TYPES.ACTUATOR,
    ]).isRequired,
    name: PropTypes.string,
    loggerId: PropTypes.number,
    groupId: PropTypes.string,
    subtype: PropTypes.string,
  }).isRequired,
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

export default EditHardwareModal
