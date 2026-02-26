import psutil

class NetworkMonitor:
    @staticmethod
    def get_active_connections():
        """Returns a list of active network connections."""
        connections = []
        for conn in psutil.net_connections(kind='inet'):
            try:
                # psutil.Process can fail if process terminated during iteration
                proc = psutil.Process(conn.pid) if conn.pid else None
                name = proc.name() if proc else "N/A"
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                name = "Access Denied"
                
            laddr = f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else "N/A"
            raddr = f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else "N/A"
            
            connections.append({
                "pid": conn.pid or 0,
                "process": name,
                "local": laddr,
                "remote": raddr,
                "status": conn.status
            })
        return connections
