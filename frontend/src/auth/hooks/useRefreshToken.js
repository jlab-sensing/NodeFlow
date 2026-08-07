import axios from '../../api/axios'
import useAuth from './useAuth'

const useRefreshToken = () => {
  const { setAuth } = useAuth()
  const refresh = async () => {
    const response = await axios.get('/api/auth/refresh', {
      withCredentials: true,
    })
    setAuth((prev) => {
      return { ...prev, accessToken: response.data }
    })
    return response.data
  }
  return refresh
}

export default useRefreshToken
