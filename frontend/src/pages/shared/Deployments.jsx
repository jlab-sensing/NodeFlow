import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import TopNav from '../../components/TopNav'
import useAuth from '../../auth/hooks/useAuth'
import useAxiosPrivate from '../../auth/hooks/useAxiosPrivate'

function errorText(error) {
  const detail = error?.response?.data?.detail

  return typeof detail === 'string'
    ? detail
    : detail
      ? JSON.stringify(detail)
      : error?.message || 'Request Failed'
}

export default function Deployments() {
  const { user, loggedIn, isAuthLoading } = useAuth()
  const client = useAxiosPrivate()
  const cache = useQueryClient()

  const ready = Boolean(user?.id && loggedIn && !isAuthLoading)

  const [editingId, setEditingId] = useState(null)
  const [name, setName] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [notice, setNotice] = useState('')

  const groups = useQuery({
    queryKey: ['shared-demo', user?.id, 'deployments'],
    enabled: ready,
    retry: false,
    refetchInterval: 60000,
    queryFn: async ({ signal }) =>
      (
        await client.get('/api/deployments/', {
          signal,
        })
      ).data,
  })

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

  function resetForm() {
    setEditingId(null)
    setName('')
    setSelectedIds([])
  }

  const mutation = useMutation({
    retry: false,

    mutationFn: async (command) => {
      if (command.uuid) {
        await client.put('/api/deployments/' + command.uuid, command.payload)
      } else {
        await client.post('/api/deployments/', command.payload)
      }

      return command
    },

    onSuccess: async (command) => {
      await cache.invalidateQueries({
        queryKey: ['shared-demo'],
      })

      resetForm()

      setNotice(command.uuid ? 'Demo group updated' : 'Demo group created')
    },
  })

  const busy = mutation.isPending
  const cells = selected.data ?? []

  function save(event) {
    event.preventDefault()

    if (
      !ready ||
      busy ||
      !selected.isSuccess ||
      !name.trim() ||
      !selectedIds.length
    ) {
      return
    }
    setNotice('')
    mutation.mutate({
      uuid: editingId,
      payload: {
        name: name.trim(),
        shared_cell_uuids: [...selectedIds],
      },
    })
  }

  function edit(group) {
    mutation.reset()
    setNotice('')
    setEditingId(group.uuid)
    setName(group.name)
    setSelectedIds([...group.shared_cell_uuids])
  }

  return (
    <>
      <TopNav />

      <Box component="main" sx={{ maxWidth: 1100, mx: 'auto', p: 3 }}>
        <Typography component="h1" variant="h4" sx={{ mb: 2 }}>
          Demo groups
        </Typography>

        {isAuthLoading ? (
          <CircularProgress />
        ) : !ready ? (
          <Alert severity="info">
            Sign in using the navigation to view demo groups.
          </Alert>
        ) : (
          <Stack spacing={3}>
            <Typography component="p">
              These groups are shared with every signed-in NodeFlow user.
            </Typography>

            {notice && <Alert severity="success">{notice}</Alert>}

            {mutation.isError && (
              <Alert severity="error">{errorText(mutation.error)}</Alert>
            )}

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography component="h2" variant="h6">
                {editingId ? 'Edit demo group' : 'Create demo group'}
              </Typography>

              {selected.isError && (
                <Alert severity="error">{errorText(selected.error)}</Alert>
              )}

              <Box component="form" onSubmit={save} sx={{ mt: 2 }}>
                <Stack spacing={2}>
                  <TextField
                    required
                    label="Group name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={busy}
                    slotProps={{
                      htmlInput: { maxLength: 200 },
                    }}
                  />

                  {selected.isPending && (
                    <Typography>Loading shared cells…</Typography>
                  )}

                  {selected.isSuccess && !cells.length && (
                    <Typography>
                      Import cells from the{' '}
                      <Link to="/profile/hardware">Hardware page</Link> first.
                    </Typography>
                  )}

                  <FormGroup>
                    {cells.map((cell) => {
                      const checked = selectedIds.includes(cell.uuid)

                      return (
                        <FormControlLabel
                          key={cell.uuid}
                          label={
                            cell.name + (cell.enabled ? '' : ' · Disabled')
                          }
                          control={
                            <Checkbox
                              checked={checked}
                              disabled={busy || (!cell.enabled && !checked)}
                              onChange={(event) =>
                                setSelectedIds((current) =>
                                  event.target.checked
                                    ? [...new Set([...current, cell.uuid])]
                                    : current.filter(
                                        (uuid) => uuid !== cell.uuid,
                                      ),
                                )
                              }
                            />
                          }
                        />
                      )
                    })}
                  </FormGroup>

                  <Stack direction="row" spacing={1}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={
                        busy ||
                        !selected.isSuccess ||
                        !name.trim() ||
                        !selectedIds.length
                      }
                    >
                      {editingId ? 'Save group' : 'Create group'}
                    </Button>

                    {editingId && (
                      <Button onClick={resetForm} disabled={busy}>
                        Cancel edit
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Box>
            </Paper>

            <Typography component="h2" variant="h6">
              All demo groups
            </Typography>

            {groups.isPending && <CircularProgress />}

            {groups.isError && (
              <Alert severity="error">{errorText(groups.error)}</Alert>
            )}

            {groups.isSuccess && !groups.data.length && (
              <Typography>No demo groups yet.</Typography>
            )}

            {(groups.data ?? []).map((group) => (
              <Paper key={group.uuid} variant="outlined" sx={{ p: 2 }}>
                <Typography component="h3" variant="h6">
                  {group.name}
                </Typography>

                <Typography component="p" sx={{ mb: 2 }}>
                  {group.cells.map((cell) => cell.name).join(', ')}
                </Typography>

                <Stack direction="row" spacing={1}>
                  <Button
                    component={Link}
                    to={'/charts?demo=' + encodeURIComponent(group.uuid)}
                    variant="contained"
                  >
                    View graphs
                  </Button>

                  <Button onClick={() => edit(group)} disabled={busy}>
                    Edit
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </>
  )
}
