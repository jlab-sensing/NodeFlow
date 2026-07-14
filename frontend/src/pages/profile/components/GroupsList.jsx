import { Accordion, AccordionDetails, AccordionSummary, Box, Button, CircularProgress, Divider, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useState } from 'react';
import DeleteGroupButton from './DeleteGroupButton';

function GroupsList() {
  const navigate = useNavigate();
  const data = useOutletContext();

  const isLoading = data[12];
  const isError = data[13];
  const user = data[4];
  const axiosPrivate = data[10];
  const refetchGroups = data[14];
  const groups = data[11];


  const [expandedGroup, setExpandedGroup] = useState(null);
  const [devicesByGroup, setDevicesByGroup] = useState({});
  const [loadingGroup, setLoadingGroup] = useState(null);
  const [error, setError] = useState('');


  const handleGroupToggle = async (groupUuid) => {
    if (expandedGroup === groupUuid) {
      setExpandedGroup(null);
      return;
    }


    setExpandedGroup(groupUuid);
    setError('');

    if (devicesByGroup[groupUuid]){
      return;
    }

    try {
      setLoadingGroup(groupUuid);
      const response = await axiosPrivate.get(
        `/api/groups/${groupUuid}/devices`
      );

      setDevicesByGroup((currentDevices) => ({
        ...currentDevices,
        [groupUuid]: response.data,
      }));
    } catch (requestError) {
      console.error(
        'Error loading group devices',
        requestError
      );
      setError(
        requestError.response?.data?.detail || "Unable to load this group's devices."
      );
    } finally {
      setLoadingGroup(null);
    }
  };

  const handleGroupDeleted = async (groupUuid) => {
    setExpandedGroup(null);

    setDevicesByGroup((currentDevices) => {
      const updatedDevices = {
        ...currentDevices
      };
      delete updatedDevices[groupUuid];
      return updatedDevices;
    });
    await refetchGroups();
  };


  if (!user) {
    return null;
  }
  if (isLoading) {
    return (
      <Box
      sx = {{
        display: 'flex',
        justifyContent: 'center',
        p: 4,
      }}
      >
        <CircularProgress />
      </Box>
    );
  }
  if (isError) {
    return (
      <Typography color="error">
        Error loading groups.
      </Typography>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <Typography>
        You do not have any groups yet.
      </Typography>
    );
  }

  return (
    <Box
      sx = {{
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#A0A0A0',
        width: {
          xs: '100%',
          sm: '95%',
          md: '90%',
        },
        maxWidth: '1400px',
        minHeight: {
          xs: 'calc(100vh - 80px)',
          md: '100vh',
        },
        p: {
          xs: 1,
          sm: 1.5,
          md: 2,
        },
        borderRadius: '10px',
        flexGrow: 1,
        boxSizing: 'border-box',
      }}
      >

      <Box 
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          width: '100%',
          mb: 2,
        }}
      >
        <Box />

        <Typography
          variant="h5"
          sx= {{
            color: '#1E3A5F',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
          >
            Your Groups
          </Typography>

          <Button
            onClick={() => navigate('/add-group')}
            aria-label='Add group'
            sx={{
              color: 'black',
              justifySelf: 'end',
            }}
          >
            <AddCircleIcon />
          </Button>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
            >
              {groups.map((group) => {
                const isExpanded = expandedGroup === group.uuid;
                const devices = devicesByGroup[group.uuid];
                const sensors = devices?.sensors || [];
                const solenoids = devices?.solenoids || [];
                const isLoadingDevices = loadingGroup === group.uuid;

                return (
                  <Accordion
                    key={group.uuid}
                    expanded={isExpanded}
                    onChange={() =>
                      handleGroupToggle(group.uuid)
                    }
                    disableGutters
                    sx={{
                      borderRadius: '8px',
                      overflow: 'hidden',
                      '&::before': {
                        display: 'none',
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls={`${group.uuid}-content`}
                      id={`${group.uuid}-header`}
                      sx={{
                        backgroundColor: '#F6F6F6',
                        '&:hover':{
                          backgroundColor: '#E4E4E4',
                        },
                      }}
                    >
                      <Box 
                        sx={{ 
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          pr: 2,
                        }}
                      >
                        <Typography
                          sx={{
                            color: '#1E3A5F',
                            fontWeight: 'bold',
                            fontSize: 18,
                          }}
                        >
                          {group.name}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          Group ID: {group.id}
                        </Typography>
                      </Box>
                    </AccordionSummary>

                    <AccordionDetails
                      sx={{
                        backgroundColor: '#FFFFFF',
                        p: 3,
                      }}
                    >
                      {isLoadingDevices ? (
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            p: 2,
                          }}
                        >
                          <CircularProgress size={30} />
                        </Box>
                      ) : error && isExpanded ? (
                        <Typography color="error">
                          {error}
                        </Typography>
                      ) : devices ? (
                        <Box>
                          <Typography
                          variant='h6'
                          sx={{
                            color: '#1E3A5F',
                            fontWeight: 'bold',
                            mb: 1,
                          }}
                        >
                          Solenoids
                        </Typography>

                        {solenoids.length > 0 ? (
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1,
                            }}
                          >
                            {solenoids.map((solenoid) => (
                              <Box
                                key={solenoid.id}
                                sx={{
                                  width: '95%',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  backgroundColor: '#f6f6f6',
                                  border: '1px solid #CCCCCC',
                                  borderRadius: '6px',
                                  p: 1.5,
                                  pr: 2,
                                }}
                              >
                                <Typography 
                                  fontWeight="bold" 
                                  sx={{
                                    color: '#1E3A5F',
                                  }}
                                >
                                  {solenoid.name}
                                </Typography>

                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    ml: 10
                                  }}
                                >
                                  State: {solenoid.active_state}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Typography color="text.secondary">
                            No solenoids assigned to this group.
                          </Typography>
                        )}

                        <Divider sx={{my: 3}} />

                        <Typography
                          variant="h6"
                          sx={{
                            color: '#1E3A5F',
                            fontWeight: 'bold',
                            mb: 1,
                          }}
                        >
                          Sensors
                        </Typography>

                         {sensors.length > 0 ? (
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1,
                            }}
                          >
                            {sensors.map((sensor) => (
                              <Box
                                key={sensor.id}
                                sx={{
                                  width: '95%',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  backgroundColor: '#f6f6f6',
                                  border: '1px solid #CCCCCC',
                                  borderRadius: '6px',
                                  p: 1.5,
                                  pr: 2,
                                }}
                              >
                                <Typography fontWeight="bold">
                                  {sensor.sensor_type}
                                </Typography>

                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Sensor ID: {sensor.sensor_id}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Typography color="text.secondary">
                            No sensors assigned to this group.
                          </Typography>
                        )}
                        </Box>
                      ) : null}

                      <Divider sx={{ my: 3}} />

                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <DeleteGroupButton
                          group={group}
                          axiosPrivate={axiosPrivate}
                          onDeleted={handleGroupDeleted}
                        />
                      </Box>

                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
      </Box>
  );
}

export default GroupsList;
