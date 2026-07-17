import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import useAxiosPrivate from "../../../auth/hooks/useAxiosPrivate";
import OpenCloseButton from "./OpenCloseButton";

function GroupBox({ group }) {
  const axiosPrivate = useAxiosPrivate();
  const [devices, setDevices] = useState({
    solenoids: [],
    sensors: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [changingSolenoidId, setChangingSolenoidId] = useState(null);
  const [actionError, setActionError] = useState("");

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

  const handleSolenoidStateChange = async (
    solenoidId,
    requestedState,
  ) => {
    try {
      setActionError("");
      setChangingSolenoidId(solenoidId);

      const action = requestedState === "open" ? "open" : "close";
      const response = await axiosPrivate.post(
        `/api/solenoid/${solenoidId}/${action}`,
      );
      const confirmedState = response.data.state;

      setDevices((currentDevices) => ({
        ...currentDevices,
        solenoids: (currentDevices.solenoids ?? []).map(
          (solenoid) =>
            solenoid.id === solenoidId
              ? {
                  ...solenoid,
                  active_state: confirmedState,
                }
              : solenoid,
        ),
      }));
    } catch (requestError) {
      console.error("Unable to change solenoid state", requestError);
      setActionError(
        requestError.response?.data?.detail || "unable to change solenoid state",
      );
    } finally {
      setChangingSolenoidId(null);
    }
  }

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
                <Box
                    key={solenoid.id}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        mb: 1.5,
                    }}
                >
                    <Typography variant="body2">
                        {solenoid.name}
                    </Typography>

                    <OpenCloseButton
                        state={solenoid.active_state}
                        loading={changingSolenoidId === solenoid.id}
                        onStateChange={(requestedState) =>
                            handleSolenoidStateChange(
                                solenoid.id,
                                requestedState,
                            )
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
