import { useState } from "react";
import DeleteIcon from '@mui/icons-material/Delete';
import {
    Alert, 
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';

function DeleteGroupButton({
    group,
    axiosPrivate,
    onDeleted,
}) {
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    const handleOpen= () => {
        setError('');
        setOpen(true);
    };

    const handleClose =() => {
        if (!deleting) {
            setOpen(false);
            setError('');
        }
    };

    const handleDelete = async () => {
        try {
            setDeleting(true);
            setError('');

            await axiosPrivate.delete(
                `/api/groups/${group.uuid}`
            );

            await onDeleted(group.uuid);
            setOpen(false);
        } catch (requestError) {
            console.error(
                "Error deleting group:",
                requestError
            );

            setError(
                requestError.response?.data?.detail ||
                'The group could not be deleted.'
            );
        } finally {
        setDeleting(false);
        }
    };

    return (
        <>
            <Button
                onClick={handleOpen}
                aria-label={`Delete ${group.name}`}
                sx={{
                    color: 'black',
                    '&:hover': {
                        color: '#d32f2f',
                        backgroundColor: 'rgba(211, 47, 47, 0.08',
                    },
                }}
            >
                <DeleteIcon />
            </Button>

            <Dialog
                open={open}
                onClose={handleClose}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    Delete Group
                </DialogTitle>

                <DialogContent>
                    <Typography>
                        Are you sure you want to delete{' '}
                        <strong>{group.name}</strong>
                    </Typography>
    
                    {error && (
                        <Alert severity="error" sx={{ mt: 2}}>
                            {error}
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={handleClose}
                        disabled={deleting}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default DeleteGroupButton;
