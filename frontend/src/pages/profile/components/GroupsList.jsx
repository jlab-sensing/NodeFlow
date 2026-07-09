import { Box, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useOutletContext } from 'react-router-dom';
import { React, useState } from 'react';

function GroupsList() {
  let data = useOutletContext();
  const isLoading = data[12];
  const isError = data[13];
  const user = data[4];
  data = data[11];
  const [selectedRowsId, setSelectedRowsId] = useState([]);

  if (!user) {
    return <></>;
  }
  if (data === null) {
    return;
  }
  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }
  if (isError) {
    return <Typography>Error loading groups.</Typography>;
  }

  const columns = [
    { field: 'id', headerName: 'Group ID', width: 90 },
    { field: 'name', headerName: 'Name', width: 150 },
  ];

  let rows = [];
  if (data.map) {
    rows = data.map((group) => ({
      id: group.id,
      name: group.name,
      
    }));
  }

  const handleRowSelection = (newSelection) => {
    setSelectedRowsId(newSelection);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#A0A0A0',
        width: { xs: '100%', sm: '95%', md: '90%' },
        maxWidth: '1400px',
        minHeight: { xs: 'calc(100vh - 80px)', md: '100vh' },
        p: { xs: 1, sm: 1.5, md: 2 },
        borderRadius: '10px',
        flexGrow: 1,
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          bgcolor: '#A0A0A0',
          p: 1,
          justifyContent: 'space-between',
          gap: { xs: 1, sm: 0 },
        }}
      >
        <Typography
          variant='h5'
          sx={{
            textAlign: { xs: 'left', sm: 'center' },
            color: '#1E3A5F',
            fontWeight: 'bold',
            flex: { xs: 'unset', sm: 1 },
            marginRight: { xs: 0, sm: '-8.5%' },
            mb: { xs: 1, sm: 0 },
          }}
        >
          Your Groups
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
        </Box>
      </Box>

      {/* Wrapper to ensure DataGrid does not exceed background */}
      <Box
        sx={{
          flexGrow: 1,
          height: '100%',
          overflowX: 'auto',
          overflowY: 'auto',
          width: '100%',
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={5}
          checkboxSelection={true}
          autoHeight
          onRowSelectionModelChange={handleRowSelection}
          sx={{
            minWidth: { xs: '600px', sm: 'unset' },
          }}
        />
      </Box>
    </Box>
  );
}

export default GroupsList;
