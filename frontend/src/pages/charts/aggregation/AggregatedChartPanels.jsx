import { Box, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import AddChartModal from '../components/AddChartModal'
import ChartPanelActions from '../components/ChartPanelActions'
import ChartPanelGrid from '../components/ChartPanelGrid'
import { ChartAggregationContext } from './ChartAggregationContext'
import AggregationSettingsModal from './AggregationSettingsModal'
import {
  addLine,
  hideInstance,
  readLayout,
  reconcileLayout,
  reorderInstances,
  restoreInstance,
  selectedIds,
  splitLine,
  visibleInstances,
} from './aggregationState'

const EMPTY = {}

export default function AggregatedChartPanels({
  templates,
  storageKey,
  initialOrder,
  chartProps = EMPTY,
  renderPanel,
}) {
  const [storedLayout, setStoredLayout] = useState(() => {
    try {
      return readLayout(window.localStorage, storageKey)
    } catch {
      return null
    }
  })

  const [activeId, setActiveId] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [panelColumns, setPanelColumns] = useState(2)

  const layout = useMemo(
    () => reconcileLayout(storedLayout, templates, initialOrder),
    [storedLayout, templates, initialOrder],
  )

  const visible = visibleInstances(layout, templates)
  const order = visible.map((instance) => instance.id)

  const byId = new Map(
    layout.instances.map((instance) => [instance.id, instance]),
  )

  const templateById = new Map(
    templates.map((template) => [template.id, template]),
  )

  const active = byId.get(activeId)
  const activeTemplate = templateById.get(active?.templateId)

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(layout),
      )
    } catch {
      // The controls still work if storage is unavailable.
    }
  }, [layout, storageKey])

  function update(operation) {
    setStoredLayout((current) =>
      operation(
        reconcileLayout(current, templates, initialOrder),
      ),
    )
  }

  function toggleLine(seriesId, include) {
    if (include) {
      update((current) =>
        addLine(current, templates, activeId, seriesId),
      )
      return
    }

    const suffix =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2)}`

    update((current) =>
      splitLine(
        current,
        templates,
        activeId,
        seriesId,
        `chart:${suffix}`,
      ),
    )
  }

  const hiddenEntries = layout.instances
    .filter(
      (instance) =>
        instance.hidden &&
        templateById.has(instance.templateId),
    )
    .map((instance) => {
      const template = templateById.get(instance.templateId)

      const ids =
        instance.seriesIds?.length === 0
          ? instance.restoreIds
          : instance.seriesIds

      const series =
        ids === null
          ? template.series
          : template.series.filter((entry) =>
              ids?.includes(entry.id),
            )

      return {
        panelId: instance.id,
        label: template.label,
        description:
          series.length === 1
            ? series[0].label
            : `${series.length} lines`,
        category: template.category ?? 'sensor',
      }
    })

  return (
    <>
      <ChartPanelActions
        onAddChart={() => setAddOpen(true)}
        panelColumns={panelColumns}
        onPanelColumnsChange={setPanelColumns}
      />

      {visible.length === 0 && (
        <Typography sx={{ p: 2 }} color="text.secondary">
          No charts are visible. Use Add chart to restore a chart.
        </Typography>
      )}

      <ChartPanelGrid
        panelOrder={order}
        onPanelOrderChange={(change) =>
          update((current) => {
            const previous = visibleInstances(
              current,
              templates,
            ).map((item) => item.id)

            const next =
              typeof change === 'function'
                ? change(previous)
                : change

            return reorderInstances(current, templates, next)
          })
        }
        onRemovePanel={(id) =>
          update((current) => hideInstance(current, id))
        }
        panelColumns={panelColumns}
        chartProps={chartProps}
        renderPanel={(instanceId) => {
          const instance = byId.get(instanceId)
          const template = templateById.get(instance.templateId)
          const ids = selectedIds(instance, templates)

          const selected = template.series.filter((series) =>
            ids.includes(series.id),
          )

          return (
            <ChartAggregationContext.Provider
              value={{
                instanceId,
                seriesIds: ids,
                axisIds: [
                  ...new Set(
                    selected.map((series) => series.axisId ?? 'y'),
                  ),
                ],
                openSettings: () => setActiveId(instanceId),
              }}
            >
              <Box
                aria-label={
                  selected.length === 1
                    ? selected[0].label
                    : template.label
                }
                sx={{
                  height: '100%',
                  width: '100%',
                  minWidth: 0,
                  minHeight: 0,
                }}
              >
                {renderPanel(instance.templateId)}
              </Box>
            </ChartAggregationContext.Provider>
          )
        }}
      />

      <AddChartModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        selectedSensors={[]}
        panelOrder={order}
        availableEntries={hiddenEntries}
        onAddPanel={(id) =>
          update((current) => restoreInstance(current, id))
        }
      />

      {active && activeTemplate && (
        <AggregationSettingsModal
          key={activeId}
          template={activeTemplate}
          checkedIds={selectedIds(active, templates)}
          onClose={() => setActiveId(null)}
          onToggle={toggleLine}
        />
      )}
    </>
  )
}