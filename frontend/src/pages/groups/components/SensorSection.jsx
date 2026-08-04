import GroupSection from './GroupSection'
import { useEffect, useState } from 'react';
import { Box, Button} from '@mui/material'
import useAxiosPrivate from '../../../auth/hooks/useAxiosPrivate';

function SensorSection({ selectedIds, onSelectionChange}) {
    const axiosPrivate = useAxiosPrivate();
    const [sensors, setSensors] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        async function loadSensors() {
            try {
                const res = await axiosPrivate.get('/api/sensor/');
                setSensors(res.data);
            } catch (error) {
                console.error('Error loading sensors', error);
            } finally {
                setLoading(false);
            }
        }
        loadSensors();
    }, [axiosPrivate]);

const toggleSensorSelection = (sensorId) => {
    onSelectionChange((currentIds) => 
        currentIds.includes(sensorId) ? currentIds.filter((id) => id !== sensorId) : [...currentIds, sensorId]
    );
};
    

    return (
    <GroupSection title="Sensors" >
      {loading ? (
        <div>Loading...</div>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1, width: '90%', mx: 'auto' }}>
          {sensors
            .filter((sensor) => !sensor.group_id || selectedIds.includes(sensor.id))
            .map((sensor) => {
            const selected = selectedIds.includes(sensor.id);

            return (
            <Button
                key={sensor.id}
                onClick={() => toggleSensorSelection(sensor.id)}
                aria-pressed={selected}
                variant= {selected ? "contained" : "outlined"}
                sx ={{
                    backgroundColor: selected ? '#1E3A5F' : '#F6F6F6',
                    color: selected ? '#F6F6F6': '#000000',
                    borderColor: selected ? '#1E3A5F' : '#000000',
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontSize: 18,
                    py: 1,
                    '&:hover': {
                        backgroundColor: '#2AB0EE',
                        borderColor: '#2AB0EE',
                        color: '#000000'
                    }
                }}
            >
                {sensor.sensor_type}
            </Button>
            );
        })}
    </Box>
      )}
    </GroupSection>
  );

}

export default SensorSection;
