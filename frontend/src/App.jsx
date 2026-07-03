import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AuthContextProvider from './auth/AuthContextProvider';
import Charts from './pages/charts/Charts';
import AddGroup from './pages/groups/addGroup';
import Profile from './pages/profile/profile';
import AccountInfo from './pages/profile/components/AccountInfo';
import CellsList from './pages/profile/components/CellsList';
import LoggersList from './pages/profile/components/LoggersList';


const queryClient = new QueryClient();

function App() {
  const theme = createTheme({
    typography: {
      fontFamily: 'Nunito Sans, sans-serif',
    },
    components: {
      MuiTypography: {
        defaultProps: {
          variantMapping: {
            h1: 'h1',
            h2: 'h2',
            h3: 'h3',
            h4: 'h4',
            h5: 'h5',
            h6: 'h6',
            subtitle1: 'h2',
            subtitle2: 'h2',
            body1: 'span',
            body2: 'span',
          },
        },
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContextProvider>
        <ThemeProvider theme={theme}>
          <Routes>
            <Route path="/" element={<Charts />} />
            <Route path="/charts" element={<Charts />} />
            <Route path="/add-group" element={<AddGroup />} />
            <Route path='/profile' element={<Profile />}>
                <Route path='account' element={<AccountInfo />} />
                <Route path='cells' element={<CellsList />} />
                <Route path='loggers' element={<LoggersList />} />
              </Route>
          </Routes>
        </ThemeProvider>
      </AuthContextProvider>
    </QueryClientProvider>
  );
}

export default App;