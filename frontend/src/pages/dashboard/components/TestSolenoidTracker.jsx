import { Box, CircularProgress, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import useAxiosPrivate from '../../../auth/hooks/useAxiosPrivate'

function TestSolenoidStatus() {
  const axiosPrivate = useAxiosPrivate()

  const {
    data: registeredSolenoid,
    isLoading: isRegistering,
    isError: isRegistrationError,
    error: registrationError,
  } = useQuery({
    queryKey: ['test-solenoid-registration'],
    queryFn: async () => {
      const response = await axiosPrivate.post('/api/solenoid/test/register')
      return response.data
    },
    staleTime: Infinity,
    retry: false,
  })

  const {
    data,
    isLoading: isStatusLoading,
    isError: isStatusError,
    error: statusError,
  } = useQuery({
    queryKey: ['test-solenoid-status'],
    queryFn: async () => {
      const response = await axiosPrivate.get('/api/test-solenoid/status')
      return response.data
    },
    enabled: Boolean(registeredSolenoid?.id),
    refetchInterval: 2000,
    retry: false,
  })

  if (isRegistering || isStatusLoading) {
    return <CircularProgress size={24} />
  }

  if (isRegistrationError) {
    return (
      <Typography color="error">
        {registrationError.response?.data?.detail ||
          'Unable to register test solenoid'}
      </Typography>
    )
  }

  if (isStatusError) {
    return (
      <Typography color="error">
        {statusError.response?.data?.detail || 'Test solenoid unreachable'}
      </Typography>
    )
  }
  const isOpen = data?.state === 'open'
  const stateNumber = isOpen ? 1 : 0

  return (
    <Box
      sx={{
        width: 220,
        border: '1px solid #CCCCCC',
        borderRadius: '10px',
        backgroundColor: '#FFFFFF',
        p: 2,
        textAlign: 'center',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          color: '#1E3A5F',
          fontWeight: 'bold',
        }}
      >
        Test Solenoid
      </Typography>

      <Typography
        sx={{
          fontSize: 48,
          fontWeight: 'bold',
          color: isOpen ? '#2E7D32' : '#D32F2F',
        }}
      >
        {stateNumber}
      </Typography>

      <Typography color="text.secondary">
        {isOpen ? 'Open' : 'Closed'}
      </Typography>
    </Box>
  )
}

export default TestSolenoidStatus
