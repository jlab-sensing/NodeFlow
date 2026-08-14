import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { Box } from '@mui/material'
import PropTypes from 'prop-types'
import { useCallback, useMemo } from 'react'
import { panelIdToUnifiedType } from '../catalog/chartsCatalog'
import PowerCharts from './PowerCharts'
import SortableChartPanel from './SortableChartPanel'
import TerosCharts from './TerosCharts'
import UnifiedChart from './UnifiedChart'

function ChartPanelContent({ panelId, chartProps }) {
  const shared = {
    sensors: chartProps.sensors,
    axiosPrivate: chartProps.axiosPrivate,
    startDate: chartProps.startDate,
    endDate: chartProps.endDate,
    modeResample: chartProps.modeResample,
    historicalSensorByKey: chartProps.historicalSensorByKey,
    historicalLoading: chartProps.historicalLoading,
  }

  const unifiedType = panelIdToUnifiedType(panelId)
  if (unifiedType) {
    return (
      <UnifiedChart
        type={unifiedType}
        sensors={chartProps.sensors}
        axiosPrivate={chartProps.axiosPrivate}
        startDate={chartProps.startDate}
        endDate={chartProps.endDate}
        modeResample={chartProps.modeResample}
        historicalSensorByKey={chartProps.historicalSensorByKey}
        centralHistoricalActive={chartProps.centralHistoricalActive?.sensors}
        historicalLoading={chartProps.historicalLoading}
      />
    )
  }

  switch (panelId) {
    case 'power-vi':
      return (
        <PowerCharts
          {...shared}
          variant="voltage"
          onDataStatusChange={chartProps.onPowerDataStatusChange}
        />
      )
    case 'power-p':
      return (
        <PowerCharts
          {...shared}
          variant="power"
          onDataStatusChange={chartProps.onPowerDataStatusChange}
        />
      )
    case 'teros':
      return (
        <TerosCharts
          {...shared}
          variant="vwc"
          onDataStatusChange={chartProps.onTerosDataStatusChange}
        />
      )
    case 'temp':
      return (
        <TerosCharts
          {...shared}
          variant="temp"
          onDataStatusChange={chartProps.onTerosDataStatusChange}
        />
      )
    default:
      return null
  }
}

ChartPanelContent.propTypes = {
  panelId: PropTypes.string.isRequired,
  chartProps: PropTypes.object.isRequired,
}

function SortableChartPagePanel({
  panelId,
  chartProps,
  onRemovePanel,
  panelColumns,
  canRemove,
}) {
  return (
    <SortableChartPanel
      id={panelId}
      onRemove={canRemove ? onRemovePanel : undefined}
      panelColumns={panelColumns}
    >
      <ChartPanelContent panelId={panelId} chartProps={chartProps} />
    </SortableChartPanel>
  )
}

SortableChartPagePanel.propTypes = {
  panelId: PropTypes.string.isRequired,
  chartProps: PropTypes.object.isRequired,
  onRemovePanel: PropTypes.func.isRequired,
  panelColumns: PropTypes.oneOf([1, 2]).isRequired,
  canRemove: PropTypes.bool.isRequired,
}

export default function ChartPanelGrid({
  panelOrder,
  onPanelOrderChange,
  onRemovePanel,
  chartProps,
  panelColumns,
}) {
  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      onPanelOrderChange((items) => {
        const oldIndex = items.indexOf(active.id)
        const newIndex = items.indexOf(over.id)
        if (oldIndex === -1 || newIndex === -1) return items
        return arrayMove(items, oldIndex, newIndex)
      })
    },
    [onPanelOrderChange],
  )

  const canRemovePanels = panelOrder.length > 1

  const visiblePanels = useMemo(
    () =>
      panelOrder.map((panelId) => (
        <SortableChartPagePanel
          key={`${panelId}:${chartProps.modeResample ?? 'hour'}`}
          panelId={panelId}
          chartProps={chartProps}
          onRemovePanel={onRemovePanel}
          panelColumns={panelColumns}
          canRemove={canRemovePanels}
        />
      )),
    [panelOrder, chartProps, onRemovePanel, panelColumns, canRemovePanels],
  )

  if (panelOrder.length === 0) {
    return null
  }

  return (
    <DndContext
      sensors={dndSensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={panelOrder} strategy={rectSortingStrategy}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns:
              panelColumns === 1 ? '1fr' : { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
            width: '100%',
            alignItems: 'stretch',
            justifyContent: 'space-evenly',
            '& > *': { minWidth: 0 },
          }}
        >
          {visiblePanels}
        </Box>
      </SortableContext>
    </DndContext>
  )
}

ChartPanelGrid.propTypes = {
  panelOrder: PropTypes.arrayOf(PropTypes.string).isRequired,
  onPanelOrderChange: PropTypes.func.isRequired,
  onRemovePanel: PropTypes.func.isRequired,
  panelColumns: PropTypes.oneOf([1, 2]).isRequired,
  chartProps: PropTypes.shape({
    sensors: PropTypes.array,
    axiosPrivate: PropTypes.func,
    startDate: PropTypes.any,
    endDate: PropTypes.any,
    modeResample: PropTypes.oneOf(['none', 'hour']),
    historicalSensorByKey: PropTypes.object,
    historicalLoading: PropTypes.bool,
    centralHistoricalActive: PropTypes.shape({
      sensors: PropTypes.bool,
    }),
    onPowerDataStatusChange: PropTypes.func,
    onTerosDataStatusChange: PropTypes.func,
  }).isRequired,
}
