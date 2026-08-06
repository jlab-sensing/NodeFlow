import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import AuthContext from './AuthContext'

const AuthContextProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    try {
      const savedAuth = localStorage.getItem('auth')
      return savedAuth ? JSON.parse(savedAuth) : {}
    } catch (error) {
      console.error('Error loading auth from localStorage:', error)
      return {}
    }
  })

  const [loggedIn, setLoggedIn] = useState(() => {
    try {
      const savedLoggedIn = localStorage.getItem('loggedIn')
      return savedLoggedIn === 'true'
    } catch (error) {
      console.error('Error loading loggedIn from localStorage:', error)
      return false
    }
  })

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user')
      return savedUser ? JSON.parse(savedUser) : null
    } catch (error) {
      console.error('Error loading user from localStorage', error)
      return null
    }
  })

  const [isAuthLoading, setIsAuthLoading] = useState(() => {
    try {
      const savedLoggedIn = localStorage.getItem('loggedIn')
      return savedLoggedIn !== 'true'
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      if (auth && Object.keys(auth).length > 0) {
        localStorage.setItem('auth', JSON.stringify(auth))
      } else {
        localStorage.removeItem('auth')
      }
    } catch (error) {
      console.error('Error saving auth to localStorage:', error)
    }
  }, [auth])

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user))
      } else {
        localStorage.removeItem('user')
      }
    } catch (error) {
      console.error('Error saving user to localStorage', error)
    }
  }, [user])

  return (
    <AuthContext.Provider
      value={{
        auth,
        setAuth,
        user,
        setUser,
        loggedIn,
        setLoggedIn,
        isAuthLoading,
        setIsAuthLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

AuthContextProvider.propTypes = {
  children: PropTypes.any,
}

export default AuthContextProvider
