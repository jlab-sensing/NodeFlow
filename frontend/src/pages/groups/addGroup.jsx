import { Box, Button, TextField, Typography } from '@mui/material';
import Nav from '../../components/Nav';
import TopNav from '../../components/TopNav';
import SolenoidSection from  './components/SolenoidSection'
import SensorSection from './components/SensorSection';
import ActivationPrefSection from './components/ActivationPrefSection';
import NotificationPrefSection from './components/NotificationPrefSection';

function AddGroup() {
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
                    variant="outlined"
                    sx={{
                        backgroundColor: '#ffffff',
                    }}
                />

                <SolenoidSection />
                <SensorSection />
                <ActivationPrefSection />
                <NotificationPrefSection />

                <Button
                    variant="contained"
                    sx={{
                        alignSelf: 'center',
                        width: 280,
                        borderRadius: '999px',
                        textTransform: 'none',
                        fontSize: 20,
                        backgroundColor: '#2AB0EE',
                    }}
                >
                    Create
                </Button>
            </Box>
        </Box>
        </>
        
    )
}

export default AddGroup;