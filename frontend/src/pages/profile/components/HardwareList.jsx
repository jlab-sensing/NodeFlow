import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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

const formatSubtype = (subtype) => {
  if (!subtype) {
    return '-'
  }
  return subtype
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const getStatusColor = (row) => {
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
    if (archiveFilter === 'archived') {
      return hardware.filter((item) => item.archived)
    }
    if (archiveFilter === 'active') {
      return hardware.filter((item) => !item.archived)
    }
    return hardware
  }, [archiveFilter, hardware])

  const columns = useMemo(
    () => [
      {
        field: 'category',
        headerName: 'Category',
        width: 125,
        renderCell: ({ row }) => (
          row.category
        ),
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
        renderCell: ({ row }) => formatSubtype(row.subtype),
      },
      {
        field: 'hardwareId',
        headerName: 'Hardware ID',
        width: 125,
        renderCell: ({ row }) => row.hardwareId ?? '-',
      },
      {
        field: 'loggerId',
        headerName: 'Logger ID',
        minWidth: 160,
        flex: 1,
        renderCell: ({ row }) =>
          loggerNames.get(row.loggerId) || `Logger ${row.loggerId}`,
      },
      {
        field: 'groupId',
        headerName: 'Group',
        minWidth: 150,
        flex: 1,
        renderCell: ({ row }) =>
          row.groupId
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
        renderCell: ({ row }) => (
          <Stack 
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', height: '100%'}}
          >
            <Button
              variant='contained'
              sx={{ p: 0.7, minWidth: 0}}
              onClick={() => setEditingHardware(row)}
            >
              Edit
            </Button>

            <DeleteHardwareButton hardware={row} />
          </Stack>
        ),
      },
    ],
    [groupNames, loggerNames],
  )

  const isLoading = hardwareIsLoading || loggersAreLoading || groupsAreLoading

  const hasError = hardwareIsError || loggersHaveErrors || groupsHaveError

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }
  if (hasError) {
    return (
      <Alert severity="error">
        {hardwareError?.response?.data?.detail ||
          hardwareError?.message ||
          'Hardware could not be loaded.'}
      </Alert>
    )
  }

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
            Manage your sensors and actuators.
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
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
              <MenuItem value="all">All</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={() => setAddHardwareOpen(true)}
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
        </Stack>
      </Stack>

      {filteredHardware.length === 0 && (
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
          getRowClassName={({ row }) =>
            row.hardwareType === 'sensor'
              ? 'hardware-row--sensor'
              : 'hardware-row--actuator'
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
