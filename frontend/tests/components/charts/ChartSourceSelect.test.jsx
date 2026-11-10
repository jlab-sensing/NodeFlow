import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import publicClient from '../../../src/api/axios'
import ChartSourcesSelect from '../../../src/pages/profile/components/ChartSourceSelect'

vi.mock('../../../src/api/axios', () => ({
  default: { get: vi.fn() },
}))

vi.mock('../../../src/auth/hooks/useAuth', () => ({
  default: () => ({ loggedIn: false, isAuthLoading: false }),
}))

vi.mock('../../../src/auth/hooks/useAxiosPrivate', () => ({
  default: () => ({}),
}))

function LocationSearch() {
  const { search } = useLocation()
  return <output data-testid="location-search">{search}</output>
}

describe('ChartSourcesSelect', () => {
  let queryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  function renderSelector() {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChartSourcesSelect />
          <LocationSearch />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    return user
  }

  it.each([
    ['HTML from the frontend server', '<!doctype html><html></html>'],
    ['an error object', { detail: 'Not Found' }],
    ['a null response', null],
  ])('shows a load error without crashing for %s', async (_, data) => {
    publicClient.get.mockResolvedValue({ data })
    const user = renderSelector()

    await user.click(
      screen.getByRole('button', {
        name: 'Select demo groups, groups or sensors',
      }),
    )

    expect(
      await screen.findByText('Unable to load demo groups.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('No demo groups yet.')).not.toBeInTheDocument()
  })

  it('treats an empty array as a successful response', async () => {
    publicClient.get.mockResolvedValue({ data: [] })
    const user = renderSelector()

    await user.click(
      screen.getByRole('button', {
        name: 'Select demo groups, groups or sensors',
      }),
    )

    expect(await screen.findByText('No demo groups yet.')).toBeInTheDocument()
    expect(
      screen.queryByText('Unable to load demo groups.'),
    ).not.toBeInTheDocument()
  })

  it('loads and selects a demo group from a valid response', async () => {
    publicClient.get.mockResolvedValue({
      data: [{ uuid: 'demo-1', name: 'Greenhouse demo' }],
    })
    const user = renderSelector()

    await user.click(
      screen.getByRole('button', {
        name: 'Select demo groups, groups or sensors',
      }),
    )
    await user.click(await screen.findByText('Greenhouse demo'))

    expect(screen.getByTestId('location-search')).toHaveTextContent(
      '?demo=demo-1',
    )
  })
})
