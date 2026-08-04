CHART_CONFIGS: dict[str, dict[str, object]] = {
    "power_voltage": {
        "sensor_name": "POWER_VOLTAGE",
        "measurements": ["Voltage"],
        "units": ["V"],
        "axisIds": ["y"],
        "chartId": "powerVoltage",
    },
    "power_current": {
        "sensor_name": "POWER_CURRENT",
        "measurements": ["Current"],
        "units": ["A"],
        "axisIds": ["y"],
        "chartId": "powerCurrent",
    },
    "teros12_vwc": {
        "sensor_name": "TEROS12_VWC",
        "measurements": ["Volumetric Water Content (Raw)"],
        "units": ["raw"],
        "axisIds": ["y"],
        "chartId": "teros12VWC",
    },
    "teros12_vwc_adj": {
        "sensor_name": "TEROS12_VWC_ADJ",
        "measurements": ["Volumetric Water Content"],
        "units": ["%"],
        "axisIds": ["y"],
        "axisPolicy": "vwcPercent",
        "chartId": "teros12VWCADJ",
    },
    "teros12_temp": {
        "sensor_name": "TEROS12_TEMP",
        "measurements": ["Temperature"],
        "units": ["°C"],
        "axisIds": ["y"],
        "chartId": "teros12Temp",
    },
    "teros12_ec": {
        "sensor_name": "TEROS12_EC",
        "measurements": ["Electrical Conductivity"],
        "units": ["µS/cm"],
        "axisIds": ["y"],
        "chartId": "teros12EC",
    },
    "temperature": {
        "sensor_name": "bme280",
        "measurements": ["temperature"],
        "units": ["°C"],
        "axisIds": ["y"],
        "chartId": "bme280",
    },
    "bme280Temperature": {
        "sensor_name": "bme280",
        "measurements": ["Temperature"],
        "units": ["°C"],
        "axisIds": ["y"],
        "chartId": "bme280temp",
    },
    "co2": {
        "sensor_name": "co2",
        "measurements": ["co2"],
        "units": ["ppm"],
        "axisIds": ["y"],
        "chartId": "co2",
    },
    "presHum": {
        "sensor_name": "bme280",
        "measurements": ["pressure", "humidity"],
        "units": ["kPa", "%"],
        "axisIds": ["pressureAxis", "humidityAxis"],
        "chartId": "presHum",
    },
    "bme280Pressure": {
        "sensor_name": "bme280",
        "measurements": ["pressure"],
        "units": ["kPa"],
        "axisIds": ["y"],
        "chartId": "bme280pressure",
    },
    "bme280Humidity": {
        "sensor_name": "bme280",
        "measurements": ["Humidity"],
        "units": ["%"],
        "axisIds": ["humidityAxis"],
        "chartId": "bme280humidity",
    },
    "sensor": {
        "sensor_name": "phytos31",
        "measurements": ["dielectric_permittivity"],
        "units": ["1 (unitless)"],
        "axisIds": ["y"],
        "chartId": "sensor",
    },
    "soilPot": {
        "sensor_name": "teros21",
        "measurements": ["soil_water_potential"],
        "units": ["kPa"],
        "axisIds": ["y"],
        "chartId": "soilPot",
    },
    "soilHum": {
        "sensor_name": "sen0308",
        "measurements": ["humidity"],
        "units": ["%"],
        "axisIds": ["y"],
        "chartId": "soilHum",
    },
    "waterPress": {
        "sensor_name": "sen0257",
        "measurements": ["pressure"],
        "units": ["kPa"],
        "axisIds": ["y"],
        "chartId": "waterPress",
    },
    "waterFlow": {
        "sensor_name": "yfs210c",
        "measurements": ["flow"],
        "units": ["L/Min"],
        "axisIds": ["y"],
        "chartId": "waterFlow",
    },
    "waterFlowD10": {
        "sensor_name": "D10",
        "measurements": ["flow"],
        "units": ["G/Min"],
        "axisIds": ["y"],
        "chartId": "waterFlow",
    },
}


PANEL_IDS_BY_CONFIG_KEY = {
    "power_voltage": ["power-vi", "power-p"],
    "power_current": ["power-vi", "power-p"],
    "teros12_vwc": ["teros"],
    "teros12_vwc_adj": ["teros"],
    "teros12_temp": ["temp"],
    "teros12_ec": ["teros"],
    "temperature": ["u:temperature"],
    "bme280Temperature": ["u:temperature"],
    "co2": ["u:co2"],
    "presHum": ["u:presHum"],
    "bme280Pressure": ["u:bme280Pressure"],
    "bme280Humidity": ["u:presHum"],
    "sensor": ["u:sensor"],
    "soilPot": ["u:soilPot"],
    "soilHum": ["u:soilHum"],
    "waterPress": ["u:waterPress"],
    "waterFlow": ["u:waterFlow"],
    "waterFlowD10": ["u:waterFlow"],
}


SENSOR_TYPE_CONFIG_KEYS = {
    "soil_moisture": ["teros12_vwc_adj"],
    "teros": ["teros12_vwc_adj", "teros12_temp", "teros12_ec"],
    "conductivity": ["teros12_ec"],
    "temperature": ["temperature"],
}


NATIVE_MEASUREMENT_ALIASES = {
    "soil_moisture": {
        "vwc": "Volumetric Water Content",
        "volumetric water content": "Volumetric Water Content",
    },
    "temperature": {
        "temperature": "temperature",
    },
}


def get_sensor_config_keys(sensor_type: str) -> list[str]:
    config_keys = SENSOR_TYPE_CONFIG_KEYS.get(sensor_type)

    if config_keys is None and sensor_type in CHART_CONFIGS:
        config_keys = [sensor_type]

    if config_keys is None:
        normalized_type = sensor_type.casefold()
        config_keys = [
            key
            for key, config in CHART_CONFIGS.items()
            if str(config["sensor_name"]).casefold() == normalized_type
        ]

    return config_keys


def get_sensor_capabilities(sensor_type: str) -> dict[str, list[str]]:
    config_keys = get_sensor_config_keys(sensor_type)

    measurements = []
    panel_ids = []

    for key in config_keys:
        config = CHART_CONFIGS[key]

        for measurement in config["measurements"]:
            if measurement not in measurements:
                measurements.append(measurement)

        for panel_id in PANEL_IDS_BY_CONFIG_KEY.get(key, []):
            if panel_id not in panel_ids:
                panel_ids.append(panel_id)

    return {
        "measurements": measurements,
        "panel_ids": panel_ids,
    }


def get_sensor_query_name(sensor_type: str, measurement: str) -> str | None:
    normalized_measurement = measurement.casefold()

    for key in get_sensor_config_keys(sensor_type):
        config = CHART_CONFIGS[key]
        if any(
            str(candidate).casefold() == normalized_measurement
            for candidate in config["measurements"]
        ):
            return str(config["sensor_name"])

    return None


def get_native_measurement_name(
    sensor_type: str,
    measurement: str,
) -> str | None:
    normalized_type = sensor_type.casefold()
    normalized_measurement = measurement.casefold()
    aliases = NATIVE_MEASUREMENT_ALIASES.get(normalized_type, {})

    if normalized_measurement in aliases:
        return aliases[normalized_measurement]

    capabilities = get_sensor_capabilities(sensor_type)
    for candidate in capabilities["measurements"]:
        if candidate.casefold() == normalized_measurement:
            return candidate

    return None
