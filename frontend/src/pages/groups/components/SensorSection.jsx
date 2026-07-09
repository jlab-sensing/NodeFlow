import GroupSection from './GroupSection'
import { useEffect, useState } from 'react';
import { Box, Button} from '@mui/material'
import axios from '../../../api/axios';

function SensorSection() {
    const [sensors, setSensors] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        async function loadSensors() {
            try {
                const res = await axios.get('/api/sensor/');    
                setSensors(res.data);
            } catch (error) {
                console.error('Error loading sensors', error);
            } finally {
                setLoading(false);
            }
        }
        loadSensors();
    }, []);
    

    return (
    <GroupSection title="Sensors" >
      {loading ? (
        <div>Loading...</div>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1, width: '90%', mx: 'auto' }}>
          {sensors.map((sensor) => (
            <Button
                key={sensor.id}
                variant= "outlined"
                sx ={{
                    backgroundColor: '#F6F6F6',
                    color: '#000000',
                    borderColor: '#000000',
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontSize: 18,
                    py: 1,
                    '&:hover': {
                        backgroundColor: '#D9D9D9',
                        borderColor: '#2AB0EE',
                    }
                }}
            >
                {sensor.sensor_type}
            </Button>
        ))}
    </Box>
      )}
    </GroupSection>
  );

}

export default SensorSection;
