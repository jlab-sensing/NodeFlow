import { useState } from 'react'

function usePrevious(value) {
  const [trackedValues, setTrackedValues] = useState({
    current: value,
    previous: undefined,
  })

  if (!Object.is(value, trackedValues.current)) {
    setTrackedValues({
      current: value,
      previous: trackedValues.current,
    })
  }

  return trackedValues.previous
}

export default usePrevious
