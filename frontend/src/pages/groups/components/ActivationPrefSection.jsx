import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
  Button,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState } from 'react';
import useAxiosPrivate from '../../../auth/hooks/useAxiosPrivate';
import GroupSection from './GroupSection';

const measurementsBySensorType = {
  soil_moisture: ['vwc'],
  teros: ['vwc', 'temperature', 'conductivity'],
  conductivity: ['conductivity'],
  temperature: ['temperature'],
};

function ActivationPrefSection({ selectedSensorIds, value, onChange }) {

  const axiosPrivate = useAxiosPrivate();
  const [sensors, setSensors] = useState([]);
  const [showCloseCondition, setShowCloseCondition] = useState(value.closeConditionValue !== "");

  const oppositeOperator = value.conditionOperator === "<" ? ">" : "<";
  const activationConditionComplete = value.sensorId && value.measurement && value.conditionValue !== "";

  useEffect(() => {
    async function loadSensors() {
      try {
        const response = await axiosPrivate.get("/api/sensor/");
        setSensors(response.data);
      } catch (error) {
        console.error("Unable to load sensors", error);
      }
    }
    loadSensors();
  }, [axiosPrivate]);

  const selectedSensors = sensors.filter((sensor) =>
    selectedSensorIds.includes(sensor.id),
  );

  const measurementOptions = selectedSensors.flatMap((sensor) => {
    const measurements = measurementsBySensorType[sensor.sensor_type] ?? [];

    return measurements.map((measurement) => ({
      sensorId: sensor.id,
      measurement,
      sensorName: sensor.sensor_type,
      value: `${sensor.id}:${measurement}`,
    }));
  });

  const selectedMeasurement = value.sensorId && value.measurement
    ? `${value.sensorId}:${value.measurement}`
    : '';

  const displayedMeasurement = measurementOptions.some(
    (option) => option.value === selectedMeasurement,
  )
    ? selectedMeasurement
    : '';

  return (
    <GroupSection title="Activation Preferences">
      <Box
        sx={{
          width: '90%',
          mx: 'auto',
          mt: 1,
          p: 2,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'auto minmax(180px, 2fr) minmax(150px, 1fr) minmax(150px, 1fr)',
          },
          alignItems: 'center',
          gap: 2,
          border: '1px solid #000000',
          borderRadius: '6px',
          backgroundColor: '#F6F6F6',
          boxSizing: 'border-box',
        }}
      >
        <Typography
          sx={{
            fontSize: 18,
            fontWeight: 700,
            color: '#000000',
          }}
        >
          Condition:
        </Typography>

        <FormControl fullWidth>
          <InputLabel id="activation-measurement-label">
            Measurement
          </InputLabel>

          <Select
            labelId="activation-measurement-label"
            value={displayedMeasurement}
            label="Measurement"
            onChange={(event) => {
              const [sensorId, measurement] = event.target.value.split(':');

              onChange({
                ...value,
                sensorId: Number(sensorId),
                measurement,
              });
            }}
            disabled={measurementOptions.length === 0}
          >
            <MenuItem value="" disabled>
              {selectedSensorIds.length === 0
                ? 'Select a sensor first'
                : 'Select measurement'}
            </MenuItem>

            {measurementOptions.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
              >
                {option.measurement} - {option.sensorName}
              </MenuItem>
            ))}
          </Select>

        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="activation-operator-label">
            Operator
          </InputLabel>
          <Select
            labelId="activation-operator-label"
            value={value.conditionOperator}
            label="Operator"
            onChange={(event) => {
              const conditionOperator = event.target.value;
              const closeConditionOperator = conditionOperator === "<" ? ">" : "<";
              onChange({
                ...value,
                conditionOperator: event.target.value,
                closeConditionOperator,
              })
            }}
          >
            <MenuItem value="<">Less than</MenuItem>
            <MenuItem value=">">Greater than</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          type="number"
          label="Threshold"
          placeholder="Enter value"
          value={value.conditionValue}
          onChange={(event) =>
            onChange({
              ...value,
              conditionValue: event.target.value,
            })
          }
          slotProps={{
            htmlInput: {
              step: 0.01,
            },
          }}
        />
      </Box>
          {activationConditionComplete && !showCloseCondition && (
            <Button
              type="button"
              variant="outlined"
              onClick={() => {
                setShowCloseCondition(true);

                onChange({
                  ...value,
                  closeConditionOperator: oppositeOperator,
                  closeConditionValue: "",
                });
              }}
              sx={{
                alignSelf: "center",
                textTransform: "none",
              }}
            >
              Create a close condition
            </Button>
          )}

          {showCloseCondition && (
              <Box
                sx={{
                  width: '90%',
                  mx: 'auto',
                  mt: 1,
                  p: 2,
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "auto minmax(180px, 2fr) minmax(150px, 1fr) minmax(150px, 1fr)",
                  },
                  alignItems: "center",
                  gap: 2,
                  border: "1px solid #000000",
                  borderRadius: "6px",
                  backgroundColor: "#f6f6f6",
                  position: "relative",
                  pt: 7,
                }}
              >
                <Tooltip title="Delete close condition">
                  <IconButton
                    type="button"
                    color="error"
                    aria-label="Delete close condition"
                    onClick={() => {
                      setShowCloseCondition(false);
                      onChange({
                        ...value,
                        closeConditionOperator: oppositeOperator,
                        closeConditionValue: "",
                      });
                    }}
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>

                <Typography fontWeight={700}>
                  Close Condition:
                </Typography>

                <TextField
                  fullWidth
                  label="Measurement"
                  value={value.measurement}
                  disabled
                />

                <TextField
                  fullWidth
                  label="Operator"
                  value={oppositeOperator}
                  disabled
                />

                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Close threshold"
                  value={value.closeConditionValue}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      closeConditionOperator:
                        oppositeOperator,
                      closeConditionValue:
                        event.target.value,
                    })
                  }
                  slotProps={{
                    htmlInput: {
                      step: 0.01,
                    },
                  }}
                />

              </Box>
          )}

    </GroupSection>
  );
}

export default ActivationPrefSection;
