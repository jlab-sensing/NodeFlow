import { useState } from 'react'
import PropTypes from 'prop-types'
import useAxiosPrivate from '../../../auth/hooks/useAxiosPrivate'
import { HARDWARE_TYPES, useDeleteHardware } from '../../../services/hardware'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'

function DeleteHardwareButton({ hardware }) {
  const axiosPrivate = useAxiosPrivate()
  const deleteHardwareMutation = useDeleteHardware(axiosPrivate)
  const [open, setOpen] = useState(false)

  const deleting = deleteHardwareMutation.isPending
  const isSensor = hardware.hardwareType === HARDWARE_TYPES.SENSOR

  const requestError = deleteHardwareMutation.error
  const detail = requestError?.response?.data?.detail
  const error = deleteHardwareMutation.isError
    ? typeof detail === 'string'
      ? detail
      : requestError.message || 'The hardware could not be deleted'
    : ''

  const handleOpen = () => {
    deleteHardwareMutation.reset()
    setOpen(true)
  }

  const handleClose = () => {
    if (deleting) {
      return
    }
    setOpen(false)
    deleteHardwareMutation.reset()
  }

  const handleDelete = async () => {
    if (deleting) {
      return
    }
    try {
      await deleteHardwareMutation.mutateAsync({
        hardwareType: hardware.hardwareType,
        backendId: hardware.backendId,
      })
      setOpen(false)
    } catch {
      // intentionally left blank
    }
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        aria-label={`Delete ${hardware.name}`}
        disabled={deleting}
        sx={{
          color: 'black',
          p: 0.5,
          minWidth: 0.4,
          '&:hover': {
            color: '#d32f2f',
            backgroundColor: 'rgba(211, 47, 47, 0.08',
          },
        }}
      >
        <DeleteIcon fontSize="small" />
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        aria-labelledby={`delete-hardware-title-${hardware.id}`}
      >
        <DialogTitle
          id={`delete-hardware-title-${hardware.id}`}
          sx={{
            bgcolor: '#d32f2f',
            color: 'white',
            fontWeight: 600,
          }}
        >
          Delete Hardware
        </DialogTitle>

        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete the{' '}
            {isSensor ? 'sensor' : 'actuator'} <strong>{hardware.name}</strong>?
          </Typography>

          <Typography sx={{ mt: 2 }} color="text.secondary">
            This action cannot be undone.
          </Typography>

          {!isSensor && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Deleting this record does not send a close command. Close before
              deleting if needed
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={deleting}>
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Hardware'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

DeleteHardwareButton.PropTypes = {
  hardware: PropTypes.shape({
    id: PropTypes.string.isRequired,
    backendId: PropTypes.number.isRequired,
    hardwareType: PropTypes.oneOf([
      HARDWARE_TYPES.SENSOR,
      HARDWARE_TYPES.ACTUATOR,
    ]).isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
}

export default DeleteHardwareButton
