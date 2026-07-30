import {Box, CircularProgress, Typography} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import useAxiosPrivate from '../../../auth/hooks/useAxiosPrivate';

function TestSolenoidStatus() {
    const axiosPrivate = useAxiosPrivate();

    const {
        data,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['test-solenoid-status'],

        queryFn: async () => {
            const response = await axiosPrivate.get(
                `/api/test-solenoid/status`
            );
            return response.data;
        },

        refetchInterval: 2000,
    });

    if (isLoading) {
        return <CircularProgress size={24} />;
    }

    if (isError) {
        return (
            <Typography color="error">
                Test Solenoid Unreachable
            </Typography>
        );
    }

    const isOpen = data?.state === 'open';
    const stateNumber = isOpen ? 1 : 0;

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
                    color: isOpen ? '#2E7D32' : '#D32F2F'
                }}
            >
                {stateNumber}
            </Typography>

            <Typography color="text.secondary">
                {isOpen ? 'Open' : 'Closed'}
            </Typography>
        </Box>
    );
}

export default TestSolenoidStatus