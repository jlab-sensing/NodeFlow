import { Button, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAxiosPrivate from '../../../auth/hooks/useAxiosPrivate';


function CreateButton({
    groupName,
    selectedSolenoids,
    selectedSensors,
}) {
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();

    const handleCreate = async () => {
        const trimmedName = groupName.trim();
        if (!trimmedName){
            setError('Please enter a group name');
            return;
        }

        try {
            setCreating(true);
            setError('');
            const groupResponse = await axiosPrivate.post(
                '/api/groups/',
                {
                    name: trimmedName,
                }
            );

            const groupId = groupResponse.data.uuid;

            const solenoidRequests = selectedSolenoids.map(
                (solenoidId) => axiosPrivate.put(
                    `/api/solenoid/${solenoidId}/group`,
                    {
                        group_id: groupId,
                    }
                )
            );

            const sensorRequests = selectedSensors.map(
                (sensorId) => axiosPrivate.put(
                    `/api/sensor/${sensorId}/group`,
                    {
                        group_id: groupId,
                    }
                )
            );

            await Promise.all([
                ...solenoidRequests,
                ...sensorRequests,
            ]);

            navigate('/profile/groups');
        } catch (error) {
            console.error("Error creating group:", error);
            setError(error.response?.data?.detail || 'The group cannot be created');
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
        {error && (
            <Typography color="error" textAlign="center">
                {error}
            </Typography>
        )}

        <Button
            variant = 'contained'
            onClick = {handleCreate}
            disabled={creating || !groupName.trim()}
            sx={{
                alignSelf: 'center',
                width: 280,
                borderRadius: '999px',
                textTransform: 'none',
                fontSize: 20,
                backgroundColor: '#2AB0EE',
            }}
        >
            {creating ? 'Creating...' : 'Create'}
        </Button>
        </>
    );


}

export default CreateButton;