import { Box } from "@mui/material";
import TopNav from "../../components/TopNav";
import TestSolenoidStatus from "./components/TestSolenoidTracker";

function Dashboard() {
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
                    justifyContent: 'center',
                    p: 4,
                }}
            >
                <TestSolenoidStatus />
            </Box>
        </Box>

    );
}
export default Dashboard;