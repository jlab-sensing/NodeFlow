import { Box, Divider, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DateRangeNotification from '../../components/DateRangeNotification';
import LayoutMismatchNotification from '../../components/LayoutMismatchNotification';
import TopNav from '../../components/TopNav';
import useAxiosPrivate from '../../auth/hooks/useAxiosPrivate';
import { useSmartDateRange } from '../../hooks/useSmartDateRange';
import { useChartSources } from '../../services/chartSources';
import {
  FULL_CATALOG,
  isKnownPanelId,
  parseLayoutParam,
  serializeLayoutParam,
} from './catalog/chartsCatalog';
import {
  availablePanelIdsForSensors,
  defaultPanelOrderForSensors,
  panelsMissingForSensors,
} from './catalog/sensorSourceLayout';
import AddChartModal from './components/AddChartModal';
import BackBtn from './components/BackBtn';
import ChartPanelActions from './components/ChartPanelActions';
import ChartPanelGrid from './components/ChartPanelGrid';
import DateRangeSel from './components/DateRangeSel';
import GroupSensorSelect from './components/GroupSensorSelect';
import { useChartsHistoricalData } from './hooks/useChartsHistoricalData';

const CATALOG_PANEL_ORDER = FULL_CATALOG.map((entry) => entry.panelId);

function Charts() {
  const axiosPrivate = useAxiosPrivate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchParams, setSearchParams] = useSearchParams();

  const [startDate, setStartDate] = useState(DateTime.now().minus({ days: 14 }));
  const [endDate, setEndDate] = useState(DateTime.now());
  const [selectedSensorIds, setSelectedSensorIds] = useState([]);
  const [panelOrder, setPanelOrder] = useState([]);
  const [panelColumns, setPanelColumns] = useState(2);
  const [addChartOpen, setAddChartOpen] = useState(false);
  const [layoutMismatchOpen, setLayoutMismatchOpen] = useState(false);
  const [layoutMismatchPanels, setLayoutMismatchPanels] = useState([]);
  const [historicalDatesReady, setHistoricalDatesReady] = useState(false);
  const [manualDateSelection, setManualDateSelection] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const smartDateRangeAppliedRef = useRef(false);
  const cancelSmartDateRef = useRef(null);

  const {
    data: chartSources,
    isLoading: chartSourcesLoading,
    isError: chartSourcesError,
  } = useChartSources(axiosPrivate);
  const groups = useMemo(() => chartSources?.groups ?? [], [chartSources]);
  const allSensors = useMemo(() => chartSources?.sensors ?? [], [chartSources]);
  const selectedSensors = useMemo(
    () => allSensors.filter((sensor) => selectedSensorIds.includes(sensor.uuid)),
    [allSensors, selectedSensorIds],
  );
  const availablePanelIds = useMemo(
    () => availablePanelIdsForSensors(selectedSensors),
    [selectedSensors],
  );
  const panelOrderForFetch = useMemo(
    () => panelOrder.filter((panelId) => availablePanelIds.has(panelId)),
    [panelOrder, availablePanelIds],
  );

  const layoutParam = searchParams.get('layout');
  const parsedUrlLayout = useMemo(() => parseLayoutParam(layoutParam), [layoutParam]);
  const hasUrlLayout = parsedUrlLayout.length > 0;

  const {
    calculateSmartDateRange,
    showFallbackNotification,
    fallbackDates,
    showFallbackNotificationHandler,
    hideFallbackNotification,
  } = useSmartDateRange(axiosPrivate);

  const { historicalSensorByKey, historicalLoading } = useChartsHistoricalData({
    axiosPrivate,
    sensors: selectedSensors,
    panelOrder: panelOrderForFetch,
    startDate,
    endDate,
    enabled: historicalDatesReady && selectedSensors.length > 0,
  });

  const panelChartProps = useMemo(
    () => ({
      sensors: selectedSensors,
      axiosPrivate,
      startDate,
      endDate,
      historicalSensorByKey,
      historicalLoading,
      centralHistoricalActive: {
        sensors: panelOrderForFetch.some((panelId) => panelId.startsWith('u:')),
      },
    }),
    [
      selectedSensors,
      axiosPrivate,
      startDate,
      endDate,
      historicalSensorByKey,
      historicalLoading,
      panelOrderForFetch,
    ],
  );

  useEffect(() => {
    if (parsedUrlLayout.length > 0) {
      // Restore a shared/bookmarked layout.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPanelOrder(parsedUrlLayout);
    }
  }, [parsedUrlLayout]);

  useEffect(() => {
    if (selectedSensors.length === 0 || hasUrlLayout) return;

    // Select only panels supported by the current sensors.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPanelOrder(
      defaultPanelOrderForSensors(selectedSensors, CATALOG_PANEL_ORDER),
    );
    setLayoutMismatchOpen(false);
    setLayoutMismatchPanels([]);
  }, [selectedSensors, hasUrlLayout]);

  useEffect(() => {
    if (!hasUrlLayout || selectedSensors.length === 0 || panelOrder.length === 0) {
      if (!hasUrlLayout) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLayoutMismatchOpen(false);
        setLayoutMismatchPanels([]);
      }
      return;
    }

    const missingPanels = panelsMissingForSensors(panelOrder, availablePanelIds);
    // Synchronize the warning with the selected sensors and URL layout.
    setLayoutMismatchPanels(missingPanels);
    setLayoutMismatchOpen(missingPanels.length > 0);
  }, [hasUrlLayout, selectedSensors, panelOrder, availablePanelIds]);

  useEffect(() => {
    if (isInitialized || chartSourcesLoading || !chartSources) return;

    const requestedSensorIds = new Set(
      (searchParams.get('sensor_id') ?? '').split(',').filter(Boolean),
    );
    const initialSensorIds = allSensors
      .filter((sensor) => requestedSensorIds.has(sensor.uuid))
      .map((sensor) => sensor.uuid);
    const startParam = DateTime.fromISO(searchParams.get('startDate') ?? '');
    const endParam = DateTime.fromISO(searchParams.get('endDate') ?? '');
    const hasValidManualRange = startParam.isValid && endParam.isValid;

    // Initialize selection and date state after chart sources are available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedSensorIds(initialSensorIds);
    if (hasValidManualRange) {
      setStartDate(startParam);
      setEndDate(endParam);
      setManualDateSelection(true);
      setHistoricalDatesReady(true);
      smartDateRangeAppliedRef.current = true;
    }
    setIsInitialized(true);
  }, [
    allSensors,
    chartSources,
    chartSourcesLoading,
    isInitialized,
    searchParams,
  ]);

  useEffect(() => {
    if (!isInitialized || manualDateSelection || selectedSensorIds.length === 0) return;
    if (smartDateRangeAppliedRef.current) return;

    if (cancelSmartDateRef.current) {
      cancelSmartDateRef.current.cancelled = true;
    }
    const cancelToken = { cancelled: false };
    cancelSmartDateRef.current = cancelToken;

    const applySmartDateRange = async () => {
      setHistoricalDatesReady(false);
      const smartRange = await calculateSmartDateRange(selectedSensorIds);
      if (cancelToken.cancelled) return;

      setStartDate(smartRange.startDate);
      setEndDate(smartRange.endDate);
      setHistoricalDatesReady(true);
      smartDateRangeAppliedRef.current = true;
      if (smartRange.isFallback) showFallbackNotificationHandler();
    };

    applySmartDateRange().catch((error) => {
      if (cancelToken.cancelled) return;
      console.error('Error applying smart date range:', error);
      setHistoricalDatesReady(true);
    });

    return () => {
      cancelToken.cancelled = true;
    };
  }, [
    isInitialized,
    manualDateSelection,
    selectedSensorIds,
    calculateSmartDateRange,
    showFallbackNotificationHandler,
  ]);

  useEffect(() => {
    if (!isInitialized) return;

    const nextParams = new URLSearchParams();
    if (selectedSensorIds.length > 0) {
      nextParams.set('sensor_id', selectedSensorIds.join(','));
    }
    if (manualDateSelection) {
      nextParams.set('startDate', startDate.toISO());
      nextParams.set('endDate', endDate.toISO());
    }
    const serializedLayout = serializeLayoutParam(panelOrder);
    if (serializedLayout) nextParams.set('layout', serializedLayout);
    setSearchParams(nextParams, { replace: true });
  }, [
    isInitialized,
    selectedSensorIds,
    manualDateSelection,
    startDate,
    endDate,
    panelOrder,
    setSearchParams,
  ]);

  const handleSensorSelectionChange = useCallback(
    (nextSensorIds) => {
      setSelectedSensorIds(nextSensorIds);
      if (!manualDateSelection) {
        smartDateRangeAppliedRef.current = false;
        setHistoricalDatesReady(false);
      }
    },
    [manualDateSelection],
  );

  const handleStartDateChange = (nextStartDate) => {
    setStartDate(nextStartDate);
    setManualDateSelection(true);
    setHistoricalDatesReady(true);
    smartDateRangeAppliedRef.current = true;
  };

  const handleEndDateChange = (nextEndDate) => {
    setEndDate(nextEndDate);
    setManualDateSelection(true);
    setHistoricalDatesReady(true);
    smartDateRangeAppliedRef.current = true;
  };

  const handleAddPanel = useCallback((panelId) => {
    if (!isKnownPanelId(panelId)) return;
    setPanelOrder((current) =>
      current.includes(panelId) ? current : [...current, panelId],
    );
  }, []);

  const handleRemovePanel = useCallback((panelId) => {
    setPanelOrder((current) =>
      current.length <= 1 ? current : current.filter((id) => id !== panelId),
    );
  }, []);

  const sensorSelector = (
    <GroupSensorSelect
      groups={groups}
      sensors={allSensors}
      selectedSensorIds={selectedSensorIds}
      onSelectionChange={handleSensorSelectionChange}
      loading={chartSourcesLoading}
      error={chartSourcesError}
    />
  );
  const dateSelector = (
    <DateRangeSel
      startDate={startDate}
      endDate={endDate}
      setStartDate={handleStartDateChange}
      setEndDate={handleEndDateChange}
    />
  );

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopNav />
      <Box sx={{ flex: 1, overflowY: 'auto', background: '#FFFFFF' }}>
        <DateRangeNotification
          open={showFallbackNotification}
          onClose={hideFallbackNotification}
          fallbackStartDate={fallbackDates.start}
          fallbackEndDate={fallbackDates.end}
        />
        <LayoutMismatchNotification
          open={layoutMismatchOpen}
          onClose={() => setLayoutMismatchOpen(false)}
          missingPanelIds={layoutMismatchPanels}
        />
        <Stack
          direction='column'
          divider={<Divider orientation='horizontal' flexItem />}
          sx={{ minHeight: '100vh', boxSizing: 'border-box' }}
        >
          {isMobile ? (
            <Box sx={{ px: 3, py: 2 }}>
              <Stack spacing={2}>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <BackBtn />
                  <Box sx={{ flexGrow: 1 }}>{sensorSelector}</Box>
                </Stack>
                {dateSelector}
              </Stack>
            </Box>
          ) : (
            <Stack direction='row' alignItems='center' sx={{ p: 2 }} spacing={3}>
              <BackBtn />
              <Box sx={{ flexGrow: 1, maxWidth: '30%' }}>{sensorSelector}</Box>
              {dateSelector}
            </Stack>
          )}

          {selectedSensors.length === 0 ? (
            <Box
              display='flex'
              justifyContent='center'
              alignItems='center'
              sx={{ minHeight: 'calc(100vh - 120px)' }}
            >
              <Box textAlign='center'>
                <Typography variant='h4' color='primary' gutterBottom>
                  Welcome to NodeFlow Charts
                </Typography>
                <Typography variant='h6' color='text.secondary'>
                  Select one or more groups or sensors to view historical data
                </Typography>
              </Box>
            </Box>
          ) : panelOrder.length === 0 ? (
            <Box
              display='flex'
              justifyContent='center'
              alignItems='center'
              sx={{ minHeight: 'calc(100vh - 120px)' }}
            >
              <Typography variant='body1' color='text.secondary'>
                The selected sensors do not currently expose any chart panels.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ width: '100%', p: 2 }}>
              <ChartPanelActions
                onAddChart={() => setAddChartOpen(true)}
                panelColumns={panelColumns}
                onPanelColumnsChange={setPanelColumns}
              />
              <ChartPanelGrid
                panelOrder={panelOrder}
                onPanelOrderChange={setPanelOrder}
                onRemovePanel={handleRemovePanel}
                panelColumns={panelColumns}
                chartProps={panelChartProps}
              />
              <AddChartModal
                open={addChartOpen}
                onClose={() => setAddChartOpen(false)}
                selectedSensors={selectedSensors}
                panelOrder={panelOrder}
                onAddPanel={handleAddPanel}
              />
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

export default Charts;
