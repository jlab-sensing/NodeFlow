import AddIcon from '@mui/icons-material/Add'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import ViewStreamOutlinedIcon from '@mui/icons-material/ViewStreamOutlined'
import { Box, Button, Stack, Tooltip, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import PropTypes from 'prop-types'

const layoutIconButtonSx = (selected) => ({
  minWidth: 0,
  px: 1,
  color: 'primary.main',
  borderColor: 'primary.main',
  ...(selected && {
    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
  }),
  '&:hover': {
    borderColor: 'primary.main',
    bgcolor: (theme) =>
      selected
        ? alpha(theme.palette.primary.main, 0.12)
        : alpha(theme.palette.primary.main, 0.04),
  },
})

function ChartPanelActions({ onAddChart, panelColumns, onPanelColumnsChange }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: 2,
        pb: 1,
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Hover a chart for ≡ to reorder · × removes a panel
      </Typography>
      <Stack direction="row" spacing={1} sx={{alignItems:"center"}}>
        <Stack
          direction="row"
          spacing={0.5}
          role="group"
          aria-label="Panel column layout"
          sx={{alignItems: 'center' }}
        >
          <Tooltip title="Two columns" placement="bottom" disableInteractive>
            <Button
              variant="outlined"
              size="small"
              aria-label="Two column grid"
              aria-pressed={panelColumns === 2}
              onClick={() => onPanelColumnsChange(2)}
              sx={layoutIconButtonSx(panelColumns === 2)}
            >
              <GridViewOutlinedIcon sx={{ fontSize: 18, opacity: 0.85 }} />
            </Button>
          </Tooltip>
          <Tooltip
            title="Single column wide"
            placement="bottom"
            disableInteractive
          >
            <Button
              variant="outlined"
              size="small"
              aria-label="Single column wide"
              aria-pressed={panelColumns === 1}
              onClick={() => onPanelColumnsChange(1)}
              sx={layoutIconButtonSx(panelColumns === 1)}
            >
              <ViewStreamOutlinedIcon sx={{ fontSize: 18, opacity: 0.85 }} />
            </Button>
          </Tooltip>
        </Stack>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={onAddChart}
        >
          Add chart
        </Button>
      </Stack>
    </Box>
  )
}

ChartPanelActions.propTypes = {
  onAddChart: PropTypes.func.isRequired,
  panelColumns: PropTypes.oneOf([1, 2]).isRequired,
  onPanelColumnsChange: PropTypes.func.isRequired,
}

export default ChartPanelActions
