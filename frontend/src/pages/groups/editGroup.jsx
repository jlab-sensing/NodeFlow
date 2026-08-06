import { Box, CircularProgress, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useAxiosPrivate from '../../auth/hooks/useAxiosPrivate'
import GroupForm from './components/GroupForm'

const emptyActivationPreference = {
  sensorId: '',
  measurement: '',
  conditionOperator: '<',
  conditionValue: '',
  closeConditionOperator: '>',
  closeConditionValue: '',
  enabled: true,
}

function EditGroup() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const axiosPrivate = useAxiosPrivate()
  const originalDeviceIds = useRef({ solenoids: [], sensors: [] })
  const [initialValues, setInitialValues] = useState(null)
  const [loadingError, setLoadingError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    async function loadGroup() {
      try {
        const [groupResponse, devicesResponse, preferenceResponse] =
          await Promise.all([
            axiosPrivate.get(`/api/groups/${groupId}`),
            axiosPrivate.get(`/api/groups/${groupId}/devices`),
            axiosPrivate.get(`/api/groups/${groupId}/activationPref/`),
          ])
        if (!active) return

        const selectedSolenoidIds = devicesResponse.data.solenoids.map(
          (item) => item.id,
        )
        const selectedSensorIds = devicesResponse.data.sensors.map(
          (item) => item.id,
        )
        originalDeviceIds.current = {
          solenoids: selectedSolenoidIds,
          sensors: selectedSensorIds,
        }
        setInitialValues({
          name: groupResponse.data.name,
          selectedSolenoidIds,
          selectedSensorIds,
          activationPreference: preferenceResponse.data
            ? {
                sensorId: preferenceResponse.data.sensor_id,
                measurement: preferenceResponse.data.measurement,
                conditionOperator: preferenceResponse.data.condition_operator,
                conditionValue: String(preferenceResponse.data.condition_value),
                closeConditionOperator:
                  preferenceResponse.data.close_condition_operator ?? '>',
                closeConditionValue:
                  preferenceResponse.data.close_condition_value == null
                    ? ''
                    : String(preferenceResponse.data.close_condition_value),
                enabled: preferenceResponse.data.enabled,
              }
            : emptyActivationPreference,
        })
      } catch (requestError) {
        if (active) {
          setLoadingError(
            requestError.response?.data?.detail || 'Unable to load group',
          )
        }
      }
    }

    loadGroup()
    return () => {
      active = false
    }
  }, [axiosPrivate, groupId])

  const handleUpdate = async (formData) => {
    try {
      setSaving(true)
      setSaveError('')
      const original = originalDeviceIds.current
      const addedSolenoids = formData.selectedSolenoidIds.filter(
        (id) => !original.solenoids.includes(id),
      )
      const removedSolenoids = original.solenoids.filter(
        (id) => !formData.selectedSolenoidIds.includes(id),
      )
      const addedSensors = formData.selectedSensorIds.filter(
        (id) => !original.sensors.includes(id),
      )
      const removedSensors = original.sensors.filter(
        (id) => !formData.selectedSensorIds.includes(id),
      )

      await Promise.all([
        axiosPrivate.put(`/api/groups/${groupId}`, {
          name: formData.name.trim(),
        }),
        ...addedSolenoids.map((id) =>
          axiosPrivate.put(`/api/solenoid/${id}/group`, { group_id: groupId }),
        ),
        ...removedSolenoids.map((id) =>
          axiosPrivate.put(`/api/solenoid/${id}/group`, { group_id: null }),
        ),
        ...addedSensors.map((id) =>
          axiosPrivate.put(`/api/sensor/${id}/group`, { group_id: groupId }),
        ),
        ...removedSensors.map((id) =>
          axiosPrivate.put(`/api/sensor/${id}/group`, { group_id: null }),
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
      } else {
        await axiosPrivate.delete(`/api/groups/${groupId}/activationPref/`)
      }

      navigate('/profile/groups')
    } catch (requestError) {
      setSaveError(
        requestError.response?.data?.detail || 'Unable to update group',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loadingError) {
    return (
      <Typography color="error" sx={{ p: 4, textAlign: 'center' }}>
        {loadingError}
      </Typography>
    )
  }

  if (!initialValues) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <GroupForm
      mode="edit"
      initialValues={initialValues}
      onSubmit={handleUpdate}
      submitting={saving}
      error={saveError}
    />
  )
}

export default EditGroup
