import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import publicClient from '../../../api/axios'
import useAuth from '../../../auth/hooks/useAuth'
import useAxiosPrivate from '../../../auth/hooks/useAxiosPrivate'
import GroupSensorSelect from '../../charts/components/GroupSensorSelect'

const EMPTY = []

export default function ChartSourcesSelect({
  groups,
  sensors,
  selectedSensorIds = EMPTY,
  onSelectionChange,
  loading = false,
  error = false,
  selectedDemoGroupId = null,
}) {
  const { user, loggedIn, isAuthLoading } = useAuth()
  const client = useAxiosPrivate()
  const [, setSearchParams] = useSearchParams()

  const ready = Boolean(user?.id && loggedIn && !isAuthLoading)

  const suppliedSources = groups !== undefined && sensors !== undefined

  const demos = useQuery({
    queryKey: ['shared-demo', 'public', 'deployments'],
    retry: false,
    refetchInterval: 60000,

    queryFn: async ({ signal }) =>
      (await publicClient.get('/api/public/deployments/', { signal })).data,
  })

  const sources = useQuery({
    queryKey: ['chart-sources', user?.id],
    enabled: ready && !suppliedSources,
    retry: false,

    queryFn: async ({ signal }) =>
      (
        await client.get('/api/chart-sources/', {
          signal,
        })
      ).data,
  })

  function selectDemo(groupId) {
    if (groupId && groupId === selectedDemoGroupId) {
      return
    }

    const next = new URLSearchParams()

    if (groupId) {
      next.set('demo', groupId)
    }

    setSearchParams(next)
  }

  function selectSensors(ids) {
    if (!ready) return

    if (!selectedDemoGroupId && onSelectionChange) {
      onSelectionChange(ids)
      return
    }

    const next = new URLSearchParams()

    if (ids.length) {
      next.set('sensor_id', ids.join(','))
    }

    setSearchParams(next)
  }

  return (
    <GroupSensorSelect
      groups={ready ? (groups ?? sources.data?.groups ?? EMPTY) : EMPTY}
      sensors={ready ? (sensors ?? sources.data?.sensors ?? EMPTY) : EMPTY}
      selectedSensorIds={
        ready && !selectedDemoGroupId ? selectedSensorIds : EMPTY
      }
      onSelectionChange={selectSensors}
      loading={ready && (suppliedSources ? loading : sources.isLoading)}
      error={ready && (suppliedSources ? error : sources.isError)}
      demoGroups={demos.data ?? EMPTY}
      selectedDemoGroupId={selectedDemoGroupId}
      onDemoSelectionChange={selectDemo}
      demoLoading={demos.isLoading}
      demoError={demos.isError}
    />
  )
}
