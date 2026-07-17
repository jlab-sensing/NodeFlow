import { CircularProgress, Stack, Switch, Typography } from "@mui/material";
import {styled} from '@mui/material/styles';

const SolenoidSwitch = styled(Switch)(({ theme }) => ({
    width: 76,
    height: 34,
    padding: 0,

    "& .MuiSwitch-switchBase":{
        padding: 3,
        transitionDuration: "200ms",
        "&.Mui-checked": {
            transform: "translateX(42px)",
            color: "#ffffff",

            "& + .MuiSwitch-track": {
                backgroundColor: theme.palette.success.main,
                opacity: 1,
            },
        },
        "&.Mui-disabled + .MuiSwitch-track":{
            opacity: 0.5,
        },
    },

    "& .MuiSwitch-thumb": {
        width: 28,
        height: 28,
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
    },

    "& .MuiSwitch-track":{
        borderRadius: 17,
        backgroundColor: theme.palette.error.main,
        opacity: 1,
        transition: theme.transitions.create("background-color", {
            duration: 200,
        }),
    },
}));

function OpenCloseButton({
    state,
    onStateChange,
    loading = false,
    disabled = false,
}) {
    const isOpen = state === "open";

    const handleChange = (event) => {
        const requestedState = event.target.checked ? "open" : "closed";
        onStateChange(requestedState);
    };

    return (
        <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography
                variant="body2"
                color={!isOpen ? "error.main" : "text.secondary"}
                fontWeight={!isOpen ? 600: 400}
            >
                Closed
            </Typography>

            <SolenoidSwitch
                checked={isOpen}
                onChange={handleChange}
                disabled={disabled || loading}
                slotProps={{
                    input: {
                        "aria-label": "Open or close solenoid",
                    },
                }}
            />

            <Typography
                variant="body2"
                color={isOpen ? "success.main" : "text.secondary"}
                fontWeight={isOpen ? 600 : 400}
            >
                Open
            </Typography>

            {loading && <CircularProgress size={18} />}
        </Stack>
    );
}

export default OpenCloseButton;