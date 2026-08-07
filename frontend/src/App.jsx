import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import AuthCallback from './auth/Callback'
import AuthContext from './auth/AuthContext'
import AuthContextProvider from './auth/AuthContextProvider'
import Charts from './pages/charts/Charts'
import AddGroup from './pages/groups/addGroup'
import EditGroup from './pages/groups/editGroup'
import Profile from './pages/profile/profile'
import AccountInfo from './pages/profile/components/AccountInfo'
import CellsList from './pages/profile/components/CellsList'
import LoggersList from './pages/profile/components/LoggersList'
import GroupsList from './pages/profile/components/GroupsList'
import Dashboard from './pages/dashboard/Dashboard'
import { useContext } from 'react'

const queryClient = new QueryClient()

function RequireAuth({ children }) {
  const { user } = useContext(AuthContext)

  if (!user) {
    return <Navigate to="/" replace />
  }

  return children
}

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
  })

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContextProvider>
        <ThemeProvider theme={theme}>
          <Routes>
            <Route path="/" element={<Charts />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/charts" element={<Charts />} />
            <Route path="/add-group" element={<AddGroup />} />
            <Route
              path="/groups/:groupId/edit"
              element={
                <RequireAuth>
                  <EditGroup />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              exact
              element={<Navigate replace to="/profile/groups" />}
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            >
              <Route path="account" element={<AccountInfo />} />
              <Route path="cells" element={<CellsList />} />
              <Route path="loggers" element={<LoggersList />} />
              <Route path="groups" element={<GroupsList />} />
            </Route>
          </Routes>
        </ThemeProvider>
      </AuthContextProvider>
    </QueryClientProvider>
  )
}

export default App
