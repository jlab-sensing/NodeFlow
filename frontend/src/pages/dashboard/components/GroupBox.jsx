import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import useAxiosPrivate from "../../../auth/hooks/useAxiosPrivate";

function GroupBox({ group }) {
  const axiosPrivate = useAxiosPrivate();
  const [devices, setDevices] = useState({
    solenoids: [],
    sensors: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadDevices = async () => {
      try {
        setError("");
        const response = await axiosPrivate.get(
          `/api/groups/${group.uuid}/devices`,
        );

        if (!cancelled) {
          setDevices(response.data);
        }
      } catch (requestError) {
        console.error("Error loading group devices", requestError);

        if (!cancelled) {
          setError(
            requestError.response?.data?.detail ||
              "Unable to load group devices",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDevices();

    return () => {
      cancelled = true;
    };
  }, [axiosPrivate, group.uuid]);

  const solenoids = devices.solenoids ?? [];
  const sensors = devices.sensors ?? [];

  return (
    <Box
      sx={{
        backgroundColor: "#D9D9D9",
        border: "1px solid #000000",
        borderRadius: "30px",
        p: 2,
      }}
    >
      <Typography variant="h4" color="text.secondary">
        {group.name}
      </Typography>

      {loading ? (
        <CircularProgress size={20} sx={{ mt: 2 }} />
      ) : error ? (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      ) : (
        <Box
          sx={{
            display: "flex",
            gap: 4,
            alignItems: "flex-start",
            mt: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
              Solenoids
            </Typography>

            {solenoids.length > 0 ? (
              solenoids.map((solenoid) => (
                <Typography
                  key={solenoid.id}
                  variant="body2"
                  component="div"
                  sx={{ mb: 0.5 }}
                >
                  {solenoid.name}: {solenoid.active_state}
                </Typography>
              ))
            ) : (
              <Typography variant="body2" component="div">
                No solenoids
              </Typography>
            )}
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
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
                  {sensor.name}
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
  );
}

export default GroupBox;
