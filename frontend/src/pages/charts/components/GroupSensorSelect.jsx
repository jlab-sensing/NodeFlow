import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';

function GroupSensorSelect({
  groups,
  sensors,
  selectedSensorIds,
  onSelectionChange,
  loading = false,
  error = false,
}) {
  const [anchorElement, setAnchorElement] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const menuOpen = Boolean(anchorElement);

  const selectedSensorIdSet = useMemo(
    () => new Set(selectedSensorIds),
    [selectedSensorIds],
  );

  const sensorsById = useMemo(
    () =>
      new Map(
        sensors.map((sensor) => [
          sensor.uuid,
          sensor,
        ]),
      ),
    [sensors],
  );

  const knownGroupIds = useMemo(
    () => new Set(groups.map((group) => group.uuid)),
    [groups],
  );

  const sensorsByGroup = useMemo(() => {
    const groupedSensors = new Map();

    groups.forEach((group) => {
      groupedSensors.set(group.uuid, []);
    });

    sensors.forEach((sensor) => {
      if (
        sensor.group_id &&
        groupedSensors.has(sensor.group_id)
      ) {
        groupedSensors
          .get(sensor.group_id)
          .push(sensor);
      }
    });

    groupedSensors.forEach((groupSensors) => {
      groupSensors.sort((firstSensor, secondSensor) =>
        firstSensor.name.localeCompare(secondSensor.name),
      );
    });

    return groupedSensors;
  }, [groups, sensors]);

  const ungroupedSensors = useMemo(
    () =>
      sensors
        .filter(
          (sensor) =>
            !sensor.group_id ||
            !knownGroupIds.has(sensor.group_id),
        )
        .sort((firstSensor, secondSensor) =>
          firstSensor.name.localeCompare(secondSensor.name),
        ),
    [sensors, knownGroupIds],
  );

  const normalizedSearchQuery =
    searchQuery.trim().toLowerCase();

  const sensorMatchesSearch = useCallback(
    (sensor) => {
      if (!normalizedSearchQuery) {
        return true;
      }

      const searchableText = [
        sensor.name,
        sensor.sensor_type,
        sensor.logger_id,
      ]
        .filter((value) => value != null)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(
        normalizedSearchQuery,
      );
    },
    [normalizedSearchQuery],
  );

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => {
          const groupSensors =
            sensorsByGroup.get(group.uuid) ?? [];

          const groupMatchesSearch = group.name
            .toLowerCase()
            .includes(normalizedSearchQuery);

          const visibleSensors =
            groupMatchesSearch ||
            !normalizedSearchQuery
              ? groupSensors
              : groupSensors.filter(
                  sensorMatchesSearch,
                );

          return {
            group,
            groupSensors,
            visibleSensors,
            groupMatchesSearch,
          };
        })
        .filter(
          ({
            groupMatchesSearch,
            visibleSensors,
          }) =>
            !normalizedSearchQuery ||
            groupMatchesSearch ||
            visibleSensors.length > 0,
        )
        .sort((firstGroup, secondGroup) =>
          firstGroup.group.name.localeCompare(
            secondGroup.group.name,
          ),
        ),
    [
      groups,
      sensorsByGroup,
      normalizedSearchQuery,
      sensorMatchesSearch,
    ],
  );

  const visibleUngroupedSensors = useMemo(
    () =>
      ungroupedSensors.filter(
        sensorMatchesSearch,
      ),
    [ungroupedSensors, sensorMatchesSearch]);

  const selectedSensors = useMemo(
    () =>
      selectedSensorIds
        .map((sensorId) =>
          sensorsById.get(sensorId),
        )
        .filter(Boolean),
    [selectedSensorIds, sensorsById],
  );

  const selectionLabel = useMemo(() => {
    if (loading) {
      return 'Loading sensors...';
    }

    if (error) {
      return 'Unable to load sensors';
    }

    if (selectedSensors.length === 0) {
      return 'Select groups or sensors';
    }

    if (selectedSensors.length === 1) {
      return selectedSensors[0].name;
    }

    return `${selectedSensors.length} sensors selected`;
  }, [loading, error, selectedSensors]);

  const toggleSensor = (sensorId) => {
    if (selectedSensorIdSet.has(sensorId)) {
      onSelectionChange(
        selectedSensorIds.filter(
          (selectedId) =>
            selectedId !== sensorId,
        ),
      );
      return;
    }

    onSelectionChange([
      ...selectedSensorIds,
      sensorId,
    ]);
  };

  const toggleGroup = (groupSensors) => {
    if (groupSensors.length === 0) {
      return;
    }

    const groupSensorIds = groupSensors.map(
      (sensor) => sensor.uuid,
    );

    const allGroupSensorsSelected =
      groupSensorIds.every((sensorId) =>
        selectedSensorIdSet.has(sensorId),
      );

    if (allGroupSensorsSelected) {
      const groupSensorIdSet = new Set(
        groupSensorIds,
      );

      onSelectionChange(
        selectedSensorIds.filter(
          (sensorId) =>
            !groupSensorIdSet.has(sensorId),
        ),
      );
      return;
    }

    onSelectionChange([
      ...new Set([
        ...selectedSensorIds,
        ...groupSensorIds,
      ]),
    ]);
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  const handleOpen = (event) => {
    setAnchorElement(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorElement(null);
    setSearchQuery('');
  };

  const noSearchResults =
    visibleGroups.length === 0 &&
    visibleUngroupedSensors.length === 0;

  return (
    <>
      <Button
        id="group-sensor-select-button"
        variant="outlined"
        onClick={handleOpen}
        disabled={loading || Boolean(error)}
        aria-haspopup="menu"
        aria-expanded={
          menuOpen ? 'true' : undefined
        }
        aria-controls={
          menuOpen
            ? 'group-sensor-select-menu'
            : undefined
        }
        sx={{
          width: '100%',
          maxWidth: 600,
          minHeight: 56,
          px: 2,
          justifyContent: 'space-between',
          textTransform: 'none',
          color: 'text.primary',
          borderColor: 'rgba(0, 0, 0, 0.23)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
          }}
        >
          {loading && (
            <CircularProgress
              size={18}
              sx={{ mr: 1 }}
            />
          )}

          <Typography
            component="span"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selectionLabel}
          </Typography>
        </Box>

        <ExpandMoreIcon />
      </Button>

      <Menu
        id="group-sensor-select-menu"
        anchorEl={anchorElement}
        open={menuOpen}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby':
            'group-sensor-select-button',
          disablePadding: true,
        }}
        slotProps={{
          paper: {
            sx: {
              width: {
                xs: 'calc(100vw - 32px)',
                sm: 500,
              },
              maxWidth: 600,
              maxHeight: 520,
            },
          },
        }}
      >
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            bgcolor: 'background.paper',
            p: 2,
          }}
          onKeyDown={(event) =>
            event.stopPropagation()
          }
        >
          <TextField
            fullWidth
            autoFocus
            size="small"
            label="Search groups or sensors"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          />

          {selectedSensorIds.length > 0 && (
            <Button
              size="small"
              color="error"
              onClick={clearSelection}
              sx={{
                mt: 1,
                p: 0,
                textTransform: 'none',
              }}
            >
              Clear all sensors
            </Button>
          )}
        </Box>

        <Divider />

        {visibleGroups.map(
          ({
            group,
            groupSensors,
            visibleSensors,
          }) => {
            const groupSensorIds =
              groupSensors.map(
                (sensor) => sensor.uuid,
              );

            const allSelected =
              groupSensorIds.length > 0 &&
              groupSensorIds.every((sensorId) =>
                selectedSensorIdSet.has(
                  sensorId,
                ),
              );

            const someSelected =
              groupSensorIds.some((sensorId) =>
                selectedSensorIdSet.has(
                  sensorId,
                ),
              );

            return (
              <Box key={group.uuid}>
                <MenuItem
                  disabled={
                    groupSensors.length === 0
                  }
                  onClick={() =>
                    toggleGroup(groupSensors)
                  }
                  sx={{
                    bgcolor:
                      'rgba(30, 58, 95, 0.06)',
                  }}
                >
                  <Checkbox
                    checked={allSelected}
                    indeterminate={
                      someSelected && !allSelected
                    }
                    disabled={
                      groupSensors.length === 0
                    }
                    tabIndex={-1}
                    disableRipple
                  />

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{ fontWeight: 700 }}
                    >
                      {group.name}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="div"
                    >
                      {groupSensors.length === 0
                        ? 'No sensors'
                        : `${groupSensors.length} sensor${
                            groupSensors.length === 1
                              ? ''
                              : 's'
                          }`}
                    </Typography>
                  </Box>
                </MenuItem>

                {visibleSensors.map((sensor) => {
                  const selected =
                    selectedSensorIdSet.has(
                      sensor.uuid,
                    );

                  return (
                    <MenuItem
                      key={sensor.uuid}
                      onClick={() =>
                        toggleSensor(sensor.uuid)
                      }
                      sx={{ pl: 5 }}
                    >
                      <Checkbox
                        checked={selected}
                        tabIndex={-1}
                        disableRipple
                      />

                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            overflow: 'hidden',
                            textOverflow:
                              'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {sensor.name}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="div"
                        >
                          {sensor.sensor_type}
                          {' · '}
                          Logger {sensor.logger_id}
                        </Typography>
                      </Box>
                    </MenuItem>
                  );
                })}

                <Divider />
              </Box>
            );
          },
        )}

        {visibleUngroupedSensors.length > 0 && (
          <Box>
            <Box
              sx={{
                px: 2,
                py: 1.5,
                bgcolor:
                  'rgba(30, 58, 95, 0.06)',
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>
                Ungrouped Sensors
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                component="div"
              >
                Sensors that are not assigned to a
                group
              </Typography>
            </Box>

            {visibleUngroupedSensors.map(
              (sensor) => {
                const selected =
                  selectedSensorIdSet.has(
                    sensor.uuid,
                  );

                return (
                  <MenuItem
                    key={sensor.uuid}
                    onClick={() =>
                      toggleSensor(sensor.uuid)
                    }
                    sx={{ pl: 5 }}
                  >
                    <Checkbox
                      checked={selected}
                      tabIndex={-1}
                      disableRipple
                    />

                    <Box sx={{ minWidth: 0 }}>
                      <Typography>
                        {sensor.name}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        component="div"
                      >
                        {sensor.sensor_type}
                        {' · '}
                        Logger {sensor.logger_id}
                      </Typography>
                    </Box>
                  </MenuItem>
                );
              },
            )}
          </Box>
        )}

        {noSearchResults && (
          <Box
            sx={{
              px: 3,
              py: 4,
              textAlign: 'center',
            }}
          >
            <Typography color="text.secondary">
              No groups or sensors match your search.
            </Typography>
          </Box>
        )}
      </Menu>
    </>
  );
}

GroupSensorSelect.propTypes = {
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ),
  sensors: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      sensor_type: PropTypes.string.isRequired,
      logger_id: PropTypes.number.isRequired,
      group_id: PropTypes.string,
      measurements: PropTypes.arrayOf(
        PropTypes.string,
      ),
      panel_ids: PropTypes.arrayOf(
        PropTypes.string,
      ),
    }),
  ),
  selectedSensorIds: PropTypes.arrayOf(
    PropTypes.string,
  ),
  onSelectionChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.string,
  ]),
};

GroupSensorSelect.defaultProps = {
  groups: [],
  sensors: [],
  selectedSensorIds: [],
  loading: false,
  error: false,
};

export default GroupSensorSelect;
