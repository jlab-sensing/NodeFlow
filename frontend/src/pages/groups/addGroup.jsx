import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAxiosPrivate from '../../auth/hooks/useAxiosPrivate'
import GroupForm from './components/GroupForm'

const emptyGroupConfig = {
  name: '',
  selectedSolenoidIds: [],
  selectedSensorIds: [],

  activationPreference: {
    sensorId: '',
    measurement: '',
    conditionOperator: '<',
    conditionValue: '',
    closeConditionOperator: '>',
    closeConditionValue: '',
    enabled: true,
  },
}

function AddGroup() {
  const axiosPrivate = useAxiosPrivate()
  const navigate = useNavigate()

  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (formData) => {
    try {
      setCreating(true)
      setError('')

      const groupResponse = await axiosPrivate.post('/api/groups/', {
        name: formData.name.trim(),
      })
      const groupId = groupResponse.data.uuid

      await Promise.all([
        ...formData.selectedSolenoidIds.map((id) =>
          axiosPrivate.put(`/api/solenoid/${id}/group`, {
            group_id: groupId,
          }),
        ),
        ...formData.selectedSensorIds.map((id) =>
          axiosPrivate.put(`/api/sensor/${id}/group`, {
            group_id: groupId,
          }),
        ),
      ])

      const preference = formData.activationPreference
      const hasCloseCondition = preference.closeConditionValue !== ''
      if (
        preference.sensorId &&
        preference.measurement &&
        preference.conditionValue !== ''
      ) {
        await axiosPrivate.post(`/api/groups/${groupId}/activationPref/`, {
          sensor_id: Number(preference.sensorId),
          measurement: preference.measurement,
          condition_operator: preference.conditionOperator,
          condition_value: Number(preference.conditionValue),
          close_condition_operator: hasCloseCondition
            ? preference.closeConditionOperator
            : null,
          close_condition_value: hasCloseCondition
            ? Number(preference.closeConditionValue)
            : null,
          enabled: preference.enabled,
        })
      }

      navigate('/profile/groups')
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to create group')
    } finally {
      setCreating(false)
    }
  }

  return (
    <GroupForm
      mode="create"
      initialValues={emptyGroupConfig}
      onSubmit={handleCreate}
      submitting={creating}
      error={error}
    />
  )
}

export default AddGroup
