import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import { DataGrid } from '@mui/x-data-grid'
import { useMemo, useState } from 'react'
import useAxiosPrivate from '../../../auth/hooks/useAxiosPrivate'
import { useUserGroups } from '../../../services/group'
import { useHardware } from '../../../services/hardware'
import { useUserLoggers } from '../../../services/logger'
import AddHardwareModal from './AddHardwareModal'
import EditHardwareModal from './EditHardwareModal'
import DeleteHardwareButton from './DeleteHardwareButton'
import { formatSensorType } from '../../../utils/sensorTypes'
import DirtvizHardware from './DirtvizHardware'
import { useSharedHardware } from '../../../services/sharedHardware'

const getStatusColor = (row) => {
  if (row.hardwareType === 'dirtviz-cell') {
    if (!row.enabled) return 'default'
    return row.detailsError ? 'warning' : 'success'
  }
  if (row.archived) {
    return 'default'
  }
  if (row.hardwareType === 'actuator' && row.activeState === 'open') {
    return 'warning'
  }
  return 'success'
}

function HardwareList() {
  const axiosPrivate = useAxiosPrivate()
  const sharedHardware = useSharedHardware(axiosPrivate)
  const [archiveFilter, setArchiveFilter] = useState('active')
  const [addHardwareOpen, setAddHardwareOpen] = useState(false)
  const [editingHardware, setEditingHardware] = useState(null)

  const {
    data: hardware = [],
    isLoading: hardwareIsLoading,
    isError: hardwareIsError,
    error: hardwareError,
  } = useHardware(axiosPrivate, {
    includeArchived: true,
  })

  const {
    data: loggers = [],
    isLoading: loggersAreLoading,
    isError: loggersHaveErrors,
  } = useUserLoggers(axiosPrivate)

  const {
    data: groups = [],
    isLoading: groupsAreLoading,
    isError: groupsHaveError,
  } = useUserGroups(axiosPrivate)

  const hardwareOptionsUnavailable =
    loggersAreLoading ||
    groupsAreLoading ||
    loggersHaveErrors ||
    groupsHaveError

  const loggerNames = useMemo(
    () =>
      new Map(
        loggers.map((logger) => [
          logger.logger_id,
          logger.name || `Logger ${logger.logger_id}`,
        ]),
      ),
    [loggers],
  )

  const groupNames = useMemo(
    () => new Map(groups.map((group) => [group.uuid, group.name])),
    [groups],
  )

  const filteredHardware = useMemo(() => {
    const rows = [...hardware, ...sharedHardware.rows].sort((a, b) =>
      a.name.localeCompare(b.name),
    )

    if (archiveFilter === 'archived') {
      return rows.filter((row) => row.archived)
    }

    if (archiveFilter === 'disabled') {
      return rows.filter(
        (row) => row.hardwareType === 'dirtviz-cell' && !row.enabled,
      )
    }

    if (archiveFilter === 'active') {
      return rows.filter((row) =>
        row.hardwareType === 'dirtviz-cell' ? row.enabled : !row.archived,
      )
    }

    return rows
  }, [archiveFilter, hardware, sharedHardware.rows])

  const columns = useMemo(
    () => [
      {
        field: 'category',
        headerName: 'Category',
        width: 125,
        renderCell: ({ row }) => row.category,
      },
      {
        field: 'name',
        headerName: 'Name',
        minWidth: 180,
        flex: 1,
      },
      {
        field: 'subtype',
        headerName: 'Subtype',
        minWidth: 150,
        flex: 1,
        renderCell: ({ row }) =>
          row.hardwareType === 'dirtviz-cell'
            ? row.subtype
            : formatSensorType(row.subtype),
      },
      {
        field: 'hardwareId',
        headerName: 'Hardware ID / Cell ID',
        width: 180,
        renderCell: ({ row }) => row.hardwareId ?? '-',
      },
      {
        field: 'loggerId',
        headerName: 'Logger ID',
        minWidth: 160,
        flex: 1,
        renderCell: ({ row }) =>
          row.loggerId == null
            ? '-'
            : loggerNames.get(row.loggerId) || `Logger ${row.loggerId}`,
      },
      {
        field: 'groupId',
        headerName: 'Group',
        minWidth: 150,
        flex: 1,
        renderCell: ({ row }) =>
          row.hardwareType === 'dirtviz-cell'
            ? row.deploymentLabel
            : row.groupId
              ? groupNames.get(row.groupId) || 'Unknown Group'
              : 'No Group',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: ({ row }) => (
          <Chip label={row.status} color={getStatusColor(row)} size="small" />
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 170,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) =>
          row.hardwareType === 'dirtviz-cell' ? (
            '—'
          ) : (
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
                height: '100%',
              }}
            >
              <Button
                variant="contained"
                sx={{ p: 0.7, minWidth: 0 }}
                disabled={hardwareOptionsUnavailable}
                onClick={() => setEditingHardware(row)}
              >
                Edit
              </Button>

              <DeleteHardwareButton hardware={row} />
            </Stack>
          ),
      },
    ],
    [groupNames, loggerNames, hardwareOptionsUnavailable],
  )

  const isLoading = hardwareIsLoading || sharedHardware.isLoading

  return (
    <Box
      sx={{
        width: {
          xs: '100%',
          sm: '95%',
          md: '90%',
        },
        maxWidth: 1500,
        minHeight: 'calc(100vh - 100px)',
        bgcolor: '#A0A0A0',
        borderRadius: '10px',
        p: {
          xs: 1,
          sm: 1.5,
          md: 2,
        },
        boxSizing: 'border-box',
      }}
    >
      <Stack
        direction={{
          xs: 'column',
          sm: 'row',
        }}
        spacing={2}
        sx={{
          mb: 2,
          alignItems: {
            xs: 'stretch',
            sm: 'center',
          },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              color: '#1E3A5F',
              fontWeight: 'bold',
            }}
          >
            Hardware
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Manage your hardware
          </Typography>
        </Box>

        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <FormControl
            size="small"
            sx={{
              minWidth: 140,
            }}
          >
            <InputLabel id="hardware-status-filter-label">Show</InputLabel>

            <Select
              labelId="hardware-status-filter-label"
              value={archiveFilter}
              label="Show"
              onChange={(event) => setArchiveFilter(event.target.value)}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
              <MenuItem value="disabled">Disabled</MenuItem>
              <MenuItem value="all">All</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={() => setAddHardwareOpen(true)}
            disabled={hardwareOptionsUnavailable}
            sx={{
              backgroundColor: '#1E3A5F',
              whiteSpace: 'nowrap',
              '&:hover': {
                backgroundColor: '#2AB0EE',
              },
            }}
          >
            Add Hardware
          </Button>
          <DirtvizHardware />
        </Stack>
      </Stack>

      {hardwareIsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {hardwareError?.message || 'Local hardware could not be loaded.'}
        </Alert>
      )}

      {(loggersHaveErrors || groupsHaveError) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Some logger or group names could not be loaded.
        </Alert>
      )}

      {sharedHardware.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Imported Dirtviz cells could not be loaded.
        </Alert>
      )}

      {sharedHardware.detailsError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Some Dirtviz cell details or demo memberships could not be loaded.
        </Alert>
      )}

      {sharedHardware.detailsLoading && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          Loading Dirtviz cell details…
        </Typography>
      )}

      {!isLoading &&
        !hardwareIsError &&
        !sharedHardware.isError &&
        filteredHardware.length === 0 && (
          <Alert
            severity="info"
            sx={{
              mb: 2,
            }}
          >
            No hardware matches the selected filter.
          </Alert>
        )}

      <Box
        sx={{
          width: '100%',
          minHeight: 500,
          bgcolor: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <DataGrid
          rows={filteredHardware}
          columns={columns}
          loading={isLoading}
          getRowClassName={({ row }) =>
            row.hardwareType === 'actuator'
              ? 'hardware-row--actuator'
              : 'hardware-row--sensor'
          }
          disableRowSelectionOnClick
          pageSizeOptions={[5, 10, 25]}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
                page: 0,
              },
            },
          }}
          sx={{
            border: 0,
            minHeight: 500,
            '& .hardware-row--sensor': {
              backgroundColor: '#fafafa',
            },
            '& .hardware-row--actuator': {
              backgroundColor: '#f2f2f2',
            },
            '& .hardware-row--sensor:hover': {
              backgroundColor: '#f5f5f5',
            },
            '& .hardware-row--actuator:hover': {
              backgroundColor: '#e8e8e8',
            },
          }}
        />
      </Box>
      <AddHardwareModal
        open={addHardwareOpen}
        onClose={() => setAddHardwareOpen(false)}
        loggers={loggers}
        groups={groups}
      />

      {editingHardware && (
        <EditHardwareModal
          key={editingHardware.id}
          open
          hardware={editingHardware}
          onClose={() => setEditingHardware(null)}
          loggers={loggers}
          groups={groups}
        />
      )}
    </Box>
  )
}

export default HardwareList
