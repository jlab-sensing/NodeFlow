import base64

SOLENOID_F_PORT = 4
SOLENOID_PROTOCOL_VERSION = 1

COMMANDS = {
    "closed": 0,
    "open": 1,
}


def encode_solenoid_command(desired_state: str) -> str:
    if desired_state not in COMMANDS:
        raise ValueError(f"Unsupported solenoid state: {desired_state}")

    payload = bytes(
        [
            SOLENOID_PROTOCOL_VERSION,
            COMMANDS[desired_state],
        ]
    )

    return base64.b64encode(payload).decode("ascii")
