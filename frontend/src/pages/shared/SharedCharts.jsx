import { useEffect, useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { DateTime } from 'luxon'
import BackBtn from '../charts/components/BackBtn'
import publicClient from '../../api/axios'
import DirtvizCharts from '../../dirtvizCompat/DirtvizCharts'
import ChartSourcesSelect from '../profile/components/ChartSourceSelect'
import DateRangeSel from '../charts/components/DateRangeSel'
import StreamToggle from '../charts/components/StreamToggle'

const EMPTY = []
const LIVE_WINDOW_MINUTES = 30
const LIVE_REFRESH_MS = 15000
const HAS_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/i

function errorText(error) {
  const detail = error?.response?.data?.detail

  return typeof detail === 'string'
    ? detail
    : detail
      ? JSON.stringify(detail)
      : error?.message || 'Request failed'
}

function defaultWindow(availability) {
  const latest = DateTime.fromISO(availability?.latest_timestamp || '')
  const earliest = DateTime.fromISO(availability?.earliest_timestamp || '')

  const end = latest.isValid ? latest : DateTime.now()
  let start = end.minus({ days: 14 })

  if (earliest.isValid && earliest > start && earliest <= end) {
    start = earliest
  }

  return { start, end }
}

function DeploymentCharts({ groupId }) {
  const client = publicClient
  const [params, setParams] = useSearchParams()
  const [isLive, setIsLive] = useState(false)
  const [liveStartedAt, setLiveStartedAt] = useState(() => Date.now())

  const search = params.toString()
  const prefix = '/api/public/deployments/' + groupId

  const catalog = useQuery({
    queryKey: ['shared-demo', 'public', 'catalog', groupId],
    queryFn: async ({ signal }) =>
      (
        await client.get(prefix + '/catalog', {
          signal,
        })
      ).data,
    refetchInterval: 60000,
    retry: false,
  })

  const availability = useQuery({
    queryKey: ['shared-demo', 'public', 'availability', groupId],
    queryFn: async ({ signal }) =>
      (
        await client.get(prefix + '/availability', {
          signal,
        })
      ).data,
    staleTime: 60000,
    retry: false,
  })

  useEffect(() => {
    const next = new URLSearchParams(search)

    if (next.has('start') || next.has('end')) return

    if (!availability.isSuccess && !availability.isError) {
      return
    }
    const window = defaultWindow(availability.data)

    next.set('start', window.start.toISO())
    next.set('end', window.end.toISO())
    setParams(next, { replace: true })
  }, [
    search,
    availability.data,
    availability.isSuccess,
    availability.isError,
    setParams,
  ])

  const startValue = params.get('start') || ''
  const endValue = params.get('end') || ''
  const resample = isLive ? 'none' : 'hour'

  const startDate = DateTime.fromISO(startValue, {
    setZone: true,
  })
  const endDate = DateTime.fromISO(endValue, {
    setZone: true,
  })

  const valid =
    isLive ||
    (startDate.isValid &&
      endDate.isValid &&
      HAS_OFFSET.test(startValue) &&
      HAS_OFFSET.test(endValue) &&
      startDate <= endDate)

  const catalogs = catalog.data?.cells ?? EMPTY

  const cells = useMemo(
    () =>
      catalogs.filter(
        (cells) => cells.enabled && ['ready', 'partial'].includes(cells.status),
      ),
    [catalogs],
  )

  const histories = useQueries({
    queries: cells.map((cell) => ({
      queryKey: [
        'shared-demo',
        'public',
        'history',
        groupId,
        cell.uuid,
        cell.source_instance,
        JSON.stringify([cell.channels, cell.entries]),
        isLive ? 'live' : startValue,
        isLive ? 'live' : endValue,
        resample,
      ],

      queryFn: async ({ signal }) => {
        const requestEnd = isLive ? DateTime.now() : endDate
        const requestStart = isLive
          ? requestEnd.minus({ minutes: LIVE_WINDOW_MINUTES })
          : startDate

        const window = {
          start: requestStart.toISO(),
          end: requestEnd.toISO(),
        }

        const response = await client.get(
          prefix + '/cells/' + cell.uuid + '/history',
          {
            signal,
            params: {
              ...window,
              resample,
            },
          },
        )

        return {
          ...response.data,
          _chartWindow: window,
        }
      },

      enabled: valid,
      refetchInterval: isLive ? LIVE_REFRESH_MS : 60000,
      retry: false,
    })),
  })

  const loadedEnds = histories
    .map((query) =>
      DateTime.fromISO(query.data?._chartWindow?.end || '').toMillis(),
    )
    .filter(Number.isFinite)

  const chartEndDate = isLive
    ? DateTime.fromMillis(
        loadedEnds.length ? Math.max(...loadedEnds) : liveStartedAt,
      )
    : endDate

  const chartStartDate = isLive
    ? chartEndDate.minus({ minutes: LIVE_WINDOW_MINUTES })
    : startDate

  const historiesByUuid = Object.fromEntries(
    histories.flatMap((query, index) =>
      query.data ? [[cells[index].uuid, query.data]] : [],
    ),
  )

  function changeMode(nextIsLive) {
    if (nextIsLive) {
      setLiveStartedAt(Date.now())
    }

    setIsLive(nextIsLive)

    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('resample')
        return next
      },
      { replace: true },
    )
  }

  function changeDate(field, value) {
    if (!value?.isValid) return

    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set(field, value.toISO())
        next.delete('resample')
        return next
      },
      { replace: true },
    )
  }

  if (catalog.isError) {
    return (
      <DemoChartsFrame groupId={groupId}>
        <Alert severity="error">{errorText(catalog.error)}</Alert>
      </DemoChartsFrame>
    )
  }

  if (catalog.isPending || availability.isPending) {
    return (
      <DemoChartsFrame groupId={groupId}>
        <CircularProgress aria-label="Loading deployment" />
      </DemoChartsFrame>
    )
  }

  return (
    <DemoChartsFrame
      groupId={groupId}
      dateControls={
        isLive ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              aria-hidden="true"
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'success.main',
              }}
            />

            <Typography variant="body2" fontWeight={600}>
              Live
            </Typography>
          </Stack>
        ) : (
          <DateRangeSel
            startDate={startDate}
            endDate={endDate}
            setStartDate={(value) => changeDate('start', value)}
            setEndDate={(value) => changeDate('end', value)}
          />
        )
      }
      actions={<StreamToggle isStreaming={isLive} onToggle={changeMode} />}
    >
      <Stack spacing={2}>
        {!isLive && availability.isError && (
          <Alert severity="warning">
            Could not determine the latest reading date. The default window ends
            today. {errorText(availability.error)}
          </Alert>
        )}

        {!valid && (
          <Alert severity="warning">
            Choose valid start and end dates Shared URL dates must include a
            time-zone offset.
          </Alert>
        )}

        {catalogs
          .filter((cell) => !cell.enabled)
          .map((cell) => (
            <Alert key={cell.uuid} severity="info">
              {cell.name} is disabled.
            </Alert>
          ))}

        {valid && histories.some((query) => query.isPending) && (
          <Typography component="p">Loading readings…</Typography>
        )}

        {histories.map(
          (query, index) =>
            query.isError && (
              <Alert severity="error" key={cells[index].uuid}>
                {cells[index].name}: {errorText(query.error)}
              </Alert>
            ),
        )}

        {valid && (
          <DirtvizCharts
            catalogs={catalogs}
            historiesByUuid={historiesByUuid}
            startDate={chartStartDate}
            endDate={chartEndDate}
            resample={resample}
          />
        )}
      </Stack>
    </DemoChartsFrame>
  )
}

function DemoChartsFrame({ groupId, dateControls, actions, children }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const selector = <ChartSourcesSelect selectedDemoGroupId={groupId ?? null} />

  return (
    <Stack
      direction="column"
      divider={<Divider orientation="horizontal" flexItem />}
      sx={{
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      {isMobile ? (
        <Box sx={{ px: 3, py: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <BackBtn />
              <Box sx={{ flexGrow: 1 }}>{selector}</Box>
            </Stack>

            {dateControls}
            {actions && <Box sx={{ alignSelf: 'flex-end' }}>{actions}</Box>}
          </Stack>
        </Box>
      ) : (
        <Stack direction="row" alignItems="center" sx={{ p: 2 }} spacing={3}>
          <BackBtn />

          <Box sx={{ flexGrow: 1, maxWidth: '30%' }}>{selector}</Box>

          {dateControls}
          <Box sx={{ flexGrow: 1 }} />
          {actions}
        </Stack>
      )}

      <Box sx={{ width: '100%', p: 2 }}>{children}</Box>
    </Stack>
  )
}

export function DemoChartsContent({ groupId }) {
  if (groupId) {
    return <DeploymentCharts key={groupId} groupId={groupId} />
  }

  return (
    <DemoChartsFrame>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        sx={{ minHeight: 'calc(100vh - 120px)' }}
      >
        <Box textAlign="center">
          <Typography variant="h4" color="primary" gutterBottom>
            Welcome to NodeFlow Charts
          </Typography>

          <Typography variant="h6" color="text.secondary">
            Select a demo group to view data
          </Typography>
        </Box>
      </Box>
    </DemoChartsFrame>
  )
}

export default function SharedCharts() {
  const { groupId } = useParams()
  const [params] = useSearchParams()

  const next = new URLSearchParams(params)
  next.set('demo', groupId)

  return (
    <Navigate
      to={{
        pathname: '/charts',
        search: next.toString(),
      }}
      replace
    />
  )
}
