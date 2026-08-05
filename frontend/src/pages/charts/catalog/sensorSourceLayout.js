export function availablePanelIdsForSensors(sensors) {
    return new Set(
        sensors.flatMap((sensor) => sensor.panel_ids ?? []),
    );
}

export function defaultPanelOrderForSensors(
    sensors,
    catalogOrder,
) {
    const available = availablePanelIdsForSensors(sensors);

    return catalogOrder.filter((panelId) =>
        available.has(panelId),
    );
}

export function panelsMissingForSensors(
    panelOrder,
    availablePanelIds,
) {
    return panelOrder.filter(
        (panelId) => !availablePanelIds.has(panelId),
    );
}