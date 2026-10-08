import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import useAuth from '../../../auth/hooks/useAuth'
import useAxiosPrivate from '../../../auth/hooks/useAxiosPrivate'

function errorText(error) {
  const detail = error?.response?.data?.detail

  return typeof detail === 'string'
    ? detail
    : detail
      ? JSON.stringify(detail)
      : error?.message || 'Request failed'
}

export default function DirtvizHardware() {
  const { user, loggedIn, isAuthLoading } = useAuth()
  const client = useAxiosPrivate()
  const cache = useQueryClient()

  const ready = Boolean(user?.id && loggedIn && !isAuthLoading)

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

  const imported = useQuery({
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

  const available = useQuery({
    queryKey: ['shared-demo', user?.id, 'available'],
    enabled: ready && open,
    retry: false,
    queryFn: async ({ signal }) =>
      (
        await client.get('/api/shared-cells/available', {
          signal,
        })
      ).data,
  })

  const batch = useMutation({
    retry: false,

    mutationFn: async (ids) => {
      const successes = []
      const failures = []

      for (const id of [...new Set(ids)]) {
        try {
          const response = await client.post('/api/shared-cells/', {
            cell_id: Number(id),
          })
          successes.push(response.data)
        } catch (error) {
          failures.push({
            id,
            message: errorText(error),
          })
        }
      }
      return { successes, failures }
    },
    onSuccess: async ({ successes, failures }) => {
      setSelectedIds(failures.map((item) => item.id))
      cache.setQueryData(
        ['shared-demo', user?.id, 'selected'],
        (current = []) => {
          const rows = new Map(current.map((cell) => [cell.uuid, cell]))
          successes.forEach((cell) => {
            rows.set(cell.uuid, cell)
          })
          return [...rows.values()]
        },
      )
      await cache.invalidateQueries({
        queryKey: ['shared-demo'],
      })
    },
  })

  const cells = imported.data ?? []
  const options = available.data?.cells ?? []
  const query = search.trim().toLowerCase()
  const busy = batch.isPending

  const visible = options.filter((cell) =>
    (String(cell.name) + ' ' + cell.id).toLowerCase().includes(query),
  )

  function alreadyImported(cell) {
    return (
      Boolean(cell.shared_cell_uuid && cell.enabled) ||
      cells.some(
        (row) =>
          row.source_instance === available.data?.source_instance &&
          row.cell_id === cell.id &&
          row.enabled,
      )
    )
  }

  function openDialog() {
    batch.reset()
    setSelectedIds([])
    setSearch('')
    setOpen(true)
  }

  function toggle(id, checked) {
    setSelectedIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((item) => item !== id),
    )
  }

  if (!ready) return null

  return (
    <>
      <Button
        variant="contained"
        onClick={openDialog}
        sx={{
          backgroundColor: '#1E3A5F',
          whiteSpace: 'nowrap',
          '&:hover': {
            backgroundColor: '#2AB0EE',
          },
        }}
      >
        Import cell from Dirtviz
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          if (!busy) setOpen(false)
        }}
        fullWidth
        maxWidth="sm"
        aria-labelledby="import-dirtviz-title"
      >
        <DialogTitle id="import-dirtviz-title">
          Import cells from Dirtviz
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            {imported.isError && (
              <Alert severity="error">{errorText(imported.error)}</Alert>
            )}
            <TextField
              label="Search cells"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={busy}
              fullWidth
            />

            {available.isLoading && <CircularProgress size={24} />}

            {available.isError && (
              <Alert
                severity="error"
                action={
                  <Button onClick={() => available.refetch()} disabled={busy}>
                    Retry
                  </Button>
                }
              >
                {errorText(available.error)}
              </Alert>
            )}

            <FormGroup>
              {visible.map((cell) => (
                <FormControlLabel
                  key={cell.id}
                  label={
                    cell.name +
                    ' · Cell ' +
                    cell.id +
                    (alreadyImported(cell) ? ' · Imported' : '')
                  }
                  control={
                    <Checkbox
                      checked={selectedIds.includes(cell.id)}
                      disabled={busy || alreadyImported(cell)}
                      onChange={(event) =>
                        toggle(cell.id, event.target.checked)
                      }
                    />
                  }
                />
              ))}
            </FormGroup>

            {available.isSuccess && !visible.length && (
              <Typography>No cells match your search</Typography>
            )}

            {batch.data && (
              <Alert
                severity={batch.data.failures.length ? 'warning' : 'success'}
              >
                {batch.data.successes.length} imported;{' '}
                {batch.data?.failures.length} failed.
              </Alert>
            )}

            {batch.data?.failures.map((failure) => (
              <Alert key={failure.id} severity="error">
                Cell {failure.id}: {failure.message}
              </Alert>
            ))}

            {batch.isError && (
              <Alert severity="error">{errorText(batch.error)}</Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button disabled={busy} onClick={() => setOpen(false)}>
            Close
          </Button>

          <Button
            variant="contained"
            disabled={busy || !available.isSuccess || !selectedIds.length}
            onClick={() => batch.mutate([...selectedIds])}
          >
            {busy
              ? 'Importing...'
              : 'Import selected (' + selectedIds.length + ')'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
