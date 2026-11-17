import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'

export default function AggregationSettingsModal({
  template,
  checkedIds,
  onClose,
  onToggle,
}) {
  const checked = new Set(checkedIds)

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="aggregation-settings-title"
    >
      <Box
        sx={{
          backgroundColor: '#1E3A5F',
          px: 3,
          py: 2.5,
          position: 'relative',
        }}
      >
        <IconButton
          aria-label="Close aggregation settings"
          onClick={onClose}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Typography
          id="aggregation-settings-title"
          component="h2"
          variant="h5"
          sx={{ color: 'white', fontWeight: 600, pr: 4 }}
        >
          Aggregation settings
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255, 255, 255, 0.8)',
            mt: 0.5,
          }}
        >
          {template.label}
        </Typography>
      </Box>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Choose the lines displayed together in this chart.
          </Typography>

          {template.series.map((series) => (
            <FormControlLabel
              key={series.id}
              sx={{ m: 0 }}
              control={
                <Checkbox
                  checked={checked.has(series.id)}
                  onChange={(_, include) =>
                    onToggle(series.id, include)
                  }
                />
              }
              label={series.label}
            />
          ))}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}