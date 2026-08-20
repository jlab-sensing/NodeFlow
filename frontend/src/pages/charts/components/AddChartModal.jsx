import CloseIcon from '@mui/icons-material/Close'
import {
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import PropTypes from 'prop-types'
import { useMemo } from 'react'
import { FULL_CATALOG } from '../catalog/chartsCatalog'

function AddChartModal({
  open,
  onClose,
  selectedSensors,
  panelOrder,
  onAddPanel,
}) {
  const availablePanelIds = useMemo(
    () => new Set(selectedSensors.flatMap((sensor) => sensor.panel_ids ?? [])),
    [selectedSensors],
  )
  const addableEntries = useMemo(
    () =>
      FULL_CATALOG.filter(
        (entry) =>
          availablePanelIds.has(entry.panelId) &&
          !panelOrder.includes(entry.panelId),
      ),
    [availablePanelIds, panelOrder],
  )

  const handleSelect = (panelId) => {
    onAddPanel(panelId)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        Add sensor chart
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pb: 1 }}>
          {addableEntries.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              All charts supported by the selected sensors are already
              displayed.
            </Typography>
          ) : (
            <List disablePadding>
              {addableEntries.map((entry) => (
                <ListItemButton
                  key={entry.panelId}
                  onClick={() => handleSelect(entry.panelId)}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={entry.label}
                    secondary={entry.description}
                    slotProps={{
                      primary: {
                        fontWeight: 600,
                      },
                    }}
                  />
                  <Chip
                    size="small"
                    label={entry.category}
                    sx={{ ml: 1, textTransform: 'capitalize' }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

AddChartModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedSensors: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      panel_ids: PropTypes.arrayOf(PropTypes.string),
    }),
  ).isRequired,
  panelOrder: PropTypes.arrayOf(PropTypes.string).isRequired,
  onAddPanel: PropTypes.func.isRequired,
}

export default AddChartModal
