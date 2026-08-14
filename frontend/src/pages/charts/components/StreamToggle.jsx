import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import PropTypes from 'prop-types'

export default function StreamToggle({ isStreaming, onToggle }) {
  const handleChange = (_event, value) => {
    if (value !== null) onToggle(value === 'live')
  }

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={isStreaming ? 'live' : 'hourly'}
      onChange={handleChange}
      aria-label="chart data mode"
      sx={{
        borderRadius: 9999,
        backgroundColor: '#fff',
        border: '1px solid',
        borderColor: 'primary.main',
        overflow: 'hidden',
        '& .MuiToggleButtonGroup-grouped': {
          border: 0,
          borderRadius: 9999,
          px: 2,
          py: 1,
          minWidth: 76,
          textTransform: 'none',
          fontWeight: 600,
        },
        '& .Mui-selected': {
          backgroundColor: 'rgb(255 214 11 / 50%) !important',
          color: '#000 !important',
          fontWeight: 700,
        },
      }}
    >
      <ToggleButton value="hourly">Hourly</ToggleButton>
      <ToggleButton value="live">Live</ToggleButton>
    </ToggleButtonGroup>
  )
}

StreamToggle.propTypes = {
  isStreaming: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
}
