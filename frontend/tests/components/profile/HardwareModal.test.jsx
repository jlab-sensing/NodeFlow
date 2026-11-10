import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AddHardwareModal from '../../../src/pages/profile/components/AddHardwareModal'
import EditHardwareModal from '../../../src/pages/profile/components/EditHardwareModal'
import {
  useCreateHardware,
  useSensorTypes,
  useUpdateHardware,
} from '../../../src/services/hardware'

vi.mock('../../../src/auth/hooks/useAxiosPrivate', () => ({
  default: () => ({}),
}))

vi.mock('../../../src/services/hardware', async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateHardware: vi.fn(),
  useUpdateHardware: vi.fn(),
  useSensorTypes: vi.fn(),
}))

const loggers = [
  { logger_id: 123, name: 'Greenhouse Board' },
  { logger_id: 456, name: 'Garden Board' },
]
const actuator = {
  backendId: 9,
  hardwareType: 'actuator',
  name: 'Greenhouse Valve',
  loggerId: 123,
}

async function chooseOption(user, label, option) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('hardware modals', () => {
  let createMutation
  let updateMutation

  beforeEach(() => {
    createMutation = {
      mutateAsync: vi.fn().mockResolvedValue({}),
      reset: vi.fn(),
      isPending: false,
      isError: false,
    }
    updateMutation = {
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      isError: false,
    }
    useCreateHardware.mockReturnValue(createMutation)
    useUpdateHardware.mockReturnValue(updateMutation)
    useSensorTypes.mockReturnValue({
      data: ['soil_moisture'],
      isLoading: false,
      isError: false,
    })
  })

  it('creates an actuator without a pin while sensor types load and resets after adding', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    useSensorTypes.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    })
    render(
      <AddHardwareModal open onClose={onClose} loggers={loggers} groups={[]} />,
    )

    await chooseOption(user, /Category/, 'Actuator')
    expect(
      screen.queryByRole('combobox', { name: /Physical Pin/ }),
    ).not.toBeInTheDocument()
    await user.type(
      screen.getByRole('textbox', { name: /Hardware Name/ }),
      'Valve',
    )
    await chooseOption(user, /Logger/, 'Greenhouse Board')

    const addButton = screen.getByRole('button', { name: 'Add Hardware' })
    expect(addButton).toBeEnabled()
    await user.click(addButton)

    expect(createMutation.mutateAsync).toHaveBeenCalledWith({
      hardwareType: 'actuator',
      name: 'Valve',
      loggerId: 123,
      groupId: null,
      sensorType: undefined,
    })
    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.getByRole('textbox', { name: /Hardware Name/ })).toHaveValue(
      '',
    )
    expect(
      screen.getByRole('combobox', { name: /Category/ }),
    ).toHaveTextContent('Sensor')
    expect(
      screen.getByRole('combobox', { name: /Logger/ }),
    ).not.toHaveTextContent('Greenhouse Board')
    expect(createMutation.reset).toHaveBeenCalledOnce()
  })

  it('still requires a name and logger when adding an actuator', async () => {
    const user = userEvent.setup()
    render(
      <AddHardwareModal open onClose={vi.fn()} loggers={loggers} groups={[]} />,
    )
    await chooseOption(user, /Category/, 'Actuator')
    const nameInput = screen.getByRole('textbox', { name: /Hardware Name/ })
    await user.type(nameInput, 'Valve')
    await user.click(screen.getByRole('button', { name: 'Add Hardware' }))
    expect(createMutation.mutateAsync).not.toHaveBeenCalled()

    await chooseOption(user, /Logger/, 'Greenhouse Board')
    await user.clear(nameInput)
    await user.type(nameInput, '   ')
    await user.click(screen.getByRole('button', { name: 'Add Hardware' }))
    expect(createMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('requires a sensor type again after switching categories and creates a sensor', async () => {
    const user = userEvent.setup()
    render(
      <AddHardwareModal open onClose={vi.fn()} loggers={loggers} groups={[]} />,
    )
    await chooseOption(user, /Sensor Type/, 'Soil Moisture')
    await chooseOption(user, /Category/, 'Actuator')
    expect(
      screen.queryByRole('combobox', { name: /Sensor Type/ }),
    ).not.toBeInTheDocument()
    await chooseOption(user, /Category/, 'Sensor')
    expect(
      screen.getByRole('combobox', { name: /Sensor Type/ }),
    ).not.toHaveTextContent('Soil Moisture')
    await user.type(
      screen.getByRole('textbox', { name: /Hardware Name/ }),
      'Soil Sensor',
    )
    await chooseOption(user, /Logger/, 'Greenhouse Board')
    await user.click(screen.getByRole('button', { name: 'Add Hardware' }))
    expect(createMutation.mutateAsync).not.toHaveBeenCalled()
    await chooseOption(user, /Sensor Type/, 'Soil Moisture')
    await user.click(screen.getByRole('button', { name: 'Add Hardware' }))

    expect(createMutation.mutateAsync).toHaveBeenCalledWith({
      hardwareType: 'sensor',
      name: 'Soil Sensor',
      loggerId: 123,
      groupId: null,
      sensorType: 'soil_moisture',
    })
  })

  it('edits an actuator without displaying or submitting a pin', async () => {
    const user = userEvent.setup()
    render(
      <EditHardwareModal
        open
        onClose={vi.fn()}
        hardware={actuator}
        loggers={loggers}
        groups={[]}
      />,
    )

    expect(
      screen.queryByRole('combobox', { name: /Physical Pin/ }),
    ).not.toBeInTheDocument()
    const nameInput = screen.getByRole('textbox', { name: /Hardware Name/ })
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Valve')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
      hardwareType: 'actuator',
      backendId: 9,
      name: 'Updated Valve',
      loggerId: 123,
      groupId: null,
      sensorType: undefined,
    })
  })

  it('changes an actuator logger without requiring a pin', async () => {
    const user = userEvent.setup()
    render(
      <EditHardwareModal
        open
        onClose={vi.fn()}
        hardware={actuator}
        loggers={loggers}
        groups={[]}
      />,
    )

    await chooseOption(user, /Logger/, 'Garden Board')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
      hardwareType: 'actuator',
      backendId: 9,
      name: 'Greenhouse Valve',
      loggerId: 456,
      groupId: null,
      sensorType: undefined,
    })
  })

  it('edits sensors without displaying or submitting a pin', async () => {
    const user = userEvent.setup()
    render(
      <EditHardwareModal
        open
        onClose={vi.fn()}
        hardware={{
          backendId: 12,
          hardwareType: 'sensor',
          name: 'Soil Sensor',
          loggerId: 123,
          subtype: 'soil_moisture',
        }}
        loggers={loggers}
        groups={[]}
      />,
    )

    expect(
      screen.queryByRole('combobox', { name: /Physical Pin/ }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
      hardwareType: 'sensor',
      backendId: 12,
      name: 'Soil Sensor',
      loggerId: 123,
      groupId: null,
      sensorType: 'soil_moisture',
    })
  })
})
