import psutil
import socket

class PortScanner:
    RISKY_PORTS = {
        21: "FTP (Plaintext)",
        23: "Telnet (Plaintext)",
        445: "SMB (Often targeted)",
        135: "RPC",
        3389: "RDP (Remote Desktop)",
        5900: "VNC"
    }

    @staticmethod
    def get_listening_ports():
        """List listening ports on localhost only."""
        listening = []
        for conn in psutil.net_connections(kind='inet'):
            if conn.status == 'LISTEN' and (conn.laddr.ip == '127.0.0.1' or conn.laddr.ip == '0.0.0.0'):
                port = conn.laddr.port
                listening.append({
                    "port": port,
                    "ip": conn.laddr.ip,
                    "type": "TCP" if conn.type == socket.SOCK_STREAM else "UDP",
                    "pid": conn.pid,
                    "risk": PortScanner.RISKY_PORTS.get(port, "Low / Standard")
                })
        return listening
