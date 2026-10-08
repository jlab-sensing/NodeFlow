const sensorTypeLabels = {
  yfs210c: 'Flowmeter YFS210C (L/min)',
  d10: 'Flowmeter D10 (G/min)',
}

export const formatSensorType = (sensorType) => {
  if (!sensorType) return '-'

  return (
    sensorTypeLabels[sensorType.toLowerCase()] ??
    sensorType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  )
}
