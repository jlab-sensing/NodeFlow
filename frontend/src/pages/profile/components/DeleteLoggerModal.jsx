import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import { Box, Button, IconButton, Modal, Typography } from '@mui/material'
import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { deleteLogger } from '../../../services/logger'
import PropTypes from 'prop-types'

function DeleteLoggerModal({ id }) {
  const data = useOutletContext()
  const user = data[4]
  const refetch = data[9]
  const axiosPrivate = data[10]

  const [isOpen, setOpen] = useState(false)
  const [response, setResponse] = useState(null)
  const [loggerId, setLoggerId] = useState('')

  const handleOpen = () => {
   if (id === '' || id == null){
    return
   }
   setLoggerId(id)
   setResponse(null)
   setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setResponse(null)
    setLoggerId('')
  }

  const handleDeleteLogger = async () => {
    try {
      const result = await deleteLogger(loggerId, axiosPrivate)
      setResponse({
        error: false,
        ...result,
      })
      await refetch()
    } catch (error) {
      console.error('Delete failed:', error)
      setResponse({
        error: true,
        message:
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message || "Failed to delete logger",
      })
    }
  }

  if (!user) {
    return <></>
  }

  return (
    <>
      <Button 
        sx={{ color: 'black' }} 
        key="delete" 
        onClick={handleOpen}
        disabled={id === '' || id == null}
      >
        <DeleteIcon />
      </Button>

      <Modal
        open={isOpen}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 450,
            bgcolor: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: 'none',
            overflow: 'hidden',
          }}
        >
          {!response ? (
            <>
              {/* Header Section */}
              <Box
                sx={{
                  backgroundColor: '#d32f2f',
                  padding: '1.5rem 2rem',
                  position: 'relative',
                  mb: 0,
                }}
              >
                <IconButton
                  sx={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
                    color: 'white',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                  }}
                  aria-label="close"
                  size="small"
                  onClick={handleClose}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
                <Typography
                  variant="h5"
                  component="h2"
                  sx={{
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1.5rem',
                  }}
                >
                  Delete Logger
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    mt: 0.5,
                  }}
                >
                  This action cannot be undone
                </Typography>
              </Box>

              {/* Content Section */}
              <Box sx={{ padding: '2rem' }}>
                <Typography
                  variant="body1"
                  sx={{ mb: 3, color: '#666', lineHeight: 1.6 }}
                >
                  This logger is shared by all NodeFlow users and stored in dirtViz.
                  It cannot be deleted while any NodeFlow sensor or actuator is using it.
                  Are you sure you want to delete it? 
                </Typography>

                {/* Action Buttons */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end',
                    pt: '1.5rem',
                    borderTop: '1px solid #f0f0f0',
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={handleClose}
                    sx={{
                      borderColor: '#ddd',
                      color: '#666',
                      '&:hover': {
                        borderColor: '#bbb',
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleDeleteLogger}
                    sx={{
                      backgroundColor: '#d32f2f',
                      '&:hover': { backgroundColor: '#b71c1c' },
                      borderRadius: '8px',
                      px: '1.5rem',
                    }}
                  >
                    Delete Logger
                  </Button>
                </Box>
              </Box>
            </>
          ) : (
            <>
              {response.error ? (
                <>
                  {/* Error Header */}
                  <Box
                    sx={{
                      backgroundColor: '#d32f2f',
                      padding: '1.5rem 2rem',
                      position: 'relative',
                      mb: 0,
                    }}
                  >
                    <Typography
                      variant="h5"
                      component="h2"
                      sx={{
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '1.5rem',
                      }}
                    >
                      Error Deleting Logger
                    </Typography>
                  </Box>

                  {/* Error Content */}
                  <Box sx={{ padding: '2rem' }}>
                    <Typography
                      variant="body1"
                      sx={{ mb: 3, color: '#666', lineHeight: 1.6 }}
                    >
                      {response.message ||
                        'An error occurred while deleting the logger.'}
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={handleClose}
                      sx={{
                        backgroundColor: '#d32f2f',
                        '&:hover': { backgroundColor: '#b71c1c' },
                        borderRadius: '8px',
                        width: '100%',
                        py: '0.75rem',
                      }}
                    >
                      Close
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  {/* Success Header */}
                  <Box
                    sx={{
                      backgroundColor: '#2e7d32',
                      padding: '1.5rem 2rem',
                      position: 'relative',
                      mb: 0,
                    }}
                  >
                    <Typography
                      variant="h5"
                      component="h2"
                      sx={{
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '1.5rem',
                      }}
                    >
                      Logger Deleted Successfully!
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.8)',
                        mt: 0.5,
                      }}
                    >
                      The shared logger was successfully removed from DirtViz.
                    </Typography>
                  </Box>

                  {/* Success Content */}
                  <Box sx={{ padding: '2rem' }}>
                    <Button
                      variant="contained"
                      onClick={handleClose}
                      sx={{
                        backgroundColor: '#2e7d32',
                        '&:hover': { backgroundColor: '#1b5e20' },
                        borderRadius: '8px',
                        width: '100%',
                        py: '0.75rem',
                        fontSize: '1rem',
                        fontWeight: 500,
                      }}
                    >
                      Done
                    </Button>
                  </Box>
                </>
              )}
            </>
          )}
        </Box>
      </Modal>
    </>
  )
}

DeleteLoggerModal.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
}

export default DeleteLoggerModal
