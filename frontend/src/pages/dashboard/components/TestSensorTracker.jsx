import {
    Box,
    CircularProgress,
    Typography
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import useAxiosPrivate from '../../../auth/hooks/useAxiosPrivate';

function TestSensorTracker(){
    const axiosPrivate = useAxiosPrivate();

    const {
        data: registeredSensor,
        isLoading: isRegistering,
        isError: isRegistrationError,
        error: registrationError,
    } = useQuery({
        queryKey: ["test-sensor-registration"],
        queryFn: async () => {
            const response = await axiosPrivate.post(
                "/api/sensor/test/register",
            );

            return response.data;
        },
        staleTime: Infinity,
        retry: false,
    });

    const {
        data,
        isLoading: isReadingLoading,
        isError: isReadingError,
        error: readingError,
    } = useQuery({
        queryKey: ["test-sensor-reading"],
        queryFn: async () => {
            const response = await axiosPrivate.get(
                `/api/sensor/test/reading`,
            );

            return response.data;
        },
        enabled: Boolean(registeredSensor?.id),
        refetchInterval: 2000,
        retry: false,
    });

    if (isRegistering || isReadingLoading) {
        return <CircularProgress size={24} />;
    }

    if (isRegistrationError) {
        return (
            <Typography color="error">
                {registrationError.response?.data?.detail ||
                    "Unable to register test sensor"}
            </Typography>
        );
    }

    if (isReadingError) {
        return (
            <Typography color="error">
                {readingError.response?.data?.detail ||
                    "Test sensor unreachable"}
            </Typography>
        );
    }

    const displayedValue = typeof data?.value === "number" ? data.value.toFixed(3) : "--";

    return (
        <Box
            sx={{
                width: 220,
                border: "1px solid #CCCCCC",
                borderRadius: "10px",
                backgroundColor: "#FFFFFF",
                p: 2,
                textAlign: "center",
            }}
        >
            <Typography
                variant="h6"
                sx={{
                    color: "#1E3A5F",
                    fontWeight: "bold",
                }}
            >
                Test Sensor
            </Typography>

            <Typography
                sx={{
                    fontSize: 48,
                    fontWeight: "bold",
                    color: "#2AB0EE",
                }}
            >
                {displayedValue}
            </Typography>

            <Typography color="text.secondary">
                {data?.unit}
            </Typography>

            <Typography
                variant="body2"
                component="div"
                sx={{ mt: 1 }}
            >
                Measurement: {data?.measurement}
            </Typography>

            <Typography
                variant="body2"
                component="div"
                color="text.secondary"
            >
                Mode: {data?.mode}
            </Typography>
        </Box>
    );
}

export default TestSensorTracker;
