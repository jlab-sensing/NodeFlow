import { Box, CircularProgress, Typography } from "@mui/material";
import TopNav from "../../components/TopNav";
import TestSolenoidStatus from "./components/TestSolenoidTracker";
import GroupBox from "./components/GroupBox";
import { useUserGroups } from "../../services/group";
import useAxiosPrivate from "../../auth/hooks/useAxiosPrivate";
import TestSensorTracker from "./components/TestSensorTracker";

function Dashboard() {
    const axiosPrivate = useAxiosPrivate();

    const {
        data: groups = [],
        isLoading,
        isError,
    } = useUserGroups(axiosPrivate);


    return (
        
        <Box
            sx={{
                width: "100%",
                minHeight: '100vh',
                backgroundColor: '#F5F5F5',
            }}
        >
            <TopNav />
            <Box
                component={"main"}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    p: 4,
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        gap: 2,
                        flexWrap: "wrap",
                    }}
                >
                    <TestSolenoidStatus />
                    <TestSensorTracker />
                </Box>

                {isLoading ? (
                    <CircularProgress />
                ) : isError ? (
                    <Typography color="error">
                        Unable to load groups.
                    </Typography>
                ) : (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            width: '100%',
                        }}
                    >
                        {groups.map((group) => (
                            <GroupBox
                                key={group.uuid}
                                group={group}
                            />
                        ))}
                    </Box>
                )}
            </Box>
        </Box>

    );
}
export default Dashboard;
