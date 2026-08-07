import { forwardRef, useEffect, useRef, useState } from 'react'
import HorizontalRuleRoundedIcon from '@mui/icons-material/HorizontalRuleRounded'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import {
  Box,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import useControlled from '@mui/utils/useControlled'
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon'
import PropTypes from 'prop-types'

const MobileDateField = forwardRef(function MobileDateField(
  { onOpen, ariaLabel },
  ref,
) {
  return (
    <IconButton
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      size="small"
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 0.5,
      }}
    >
      <CalendarMonthIcon fontSize="small" />
    </IconButton>
  )
})

MobileDateField.propTypes = {
  onOpen: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string.isRequired,
}

function DateTimePickerWithAccept({
  value: valueProp,
  onAccept,
  ...otherProps
}) {
  const timeoutRef = useRef(null)

  const [value, setValue] = useControlled({
    name: 'FieldAcceptValue',
    state: 'value',
    controlled: valueProp,
    default: null,
  })

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleChange = (newValue) => {
    setValue(newValue)

    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      onAccept(newValue)
    }, 1000)
  }

  return (
    <DateTimePicker {...otherProps} value={value} onChange={handleChange} />
  )
}

DateTimePickerWithAccept.propTypes = {
  value: PropTypes.any,
  onAccept: PropTypes.func.isRequired,
}

function DateRangeSel({ startDate, endDate, setStartDate, setEndDate }) {
  const theme = useTheme()
  const showFullPicker = useMediaQuery(theme.breakpoints.up('md'))
  const [startOpen, setStartOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)

  if (!showFullPicker) {
    return (
      <LocalizationProvider dateAdapter={AdapterLuxon}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              Start
            </Typography>

            <DateTimePicker
              value={startDate}
              open={startOpen}
              onOpen={() => setStartOpen(true)}
              onClose={() => setStartOpen(false)}
              onChange={setStartDate}
              views={['year', 'month', 'day', 'hours']}
              slots={{
                field: MobileDateField,
              }}
              slotProps={{
                field: {
                  onOpen: () => setStartOpen(true),
                  ariaLabel: 'Open start date picker',
                },
              }}
            />

            <Typography
              variant="caption"
              sx={{ fontSize: '0.65rem', display: 'block ' }}
            >
              {startDate.toFormat('MM/dd')}
            </Typography>
          </Box>

          <HorizontalRuleRoundedIcon sx={{ fontSize: 'small' }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              End
            </Typography>

            <DateTimePicker
              value={endDate}
              open={endOpen}
              onOpen={() => setEndOpen(true)}
              onClose={() => setEndOpen(false)}
              onChange={setEndDate}
              views={['year', 'month', 'day', 'hours']}
              slots={{
                field: MobileDateField,
              }}
              slotProps={{
                field: {
                  onOpen: () => setEndOpen(true),
                  ariaLabel: 'Open end date picker',
                },
              }}
            />

            <Typography
              variant="caption"
              sx={{ fontSize: '0.65rem', display: 'block' }}
            >
              {endDate.toFormat('MM/dd')}
            </Typography>
          </Box>
        </Box>
      </LocalizationProvider>
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterLuxon}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <DateTimePickerWithAccept
          label="Start Date"
          value={startDate}
          onAccept={setStartDate}
          views={['year', 'month', 'day', 'hours']}
          format="MM/dd HH:mm"
          slotProps={{
            textField: {
              size: 'small',
              sx: {
                width: '160px',
                '& .MuiInputBase-input': {
                  fontSize: '0.875rem',
                },
              },
            },
          }}
        />

        <HorizontalRuleRoundedIcon />

        <DateTimePickerWithAccept
          label="End Date"
          value={endDate}
          onAccept={setEndDate}
          views={['year', 'month', 'day', 'hours']}
          format="MM/dd HH:mm"
          slotProps={{
            textField: {
              size: 'small',
              sx: {
                width: '160px',
                '& .MuiInputBase-input': {
                  fontSize: '0.875rem',
                },
              },
            },
          }}
        />
      </Box>
    </LocalizationProvider>
  )
}

DateRangeSel.propTypes = {
  startDate: PropTypes.any,
  endDate: PropTypes.any,
  setStartDate: PropTypes.func.isRequired,
  setEndDate: PropTypes.func.isRequired,
}

export default DateRangeSel
