import { useQueries, useQuery } from '@tanstack/react-query'
import useAuth from '../auth/hooks/useAuth'

const EMPTY = []

function cellSubtype(catalog) {
  const names = new Set()
  const channels = catalog?.channels ?? []
  const panels = new Set(
    (catalog?.entries ?? []).map((entry) => entry.panel_id),
  )

  for (const channel of channels) {
    if (
      channel.source === 'sensor' &&
      typeof channel.name === 'string' &&
      channel.name.trim()
    ) {
      names.add(channel.name.trim())
    }
  }

  if (
    panels.has('power-vi') ||
    panels.has('power-p') ||
    channels.some(
      (channel) => channel.source === 'power' && channel.has_data === true,
    )
  ) {
    names.add('Power')
  }

  if (
    panels.has('teros') ||
    panels.has('temp') ||
    channels.some(
      (channel) => channel.source === 'teros' && channel.has_data === true,
    )
  ) {
    names.add('TEROS')
  }

  return [...names].sort((a, b) => a.localeCompare(b)).join(', ')
}

export function useSharedHardware(client) {
  const { user, loggedIn, isAuthLoading } = useAuth()
  const ready = Boolean(user?.id && loggedIn && !isAuthLoading)

  const selected = useQuery({
    queryKey: ['shared-demo', user?.id, 'selected'],
    enabled: ready,
    retry: false,
    refetchInterval: 60000,
    queryFn: async ({ signal }) =>
      (
        await client.get('/api/shared-cells/', {
          signal,
        })
      ).data,
  })

  const deployments = useQuery({
    queryKey: ['shared-demo', user?.id, 'deployments'],
    enabled: ready,
    retry: false,
    staleTime: 60000,
    refetchInterval: 60000,
    queryFn: async ({ signal }) =>
      (
        await client.get('/api/deployments/', {
          signal,
        })
      ).data,
  })

  const cells = selected.data ?? EMPTY

  const catalogs = useQueries({
    queries: cells.map((cell) => ({
      queryKey: [
        'shared-demo',
        user?.id,
        'hardware-catalog',
        cell.source_instance,
        cell.uuid,
      ],
      enabled: ready && cell.enabled,
      retry: false,
      staleTime: 60000,
      refetchInterval: 60000,
      queryFn: async ({ signal }) =>
        (
          await client.get('/api/shared-cells/' + cell.uuid + '/catalog', {
            signal,
          })
        ).data,
    })),
  })

  const rows = cells.map((cell, index) => {
    const query = catalogs[index]
    const candidate = query.data

    const catalog =
      candidate?.uuid === cell.uuid &&
      candidate?.source_instance === cell.source_instance &&
      candidate?.cell_id === cell.cell_id
        ? candidate
        : undefined

    const deploymentNames = (deployments.data ?? EMPTY)
      .filter((group) => (group.shared_cell_uuids ?? EMPTY).includes(cell.uuid))
      .map((group) => group.name)

    return {
      id: 'dirtviz:' + cell.uuid,
      uuid: cell.uuid,
      sourceInstance: cell.source_instance,
      hardwareType: 'dirtviz-cell',
      category: 'DV Cell',
      name: catalog?.name || cell.name,
      subtype:
        cellSubtype(catalog) ||
        (!cell.enabled
          ? '—'
          : query.isLoading
            ? 'Loading…'
            : !catalog || catalog.status === 'error'
              ? 'Unavailable'
              : '—'),
      hardwareId: cell.cell_id,
      loggerId: null,
      groupId: null,
      deploymentLabel: deployments.isError
        ? deploymentNames.join(', ') || 'Unavailable'
        : deployments.isLoading
          ? 'Loading…'
          : deploymentNames.join(', ') || 'No Group',
      archived: false,
      enabled: cell.enabled,
      status: cell.enabled ? 'Enabled' : 'Disabled',
      detailsError:
        cell.enabled &&
        (query.isError ||
          (Boolean(candidate) && !catalog) ||
          catalog?.status === 'error' ||
          catalog?.status === 'partial'),
    }
  })

  return {
    rows,
    isLoading: selected.isLoading,
    isError: selected.isError,
    detailsLoading:
      deployments.isLoading || catalogs.some((query) => query.isLoading),
    detailsError: deployments.isError || rows.some((row) => row.detailsError),
  }
}
