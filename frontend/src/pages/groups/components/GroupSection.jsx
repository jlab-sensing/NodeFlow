import { Box, Typography } from '@mui/material'

function GroupSection({ title, children }) {
  return (
    <Box>
        <Box>
        <Typography
            variant='h6'
            sx={{
                border:'1px solid #777',
                borderRadius: '6px',
                backgroundColor: '#747474',
                textAlign: 'center',
                fontSize: 24,
                fontWeight: 700,
                color: '#ffffff',
                py: 1,
            }}
        >
            {title}
        </Typography>
        </Box>
      <Box>{children}</Box>
    </Box>
  );
}

export default GroupSection;