import { CircularProgress, Stack, Switch } from "@mui/material";
import {styled} from '@mui/material/styles';

const ModeSwitch = styled(Switch)(({ theme }) => ({
    width: 110,
    height: 38,
    padding: 0,

    "& .MuiSwitch-switchBase":{
        padding: 4,
        transitionDuration: "200ms",
        zIndex: 2,

        "&.Mui-checked": {
            transform: "translateX(61px)",
            color: "#ffffff",

            "& + .MuiSwitch-track": {
                backgroundColor: theme.palette.success.main,
                opacity: 1,

                "&::before": {
                    content: '"auto"',
                    left: 12,
                    right: "auto",
                },
            },
        },

        "&.Mui-disabled + .MuiSwitch-track":{
            opacity: 0.5,
        },
    },

    "& .MuiSwitch-thumb": {
        width: 40,
        height: 30,
        borderRadius: "5px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
    },

    "& .MuiSwitch-track":{
        position: "relative",
        borderRadius: 5,
        backgroundColor: theme.palette.error.main,
        opacity: 1,
        transition: theme.transitions.create("background-color", {
            duration: 200,
        }),

        "&::before": {
            content: '"manual"',
            position: "absolute",
            top: "50%",
            right: 9,
            transform: "translateY(-50%)",
            color: "#FFFFFF",
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
        },
    },
}));

function ManualAutoSwitch({
    state,
    onStateChange,
    loading = false,
    disabled = false,
}) {
    const isAuto = state === "auto";

    const handleChange = (event) => {
        const requestedState = event.target.checked ? "auto" : "manual";
        onStateChange(requestedState);
    };

    return (
       <Stack direction="row" spacing={1} alignItems="center">
            <ModeSwitch
                checked={isAuto}
                onChange={handleChange}
                disabled={disabled || loading}
                slotProps={{
                    input: {
                        "aria-label": `Solenoid is currently ${state}`
                    },
                }}
            />

            {loading && <CircularProgress size={18} />}
        </Stack>
    );
}

export default ManualAutoSwitch;
