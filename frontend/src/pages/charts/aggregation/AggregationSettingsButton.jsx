import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { IconButton, Tooltip } from '@mui/material'
import { useChartAggregation } from './ChartAggregationContext'

export default function AggregationSettingsButton() {
    const aggregation = useChartAggregation()
    if (!aggregation) return null

    return (
        <Tooltip
            title="Aggregation settings"
            placement='bottom'
            disableInteractive
        >
            <IconButton
            aria-label='Aggregation settings'
            onClick={aggregation.openSettings}
            sx={{
                width: 32,
                height: 32,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
            }}
        >
            <SettingsOutlinedIcon sx={{ fontSize: 18 }}/>
        </IconButton>
        </Tooltip>
    )
}