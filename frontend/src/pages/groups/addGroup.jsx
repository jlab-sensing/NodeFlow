import { Box, Button, stepClasses, TextField, Typography } from '@mui/material';
import Nav from '../../components/Nav';
import TopNav from '../../components/TopNav';
import SolenoidSection from  './components/SolenoidSection'
import SensorSection from './components/SensorSection';
import ActivationPrefSection from './components/ActivationPrefSection';
import NotificationPrefSection from './components/NotificationPrefSection';
import CreateButton from './components/CreateButton'

import { useState } from 'react';
import { useActionData, useNavigate } from 'react-router-dom';
import useAxiosPrivate from '../../auth/hooks/useAxiosPrivate';

function AddGroup() {

    const [groupName, setGroupName] = useState('');
    const [selectedSolenoids, setSelectedSolenoids] = useState([]);
    const [selectedSensors, setSelectedSensors] = useState([]);
    const [creating, setCreating] = useState(false);

    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();


    return (
        <>
        <TopNav />
        <Box
            sx={{
            minHeight: 'calc(100vh - 72px)',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            px: 3,
            py: 4,
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    maxWidth: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    backgroundColor: '#d9d9d9',
                    border: '1px solid #777',
                    borderRadius: '14px',
                    px: 4,
                    py: 3,
                }}
            >
                <Typography 
                    variant="h5"
                    sx={{
                        textAlign: { xs: 'left', sm: 'center' },
                        color: '#1E3A5F',
                        fontWeight: 'bold',
                        fontSize: 48,

                    }}>
                    Add Group
                </Typography>

                <TextField
                    fullWidth
                    placeholder="Group Name"
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    variant="outlined"
                    sx={{
                        backgroundColor: '#ffffff',
                    }}
                />

                <SolenoidSection 
                    selectedIds={selectedSolenoids}
                    onSelectionChange={setSelectedSolenoids}
                />
                <SensorSection 
                    selectedIds={selectedSensors}
                    onSelectionChange={setSelectedSensors}
                />
                <ActivationPrefSection />
                <NotificationPrefSection />
                <CreateButton 
                    groupName={groupName}
                    selectedSolenoids={selectedSolenoids}
                    selectedSensors={selectedSensors}
                />

            </Box>
        </Box>
        </>
        
    )
}

export default AddGroup;