import GroupSection from './GroupSection'
import { useEffect, useState } from 'react';
import { Box, Button} from '@mui/material'
import axios from '../../../api/axios';

function SolenoidSection() {
    const [solenoids, setSolenoids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSolenoids, setSelectedSolenoids] = useState([]);

    useEffect(() => {
        async function loadSolenoids() {
            try {
                const res = await axios.get('/api/solenoid/', {
                    params: {available: true },
                });

                setSolenoids(res.data);
            } catch (error) {
                console.error('Error loading solenoids', error);
            } finally {
                setLoading(false);
            }
        }

        loadSolenoids();
    }, []);

    useEffect(() => {

    }, [selectedSolenoids]);


  return (
    <GroupSection title="Available Solenoids" >
      {loading ? (
        <div>Loading...</div>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mt: 1 }}>
          {solenoids.map((solenoid) => (
            <Button
                key={solenoid.id}
                variant= "outlined"
                sx ={{
                    width:'90%',
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
                {solenoid.name}
            </Button>
        ))}
    </Box>
      )}
    </GroupSection>
  );
}

export default SolenoidSection;
