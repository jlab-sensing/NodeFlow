import { useContext, useDebugValue } from 'react'
import AuthContext from '../AuthContext'

const useAuth = () => {
  const context = useContext(AuthContext)
  useDebugValue(context?.auth, (auth) =>
    auth?.user ? 'Logged In' : 'Logged Out',
  )
  return context
}

export default useAuth
