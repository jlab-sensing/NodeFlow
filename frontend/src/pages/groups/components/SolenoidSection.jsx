import GroupSection from './GroupSection'
import { useEffect, useState } from 'react';
import { Box, Button} from '@mui/material'
import axios from '../../../api/axios';

function SolenoidSection({ selectedIds, onSelectionChange }) {
    const [solenoids, setSolenoids] = useState([]);
    const [loading, setLoading] = useState(true);

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

const toggleSolenoidSelection = (solenoidId) => {
    onSelectionChange((currentIds) => 
        currentIds.includes(solenoidId) ? currentIds.filter((id) => id !== solenoidId) : [...currentIds, solenoidId]
    );
};

  return (
    <GroupSection title="Available Solenoids" >
      {loading ? (
        <div>Loading...</div>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mt: 1 }}>
          {solenoids.map((solenoid) => {
            const selected = selectedIds.includes(solenoid.id);
            return (
            <Button
                key={solenoid.id}
                onClick={() => toggleSolenoidSelection(solenoid.id)}
                aria-pressed={selected}
                variant= {selected ? 'contained' : 'outlined'}
                sx ={{
                    width:'90%',
                    backgroundColor: selected ? '#F6F6F6' : '#1E3A5F',
                    color: '#000000',
                    borderColor: selected ? '#000000' : '#1E3A5F',
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
            );
        })}
    </Box>
      )}
    </GroupSection>
  );
}

export default SolenoidSection;
