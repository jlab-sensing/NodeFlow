import { Box, Button, TextField, Typography } from "@mui/material";
import { useState } from "react";
import TopNav from "../../../components/TopNav";
import ActivationPrefSection from "./ActivationPrefSection";
import NotificationPrefSection from "./NotificationPrefSection";
import SensorSection from "./SensorSection";
import SolenoidSection from "./SolenoidSection";

function GroupForm({ mode, initialValues, onSubmit, submitting, error }) {
  const [formData, setFormData] = useState(initialValues);
  const isEditing = mode === "edit";

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(formData);
  };

  const handleSensorSelectionChange = (newSelection) => {
    setFormData((current) => {
      const selectedSensorIds = typeof newSelection === "function"
        ? newSelection(current.selectedSensorIds)
        : newSelection;
      const selectedPreferenceSensorId = current.activationPreference.sensorId;
      const selectedPreferenceStillExists = selectedPreferenceSensorId
        && selectedSensorIds.includes(Number(selectedPreferenceSensorId));

      return {
        ...current,
        selectedSensorIds,
        activationPreference: selectedPreferenceStillExists
          ? current.activationPreference
          : {
              ...current.activationPreference,
              sensorId: "",
              measurement: "",
            },
      };
    });
  };

  return (
    <>
      <TopNav />
      <Box component="main" sx={{ minHeight: "calc(100vh - 72px)", width: "100%", display: "flex", justifyContent: "center", backgroundColor: "#FFFFFF", px: 3, py: 4 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%", maxWidth: 1000, display: "flex", flexDirection: "column", gap: 2, backgroundColor: "#D9D9D9", border: "1px solid #777777", borderRadius: "14px", px: 4, py: 3 }}>
          <Typography variant="h5" sx={{ textAlign: { xs: "left", sm: "center" }, color: "#1E3A5F", fontWeight: "bold", fontSize: 48 }}>
            {isEditing ? "Edit Group" : "Add Group"}
          </Typography>

          <TextField
            fullWidth
            required
            label="Group Name"
            value={formData.name}
            onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
            sx={{ backgroundColor: "#FFFFFF" }}
          />

          <SolenoidSection
            selectedIds={formData.selectedSolenoidIds}
            onSelectionChange={(newSelection) => setFormData((current) => ({
              ...current,
              selectedSolenoidIds: typeof newSelection === "function"
                ? newSelection(current.selectedSolenoidIds)
                : newSelection,
            }))}
          />

          <SensorSection
            selectedIds={formData.selectedSensorIds}
            onSelectionChange={handleSensorSelectionChange}
          />

          <ActivationPrefSection 
            selectedSensorIds={formData.selectedSensorIds}
            value={formData.activationPreference}
            onChange={(activationPreference) =>
              setFormData((current) => ({
                ...current,
                activationPreference,
              }))
            }
          />
          <NotificationPrefSection />

          {error && <Typography color="error" textAlign="center">{error}</Typography>}

          <Button type="submit" variant="contained" disabled={submitting || !formData.name.trim()} sx={{ alignSelf: "center", width: 280, borderRadius: "999px", textTransform: "none", fontSize: 20, backgroundColor: "#2AB0EE" }}>
            {submitting ? "Saving..." : isEditing ? "Save Changes" : "Create"}
          </Button>
        </Box>
      </Box>
    </>
  );
}

export default GroupForm;
