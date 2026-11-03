import { act, render, screen, waitFor } from '@testing-library/react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import GroupBox from '../../../src/pages/dashboard/components/GroupBox'
import { USER_GROUPS_QUERY_KEY } from '../../../src/services/group'

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}))

vi.mock('../../../src/auth/hooks/useAxiosPrivate', () => ({
  default: () => api,
}))

const group = { uuid: 'group-1', name: 'Test Group', irrigation_mode: 'manual' }
const sensor = { id: 10, sensor_type: 'soil_moisture', archived: false }
const preference = {
  sensor_id: sensor.id,
  measurement: 'vwc',
  condition_operator: '<',
  condition_value: 0,
  enabled: true,
}

function mockGroupData({
  savedPreference = null,
  sensors = [sensor],
  solenoids = [],
} = {}) {
  api.get.mockImplementation((url) =>
    Promise.resolve({
      data: url.endsWith('/devices') ? { sensors, solenoids } : savedPreference,
    }),
  )
}

const modeSwitch = () => screen.getByRole('switch', { name: /Irrigation mode/ })

function CachedGroup() {
  const { data } = useQuery({ queryKey: USER_GROUPS_QUERY_KEY, enabled: false })
  return <GroupBox group={data[0]} />
}

function renderGroup(initialGroup = group) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(USER_GROUPS_QUERY_KEY, [initialGroup])
  render(
    <QueryClientProvider client={queryClient}>
      <CachedGroup />
    </QueryClientProvider>,
  )
  return queryClient
}

describe('group automatic mode eligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.patch.mockImplementation((_url, { mode }) =>
      Promise.resolve({ data: { mode } }),
    )
  })

  it('defaults to Manual and prevents Auto without a saved activation preference', async () => {
    mockGroupData()
    renderGroup({ uuid: group.uuid, name: group.name })

    expect(
      await screen.findByText(/Save an enabled activation threshold/),
    ).toBeInTheDocument()
    expect(modeSwitch()).not.toBeChecked()
    expect(modeSwitch()).toBeDisabled()
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('allows explicit Auto after saving an enabled threshold, including zero', async () => {
    mockGroupData({ savedPreference: preference })
    const user = userEvent.setup()
    renderGroup()

    await waitFor(() => expect(modeSwitch()).toBeEnabled())
    expect(api.patch).not.toHaveBeenCalled()
    await user.click(modeSwitch())
    expect(api.patch).toHaveBeenCalledWith('/api/groups/group-1/mode', {
      mode: 'auto',
    })
    await waitFor(() => expect(modeSwitch()).toBeChecked())
  })

  it.each([
    [
      'disabled preference',
      { savedPreference: { ...preference, enabled: false } },
    ],
    ['unassigned sensor', { savedPreference: preference, sensors: [] }],
    [
      'archived sensor',
      { savedPreference: preference, sensors: [{ ...sensor, archived: true }] },
    ],
    [
      'missing measurement',
      { savedPreference: { ...preference, measurement: '' } },
    ],
    [
      'missing threshold',
      { savedPreference: { ...preference, condition_value: null } },
    ],
    [
      'invalid close threshold',
      {
        savedPreference: {
          ...preference,
          close_condition_operator: '>',
          close_condition_value: 0,
        },
      },
    ],
  ])('prevents Auto with %s', async (_label, data) => {
    mockGroupData(data)
    renderGroup()
    await screen.findByText(/Save an enabled activation threshold/)
    expect(modeSwitch()).toBeDisabled()
  })

  it('keeps real logger groups in Manual even with a valid preference', async () => {
    mockGroupData({
      savedPreference: preference,
      solenoids: [
        { id: 1, name: 'TTN Test', logger_id: 1951, active_state: 'closed' },
      ],
    })
    renderGroup()

    await screen.findByText('Real loggers currently support Manual mode only.')
    expect(modeSwitch()).toBeDisabled()
  })

  it('always allows returning from Auto to Manual when settings become unusable', async () => {
    mockGroupData()
    const user = userEvent.setup()
    renderGroup({ ...group, irrigation_mode: 'auto' })
    await screen.findByText(/Save an enabled activation threshold/)

    expect(modeSwitch()).toBeEnabled()
    await user.click(modeSwitch())
    expect(api.patch).toHaveBeenCalledWith('/api/groups/group-1/mode', {
      mode: 'manual',
    })
    await waitFor(() => expect(modeSwitch()).not.toBeChecked())
  })

  it('reflects a server reset to the original Manual mode after the user enables Auto', async () => {
    mockGroupData({ savedPreference: preference })
    const user = userEvent.setup()
    const queryClient = renderGroup()
    await waitFor(() => expect(modeSwitch()).toBeEnabled())
    await user.click(modeSwitch())
    await waitFor(() => expect(modeSwitch()).toBeChecked())

    mockGroupData()
    await act(async () => {
      await queryClient.fetchQuery({
        queryKey: USER_GROUPS_QUERY_KEY,
        queryFn: async () => [group],
      })
    })
    await screen.findByText(/Save an enabled activation threshold/)
    expect(modeSwitch()).not.toBeChecked()
    expect(modeSwitch()).toBeDisabled()
  })
})
