import { useQuery } from '@tanstack/react-query'

export const USER_GROUPS_QUERY_KEY = ['user groups']

export const getUserGroups = (axiosPrivate) => {
  return axiosPrivate.get('/api/groups/').then((res) => res.data)
}

export const useUserGroups = (axiosPrivate) =>
  useQuery({
    queryKey: USER_GROUPS_QUERY_KEY,
    queryFn: () => getUserGroups(axiosPrivate),
    refetchOnWindowFocus: true,
  })
