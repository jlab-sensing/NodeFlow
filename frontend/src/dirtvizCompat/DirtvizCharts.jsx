import { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { Alert, Box, Stack, Typography } from '@mui/material'
import VChart from '../charts/VChart/VChart'
import PwrChart from '../charts/PwrChart/PwrChart'
import VwcChart from '../charts/VwcChart/VwcChart'
import TempChart from '../charts/TempChart/TempChart'
import UniversalChart from '../charts/UniversalChart'
import { buildSharedCellPanels } from './buildSharedCellPanels'
import ChartPanelActions from '../pages/charts/components/ChartPanelActions'
import ChartPanelGrid from '../pages/charts/components/ChartPanelGrid'
import AddChartModal from '../pages/charts/components/AddChartModal'

const EMPTY_CATALOGS = []
const EMPTY_HISTORIES = []

function PanelChart({ panel, startDate, endDate, resample }) {
  const data = useMemo(() => structuredClone(panel.data), [panel.data])

  const common = {
    data,
    startDate,
    endDate,
    resample,
  }

  if (!panel.hasData) {
    return <Typography>No plotted readings for this date range.</Typography>
  }

  switch (panel.kind) {
    case 'voltage':
      return <VChart {...common} />

    case 'power':
      return <PwrChart {...common} />

    case 'vwc':
      return <VwcChart {...common} />

    case 'temperature':
      return <TempChart {...common} />

    case 'universal':
      return (
        <UniversalChart
          {...common}
          chartId={panel.config.chartId}
          measurements={panel.config.measurements}
          units={panel.config.units}
          axisIds={panel.config.axisIds}
          axisPolicy={panel.config.axisPolicy}
        />
      )

    default:
      return <Alert severity="error">Unsupported chart kind.</Alert>
  }
}

const chartProps = {
  startDate: PropTypes.object.isRequired,
  endDate: PropTypes.object.isRequired,
  resample: PropTypes.oneOf(['none', 'hour', 'day']).isRequired,
}

PanelChart.PropTypes = {
  ...chartProps,
  panel: PropTypes.object.isRequired,
}

function resolvePanelOrder(panels, layout) {
  const available = new Set(panels.map((panel) => panel.id))

  return [...new Set([...layout.order, ...available])].filter(
    (id) => available.has(id) && !layout.hidden.includes(id),
  )
}

function DemoPanelLayout({ panels, scopeKey, startDate, endDate, resample }) {
  const [layout, setLayout] = useState({
    order: [],
    hidden: [],
  })
  const [panelColumns, setPanelColumns] = useState(2)
  const [addOpen, setAddOpen] = useState(false)

  const panelOrder = resolvePanelOrder(panels, layout)
  const byId = new Map(panels.map((panel) => [panel.id, panel]))

  const availableEntries = panels.map((panel) => ({
    panelId: panel.id,
    label: panel.title,
    description: 'Measurements from the selected demo group',
    category: 'sensor',
  }))

  function reorder(update) {
    setLayout((current) => {
      const previous = resolvePanelOrder(panels, current)

      return {
        ...current,
        order: typeof update === 'function' ? update(previous) : update,
      }
    })
  }

  function remove(panelId) {
    setLayout((current) => {
      if (resolvePanelOrder(panels, current).length <= 1) {
        return current
      }

      return {
        ...current,
        hidden: [...new Set([...current.hidden, panelId])],
      }
    })
  }

  function add(panelId) {
    setLayout((current) => ({
      order: [...new Set([...resolvePanelOrder(panels, current), panelId])],
      hidden: current.hidden.filter((id) => id !== panelId),
    }))
  }

  return (
    <>
      <ChartPanelActions
        onAddChart={() => setAddOpen(true)}
        panelColumns={panelColumns}
        onPanelColumnsChange={setPanelColumns}
      />

      <ChartPanelGrid
        panelOrder={panelOrder}
        onPanelOrderChange={reorder}
        onRemovePanel={remove}
        panelColumns={panelColumns}
        chartProps={{ modeResample: resample }}
        renderPanel={(panelId) => (
          <Box
            aria-label={byId.get(panelId).title}
            sx={{
              height: '100%',
              width: '100%',
              minWidth: 0,
              minHeight: 0,
            }}
          >
            <PanelChart
              key={scopeKey + ':' + panelId}
              panel={byId.get(panelId)}
              startDate={startDate}
              endDate={endDate}
              resample={resample}
            />
          </Box>
        )}
      />

      <AddChartModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        selectedSensors={EMPTY_CATALOGS}
        availableEntries={availableEntries}
        panelOrder={panelOrder}
        onAddPanel={add}
      />
    </>
  )
}

export default function DirtvizCharts({
  catalogs = EMPTY_CATALOGS,
  historiesByUuid = EMPTY_HISTORIES,
  startDate,
  endDate,
  resample,
}) {
  const prepared = useMemo(() => {
    try {
      return {
        value: buildSharedCellPanels({
          catalogs,
          historiesByUuid,
        }),
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }, [catalogs, historiesByUuid])

  if (!startDate?.isValid || !endDate?.isValid || startDate > endDate) {
    return <Alert severity="error">Chose valid start and end dates</Alert>
  }

  if (prepared.error) {
    return <Alert severity="error">{prepared.error}</Alert>
  }

  const { panels, warnings, unplottedChannels } = prepared.value

  const scopeKey = JSON.stringify([
    catalogs.map((cell) => [cell.source_instance, cell.uuid]),
    resample === 'none' ? 'live' : startDate.toISO(),
    resample === 'none' ? 'live' : endDate.toISO(),
    resample,
  ])

  return (
    <Stack spacing={2}>
      {warnings.map((warning) => (
        <Alert severity="warning" key={warning}>
          {warning}
        </Alert>
      ))}

      {!panels.length && (
        <Alert severity="info">No numeric graph channels were discovered</Alert>
      )}

      <DemoPanelLayout
        panels={panels}
        scopeKey={scopeKey}
        startDate={startDate}
        endDate={endDate}
        resample={resample}
      />

      {unplottedChannels.length > 0 && (
        <Box>
          <Typography component="h2" variant="h6">
            Channels without a graph
          </Typography>

          <ul>
            {unplottedChannels.map((entry, index) => (
              <li key={entry.cellUuid + ':' + entry.channel.key + ': ' + index}>
                {entry.cellName}: {entry.channel.name}
                {' - '}
                {entry.reason}
              </li>
            ))}
          </ul>
        </Box>
      )}
    </Stack>
  )
}

DirtvizCharts.PropTypes = {
  ...chartProps,
  catalogs: PropTypes.arrayOf(PropTypes.object),
  historiesByUuid: PropTypes.object,
}
