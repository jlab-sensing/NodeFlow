import { useEffect, useRef, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import Modal from '@mui/material/Modal'
import Fade from '@mui/material/Fade'
import { Box, ToggleButton, Tooltip } from '@mui/material'
import zoom from '../assets/zoom.svg'
import reset from '../assets/reset.svg'
import pan from '../assets/pan.svg'
import FullscreenExit from '../assets/minimize.svg'
import Fullscreen from '../assets/maximize.svg'
import zoomIn from '../assets/zoom-in.svg'
import zoomOut from '../assets/zoom-out.svg'
import downloadIcon from '../assets/download.svg'

import {
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip as chartTooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import 'chartjs-adapter-luxon'
import zoomPlugin from 'chartjs-plugin-zoom'
import { Line } from 'react-chartjs-2'
ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  chartTooltip,
  Legend,
  TimeScale,
  zoomPlugin,
)

//** Wrapper for chart functionality and state */
function ChartWrapper({ id, data, options }) {
  const [resetSelected] = useState(false)
  const [zoomSelected, setZoomSelected] = useState(false)
  const [panSelected, setPanSelected] = useState(true)
  const [open, setOpen] = useState(false)
  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)

  const datasetIdKey = data.datasets.every(
    (dataset) => typeof dataset.id === 'string',
  )
    ? 'id'
    : 'label'

  const [scaleRef, setScaleRef] = useState({})

  //** defines axis for charts, charts may have different axis names/
  const axes = Object.keys(options.scales)
  const axesWithScaleKeys = []
  for (const a of axes) {
    axesWithScaleKeys.push({ axis: a, axisMin: `${a}Min`, axisMax: `${a}Max` })
  }

  //** Turns axes into scales object */
  function getScaleRef(chart) {
    const axesWithScale = axesWithScaleKeys.reduce(
      (ac, { axis, axisMin, axisMax }) => ({
        ...ac,
        [axisMin]: chart.scales[axis].options.min,
        [axisMax]: chart.scales[axis].options.max,
      }),
      {},
    )
    return axesWithScale
  }

  //** Callback for when zoom action is completed */
  function onZoomComplete({ chart }) {
    setScaleRef(getScaleRef(chart))
  }

  //** Callback for when pan action is completed */
  function onPanComplete({ chart }) {
    setScaleRef(getScaleRef(chart))
  }

  //** Defines options object */
  // NOTE: also defines the enable state of the plugins on rerenders
  function Options() {
    return {
      ...options,
      plugins: {
        zoom: {
          zoom: {
            drag: {
              enabled: zoomSelected,
            },
            mode: 'x',
            scaleMode: 'x',
            onZoomComplete,
          },
          pan: {
            enabled: panSelected,
            mode: 'xy',
            onPanComplete,
          },
        },
      },
    }
  }

  let optionsWithPlugins = new Options()
  const chartRef = useRef(null)

  const setScales = useCallback((savedScales) => {
    const chart = chartRef.current
    if (!chart) return

    for (const [axis, scale] of Object.entries(chart.scales)) {
      const min = savedScales[axis + 'Min']
      const max = savedScales[axis + 'Max']

      if (min !== undefined) scale.options.min = min
      if (max !== undefined) scale.options.max = max
    }

    chart.update()
  }, [])

  const globalChartOpts = {
    interaction: {
      intersect: false,
      mode: 'index',
    },
  }

  //* Event Handlers */

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom()
      chartRef.current.update()
      setScaleRef({})
    }
  }
  const handleToggleZoom = () => {
    if (chartRef.current) {
      if (!zoomSelected === true) {
        chartRef.current.options.plugins.zoom.pan.enabled = false
        setPanSelected(false)
      }
      chartRef.current.update()
      setZoomSelected(!zoomSelected)
    }
  }
  const handleTogglePan = () => {
    if (chartRef.current) {
      if (!panSelected === true) {
        chartRef.current.config.options.plugins.zoom.zoom.drag.enabled = false
        setZoomSelected(false)
      }
      chartRef.current.update()
      setPanSelected(!panSelected)
    }
  }
  const handleZoomIn = () => {
    if (chartRef.current) {
      chartRef.current.zoom(1.1)
      setScaleRef(getScaleRef(chartRef.current))
    }
  }
  const handleZoomOut = () => {
    if (chartRef.current) {
      chartRef.current.zoom(0.9)
      setScaleRef(getScaleRef(chartRef.current))
    }
  }

  // const lineChart = () => {
  //   return <Line key={id} ref={chartRef} data={data} options={{ ...optionsWithPlugins, ...globalChartOpts }}></Line>;
  // };

  useEffect(() => {
    if (chartRef.current) {
      if (scaleRef != undefined) {
        setScales(scaleRef)
        chartRef.current.update()
      }
      return
    }
  }, [zoomSelected, panSelected, scaleRef, data, setScales])

  useEffect(() => {
    if (chartRef.current && chartRef.current.config.data != data) {
      chartRef.current.config.data.labels = data.labels
      chartRef.current.config.data.datasets = data.datasets
      if (scaleRef != undefined) {
        setScales(scaleRef)
      }
      chartRef.current.update()
    }
  }, [data, scaleRef, setScales])

  useEffect(() => {
    if (scaleRef != undefined) {
      setScales(scaleRef)
    }
    return
  }, [scaleRef, setScales])

  const handleExportChart = () => {
    if (chartRef.current) {
      const link = document.createElement('a')
      link.href = chartRef.current.toBase64Image()
      link.download = `chart-${id}-${new Date().toISOString().split('T')[0]}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        height: '100%',
        width: '100%',
        minWidth: 0,
        alignItems: 'stretch',
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          height: '100%',
          position: 'relative',
        }}
      >
        <Line
          data-testid="chart-container"
          datasetIdKey={datasetIdKey}
          key={id}
          ref={chartRef}
          data={data}
          options={{ ...optionsWithPlugins, ...globalChartOpts }}
          plugins={[]}
        ></Line>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          flexShrink: 0,
        }}
      >
        <Tooltip
          title="Reset"
          placement="bottom"
          disableInteractive
          slotProps={{
            popper: {
              modifiers: [
                {
                  name: 'offset',
                  options: {
                    offset: [0, -11],
                  },
                },
              ],
            },
          }}
        >
          <ToggleButton
            value={resetSelected}
            onClick={handleResetZoom}
            variant="outlined"
            sx={{ width: '32px', height: '32px' }}
          >
            <Box
              component="img"
              src={reset}
              sx={{ width: '16px', height: '16px' }}
            ></Box>
          </ToggleButton>
        </Tooltip>

        <>
          <Tooltip
            title="Zoom"
            placement="bottom"
            disableInteractive
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, -11],
                    },
                  },
                ],
              },
            }}
          >
            <ToggleButton
              value={zoomSelected}
              selected={zoomSelected}
              onClick={handleToggleZoom}
              sx={{ width: '32px', height: '32px' }}
            >
              <Box
                component="img"
                src={zoom}
                sx={{ width: '16px', height: '16px' }}
              ></Box>
            </ToggleButton>
          </Tooltip>
          <Tooltip
            title="Pan"
            placement="bottom"
            disableInteractive
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, -11],
                    },
                  },
                ],
              },
            }}
          >
            <ToggleButton
              value={panSelected}
              selected={panSelected}
              onClick={handleTogglePan}
              sx={{ width: '32px', height: '32px' }}
            >
              <Box
                component="img"
                src={pan}
                sx={{ width: '16px', height: '16px' }}
              ></Box>
            </ToggleButton>
          </Tooltip>
          <Tooltip
            title="Zoom In"
            placement="bottom"
            disableInteractive
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, -11],
                    },
                  },
                ],
              },
            }}
          >
            <ToggleButton
              value={false}
              onClick={handleZoomIn}
              sx={{ width: '32px', height: '32px' }}
            >
              <Box
                component="img"
                src={zoomIn}
                sx={{ width: '16px', height: '16px' }}
              ></Box>
            </ToggleButton>
          </Tooltip>
          <Tooltip
            title="Zoom Out"
            placement="bottom"
            disableInteractive
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, -11],
                    },
                  },
                ],
              },
            }}
          >
            <ToggleButton
              value={false}
              variant="contained"
              onClick={handleZoomOut}
              sx={{ width: '32px', height: '32px' }}
            >
              <Box
                component="img"
                src={zoomOut}
                sx={{ width: '16px', height: '16px' }}
              ></Box>
            </ToggleButton>
          </Tooltip>

          <Tooltip
            title="Export Chart"
            placement="bottom"
            disableInteractive
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, -11],
                    },
                  },
                ],
              },
            }}
          >
            <ToggleButton
              value={false}
              onClick={handleExportChart}
              sx={{ width: '32px', height: '32px' }}
            >
              <Box
                component="img"
                src={downloadIcon}
                sx={{ width: '20px', height: '20px' }}
              ></Box>
            </ToggleButton>
          </Tooltip>
        </>

        <Tooltip
          title="Fullscreen"
          placement="bottom"
          disableInteractive
          slotProps={{
            popper: {
              modifiers: [
                {
                  name: 'offset',
                  options: {
                    offset: [0, -11],
                  },
                },
              ],
            },
          }}
        >
          <ToggleButton
            value={false}
            selected={false}
            onClick={handleOpen}
            sx={{ width: '32px', height: '32px' }}
          >
            <Box
              component="img"
              src={Fullscreen}
              sx={{ width: '16px', height: '16px' }}
            ></Box>
          </ToggleButton>
        </Tooltip>
        <Modal
          data-testid="fullscreen-modal"
          open={open}
          onClose={handleClose}
          closeAfterTransition
        >
          <Fade in={open}>
            <Box
              sx={{
                position: 'absolute',
                bgcolor: 'white',
                display: 'flex',
                height: '100vh',
                width: '100vw',
              }}
            >
              <Box
                sx={{
                  width: '90%',
                  heigh: '100%',
                  py: '2.5%',
                  paddingLeft: '2.5%',
                }}
              >
                <Line
                  key={id}
                  ref={chartRef}
                  datasetIdKey={datasetIdKey}
                  data={data}
                  options={{ ...optionsWithPlugins, ...globalChartOpts }}
                  plugins={[]}
                ></Line>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1%',
                  padding: '2.5%',
                }}
              >
                <Tooltip
                  title="Reset"
                  placement="bottom"
                  disableInteractive
                  slotProps={{
                    popper: {
                      modifiers: [
                        {
                          name: 'offset',
                          options: {
                            offset: [0, -11],
                          },
                        },
                      ],
                    },
                  }}
                >
                  <ToggleButton
                    value={resetSelected}
                    onClick={handleResetZoom}
                    variant="outlined"
                  >
                    <Box
                      component="img"
                      src={reset}
                      sx={{ width: '20px', height: '20px' }}
                    ></Box>
                  </ToggleButton>
                </Tooltip>
                <Tooltip
                  title="Zoom"
                  placement="bottom"
                  disableInteractive
                  slotProps={{
                    popper: {
                      modifiers: [
                        {
                          name: 'offset',
                          options: {
                            offset: [0, -11],
                          },
                        },
                      ],
                    },
                  }}
                >
                  <ToggleButton
                    value={zoomSelected}
                    selected={zoomSelected}
                    onClick={handleToggleZoom}
                  >
                    <Box
                      component="img"
                      src={zoom}
                      sx={{ width: '20px', height: '20px' }}
                    ></Box>
                  </ToggleButton>
                </Tooltip>
                <>
                  <Tooltip
                    title="Pan"
                    placement="bottom"
                    disableInteractive
                    slotProps={{
                      popper: {
                        modifiers: [
                          {
                            name: 'offset',
                            options: {
                              offset: [0, -11],
                            },
                          },
                        ],
                      },
                    }}
                  >
                    <ToggleButton
                      value={panSelected}
                      selected={panSelected}
                      onClick={handleTogglePan}
                    >
                      <Box
                        component="img"
                        src={pan}
                        sx={{ width: '20px', height: '20px' }}
                      ></Box>
                    </ToggleButton>
                  </Tooltip>
                  <Tooltip
                    title="Zoom In"
                    placement="bottom"
                    disableInteractive
                    slotProps={{
                      popper: {
                        modifiers: [
                          {
                            name: 'offset',
                            options: {
                              offset: [0, -11],
                            },
                          },
                        ],
                      },
                    }}
                  >
                    <ToggleButton value={false} onClick={handleZoomIn}>
                      <Box
                        component="img"
                        src={zoomIn}
                        sx={{ width: '20px', height: '20px' }}
                      ></Box>
                    </ToggleButton>
                  </Tooltip>
                  <Tooltip
                    title="Zoom Out"
                    placement="bottom"
                    disableInteractive
                    slotProps={{
                      popper: {
                        modifiers: [
                          {
                            name: 'offset',
                            options: {
                              offset: [0, -11],
                            },
                          },
                        ],
                      },
                    }}
                  >
                    <ToggleButton
                      value={false}
                      variant="contained"
                      onClick={handleZoomOut}
                    >
                      <Box
                        component="img"
                        src={zoomOut}
                        sx={{ width: '20px', height: '20px' }}
                      ></Box>
                    </ToggleButton>
                  </Tooltip>

                  <Tooltip
                    title="Export Chart"
                    placement="bottom"
                    disableInteractive
                    slotProps={{
                      popper: {
                        modifiers: [
                          {
                            name: 'offset',
                            options: {
                              offset: [0, -11],
                            },
                          },
                        ],
                      },
                    }}
                  >
                    <ToggleButton value={false} onClick={handleExportChart}>
                      <Box
                        component="img"
                        src={downloadIcon}
                        sx={{ width: '20px', height: '20px' }}
                      ></Box>
                    </ToggleButton>
                  </Tooltip>
                </>

                <Tooltip
                  title="Windowed"
                  placement="bottom"
                  disableInteractive
                  slotProps={{
                    popper: {
                      modifiers: [
                        {
                          name: 'offset',
                          options: {
                            offset: [0, -11],
                          },
                        },
                      ],
                    },
                  }}
                >
                  <ToggleButton
                    value={false}
                    selected={false}
                    onClick={handleClose}
                  >
                    <Box
                      component="img"
                      src={FullscreenExit}
                      sx={{ width: '20px', height: '20px' }}
                    ></Box>
                  </ToggleButton>
                </Tooltip>
              </Box>
            </Box>
          </Fade>
        </Modal>
      </Box>
    </Box>
  )
}
export default ChartWrapper

ChartWrapper.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
  options: PropTypes.object,
}
