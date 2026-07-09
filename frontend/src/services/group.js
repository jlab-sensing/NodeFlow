import { useQuery } from "@tanstack/react-query";
import axios from "../api/axios";

export const getUserGroups = (axiosPrivate) => {
    return axiosPrivate.get('/api/groups/').then((res) => res.data)
};    
    
export const useUserGroups = (axiosPrivate) => useQuery({
    queryKey: ['user groups'],
    queryFn: () => getUserGroups(axiosPrivate),
    refetchOnWindowFocus: true,
});