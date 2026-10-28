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
import { SOLENOID_PIN_OPTIONS } from '../../../src/utils/solenoidPins'

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
  physicalPin: 16,
}

async function chooseOption(user, label, option) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('hardware modal solenoid pins', () => {
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

  it('requires an actuator pin, submits it as a number, and resets after adding', async () => {
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

    expect(
      screen.queryByRole('combobox', { name: /Physical Pin/ }),
    ).not.toBeInTheDocument()
    await chooseOption(user, /Category/, 'Actuator')
    await user.type(
      screen.getByRole('textbox', { name: /Hardware Name/ }),
      'Valve',
    )
    await chooseOption(user, /Logger/, 'Greenhouse Board')

    const addButton = screen.getByRole('button', { name: 'Add Hardware' })
    expect(addButton).toBeEnabled()
    await user.click(addButton)
    expect(createMutation.mutateAsync).not.toHaveBeenCalled()

    await user.click(screen.getByRole('combobox', { name: /Physical Pin/ }))
    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual(SOLENOID_PIN_OPTIONS.map((pin) => `Pin ${pin}`))
    await user.click(
      screen.getByRole('option', { name: 'Pin 16', exact: true }),
    )
    await user.click(addButton)

    expect(createMutation.mutateAsync).toHaveBeenCalledWith({
      hardwareType: 'actuator',
      name: 'Valve',
      loggerId: 123,
      groupId: null,
      sensorType: undefined,
      physicalPin: 16,
    })
    expect(onClose).toHaveBeenCalledOnce()
    await chooseOption(user, /Category/, 'Actuator')
    expect(
      screen.getByRole('combobox', { name: /Physical Pin/ }),
    ).not.toHaveTextContent(/Pin \d/)
  })

  it('clears the selected pin when switching categories and omits it from sensors', async () => {
    const user = userEvent.setup()
    render(
      <AddHardwareModal open onClose={vi.fn()} loggers={loggers} groups={[]} />,
    )
    await chooseOption(user, /Category/, 'Actuator')
    await chooseOption(user, /Physical Pin/, 'Pin 18')
    await chooseOption(user, /Category/, 'Sensor')
    await chooseOption(user, /Category/, 'Actuator')
    expect(
      screen.getByRole('combobox', { name: /Physical Pin/ }),
    ).not.toHaveTextContent(/Pin \d/)
    await chooseOption(user, /Category/, 'Sensor')
    await user.type(
      screen.getByRole('textbox', { name: /Hardware Name/ }),
      'Soil Sensor',
    )
    await chooseOption(user, /Logger/, 'Greenhouse Board')
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

  it('preselects a saved pin and saves a changed pin', async () => {
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
      screen.getByRole('combobox', { name: /Physical Pin/ }),
    ).toHaveTextContent('Pin 16')
    await chooseOption(user, /Physical Pin/, 'Pin 22')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
      hardwareType: 'actuator',
      backendId: 9,
      name: 'Greenhouse Valve',
      loggerId: 123,
      groupId: null,
      sensorType: undefined,
      physicalPin: 22,
    })
  })

  it('requires a new pin after changing an actuator logger', async () => {
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
    expect(
      screen.getByRole('combobox', { name: /Physical Pin/ }),
    ).not.toHaveTextContent(/Pin \d/)
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(updateMutation.mutateAsync).not.toHaveBeenCalled()
    await chooseOption(user, /Physical Pin/, 'Pin 3')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(updateMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ loggerId: 456, physicalPin: 3 }),
    )
  })

  it('leaves legacy unconfigured pins empty until one is selected', async () => {
    const user = userEvent.setup()
    render(
      <EditHardwareModal
        open
        onClose={vi.fn()}
        hardware={{ ...actuator, physicalPin: null }}
        loggers={loggers}
        groups={[]}
      />,
    )

    expect(
      screen.getByRole('combobox', { name: /Physical Pin/ }),
    ).not.toHaveTextContent(/Pin \d/)
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(updateMutation.mutateAsync).not.toHaveBeenCalled()
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
