import React, { useState, useEffect, useRef } from "react";
import {
  Radio,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Download,
  Activity,
  Monitor,
  Wifi,
  Database,
} from "lucide-react";
import api from "../services/api";

export default function RealTimeMonitorPage() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [monitorAllDevices, setMonitorAllDevices] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [realtimeLogs, setRealtimeLogs] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [backgroundMonitoring, setBackgroundMonitoring] = useState({
    isRunning: false,
    devicesCount: 0,
    status: null,
  });
  const [backgroundLogs, setBackgroundLogs] = useState([]);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    fetchDevices();
    fetchBackgroundMonitoringStatus();

    // Poll background monitoring status every 10 seconds
    const statusInterval = setInterval(fetchBackgroundMonitoringStatus, 10000);

    return () => {
      stopMonitoring();
      clearInterval(statusInterval);
    };
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await api.get("/devices");
      setDevices(response.data || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  // Background Monitoring Functions
  const fetchBackgroundMonitoringStatus = async () => {
    try {
      const response = await api.get("/attendance/background-monitor/status");
      setBackgroundMonitoring(response.data);

      // If background monitoring is running, fetch recent logs
      if (response.data.isRunning) {
        fetchRecentBackgroundLogs();
      }
    } catch (error) {
      console.error("Error fetching background monitoring status:", error);
    }
  };

  const fetchRecentBackgroundLogs = async () => {
    try {
      // Get recent attendance logs (last 50)
      const response = await api.get("/attendance/logs", {
        params: { limit: 50, page: 1 },
      });

      if (response.data && response.data.logs) {
        // Filter logs from the last 10 minutes for "live" feel
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recentLogs = response.data.logs.filter(
          (log) => new Date(log.timestamp) > tenMinutesAgo,
        );
        setBackgroundLogs(recentLogs);
      }
    } catch (error) {
      console.error("Error fetching recent background logs:", error);
    }
  };

  const toggleBackgroundMonitoring = async () => {
    try {
      const endpoint = backgroundMonitoring.isRunning
        ? "/attendance/background-monitor/stop"
        : "/attendance/background-monitor/start";

      const response = await api.post(endpoint);

      if (response.success) {
        await fetchBackgroundMonitoringStatus();
        alert(response.message);
      } else {
        alert("Error: " + response.message);
      }
    } catch (error) {
      alert(
        "Error toggling background monitoring: " +
          (error.message || "Unknown error"),
      );
    }
  };

  const startMonitoring = async () => {
    if (!selectedDevice && !monitorAllDevices) {
      alert("Please select a device or choose to monitor all devices");
      return;
    }

    try {
      setIsMonitoring(true);
      setConnectionStatus("connecting");
      setRealtimeLogs([]);

      // Get auth token
      const token = localStorage.getItem("token");

      // Determine endpoint
      const endpoint = monitorAllDevices
        ? `http://localhost:5000/api/v1/attendance/realtime-all?token=${token}`
        : `http://localhost:5000/api/v1/attendance/realtime/${selectedDevice}?token=${token}`;

      // Create EventSource for SSE
      const eventSource = new EventSource(endpoint);

      eventSource.onopen = () => {
        console.log("SSE connection opened");
        setConnectionStatus("connected");
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received event:", data);

          if (data.type === "attendance") {
            // Add new log to the beginning of the array
            setRealtimeLogs((prev) => [data.data, ...prev].slice(0, 50)); // Keep last 50

            // Show notification
            if (Notification.permission === "granted") {
              new Notification("New Attendance", {
                body: `${data.data.employee.name} checked ${data.data.direction || "in"}`,
                icon: "/favicon.ico",
              });
            }
          } else if (data.type === "connected") {
            console.log(data.message);
          } else if (data.type === "error") {
            console.error("Error:", data.message);
            alert(`Error: ${data.message}`);
          } else if (data.type === "warning") {
            console.warn("Warning:", data.message);
          }
        } catch (error) {
          console.error("Error parsing SSE data:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        setConnectionStatus("error");
        setIsMonitoring(false);
        eventSource.close();
      };

      eventSourceRef.current = eventSource;

      // Request notification permission
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch (error) {
      console.error("Error starting monitoring:", error);
      setIsMonitoring(false);
      setConnectionStatus("error");
    }
  };

  const stopMonitoring = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsMonitoring(false);
    setConnectionStatus("disconnected");
  };

  const exportToCSV = () => {
    if (realtimeLogs.length === 0) {
      alert("No logs to export");
      return;
    }

    const headers = [
      "Date",
      "Time",
      "Employee Code",
      "Employee Name",
      "Department",
      "Device",
      "Location",
      "Direction",
    ];
    const rows = realtimeLogs.map((log) => [
      new Date(log.timestamp).toLocaleDateString(),
      new Date(log.timestamp).toLocaleTimeString(),
      log.employee?.code || "N/A",
      log.employee?.name || "Unknown",
      log.employee?.department || "N/A",
      log.device?.name || "Unknown",
      log.device?.location || "N/A",
      log.direction || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `realtime_attendance_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600";
      case "connecting":
        return "text-yellow-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <CheckCircle className="w-5 h-5" />;
      case "connecting":
        return <Clock className="w-5 h-5 animate-spin" />;
      case "error":
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Radio className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Real-Time Attendance Monitor
        </h1>
        <p className="text-gray-600 mt-1">
          Monitor attendance check-ins as they happen
        </p>
      </div>

      {/* Background Monitoring Status */}
      <div className="card bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity
              className={`w-6 h-6 ${backgroundMonitoring.isRunning ? "text-green-600" : "text-gray-400"}`}
            />
            <div>
              <h3 className="font-semibold text-gray-900">
                Background Monitoring
              </h3>
              <p className="text-sm text-gray-600">
                {backgroundMonitoring.isRunning
                  ? `Actively monitoring ${backgroundMonitoring.devicesCount} devices`
                  : "Background monitoring is inactive"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                backgroundMonitoring.isRunning
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {backgroundMonitoring.isRunning ? "Active" : "Inactive"}
            </div>
            <button
              onClick={toggleBackgroundMonitoring}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                backgroundMonitoring.isRunning
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {backgroundMonitoring.isRunning ? "Stop" : "Start"} Background
            </button>
          </div>
        </div>

        {/* Background Monitoring Feed */}
        {backgroundMonitoring.isRunning && (
          <div className="mt-4 pt-4 border-t border-indigo-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">
                Recent Background Activity
              </h4>
              <span className="text-sm text-gray-500">
                {backgroundLogs.length} logs in last 10 minutes
              </span>
            </div>

            {backgroundLogs.length === 0 ? (
              <div className="text-center py-6">
                <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {backgroundLogs.slice(0, 10).map((log, index) => (
                  <div
                    key={log.id || index}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900">
                          {log.employee?.name || "Unknown Employee"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.employee?.code} •{" "}
                          {log.employee?.department || "No Department"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-900">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.device?.name || "Unknown Device"}
                      </div>
                      {log.direction && (
                        <div
                          className={`text-xs px-2 py-1 rounded-full mt-1 ${
                            log.direction.includes("in")
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {log.direction}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {backgroundMonitoring.status?.devices && (
              <div className="mt-3 pt-3 border-t border-indigo-200">
                <p className="text-xs text-gray-600 mb-2">Monitored Devices:</p>
                <div className="flex flex-wrap gap-2">
                  {backgroundMonitoring.status.devices.map((device) => (
                    <span
                      key={device.id}
                      className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs flex items-center gap-1"
                    >
                      <Monitor className="w-3 h-3" />
                      {device.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Monitoring Control Panel */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">
            Manual Live Monitoring
          </h3>
          <span className="text-sm text-gray-500">
            (Session-based monitoring)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Device
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => {
                setSelectedDevice(e.target.value);
                if (e.target.value) setMonitorAllDevices(false);
              }}
              disabled={isMonitoring || monitorAllDevices}
              className="input"
            >
              <option value="">Choose a device...</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} - {device.location}
                </option>
              ))}
            </select>
            <div className="mt-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={monitorAllDevices}
                  onChange={(e) => {
                    setMonitorAllDevices(e.target.checked);
                    if (e.target.checked) setSelectedDevice("");
                  }}
                  disabled={isMonitoring}
                  className="rounded"
                />
                Monitor all devices simultaneously
              </label>
            </div>
          </div>

          <div>
            <div className={`flex items-center gap-2 ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="text-sm font-medium capitalize">
                {connectionStatus}
              </span>
            </div>
            {monitorAllDevices && isMonitoring && (
              <div className="text-xs text-gray-500 mt-1">
                Monitoring {devices.filter((d) => d.isOnline).length} devices
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!isMonitoring ? (
              <button
                onClick={startMonitoring}
                disabled={!selectedDevice && !monitorAllDevices}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                Start Monitoring
              </button>
            ) : (
              <>
                <button
                  onClick={stopMonitoring}
                  className="btn-secondary flex-1"
                >
                  Stop
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={realtimeLogs.length === 0}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                  title="Export to CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Background Monitoring Stats */}
        <div className="card bg-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Background Logs</p>
              <p className="text-2xl font-bold text-indigo-600">
                {backgroundLogs.length}
              </p>
              <p className="text-xs text-gray-500">Last 10 minutes</p>
            </div>
            <Activity
              className={`w-8 h-8 ${backgroundMonitoring.isRunning ? "text-indigo-600 animate-pulse" : "text-gray-400"}`}
            />
          </div>
        </div>

        {/* Manual Monitoring Stats */}
        {isMonitoring && (
          <>
            <div className="card bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Live Session Logs</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {realtimeLogs.length}
                  </p>
                  <p className="text-xs text-gray-500">This session</p>
                </div>
                <Radio className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
            </div>

            <div className="card bg-green-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Session Check Ins</p>
                  <p className="text-2xl font-bold text-green-600">
                    {
                      realtimeLogs.filter(
                        (l) =>
                          l.direction === "check-in" ||
                          l.direction === "break-in",
                      ).length
                    }
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="card bg-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unique Employees</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {new Set(realtimeLogs.map((l) => l.employee?.id)).size}
                  </p>
                </div>
                <User className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Real-time Logs */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">
          Live Attendance Feed
        </h3>

        {!isMonitoring ? (
          <div className="text-center py-12">
            <Radio className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Not Monitoring
            </h3>
            <p className="text-gray-600">
              Select a device and click "Start Monitoring" to see live
              attendance
            </p>
          </div>
        ) : realtimeLogs.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-pulse" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Waiting for Check-ins...
            </h3>
            <p className="text-gray-600">
              Logs will appear here as employees check in
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {realtimeLogs.map((log, index) => (
              <div
                key={log.id || index}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors animate-fade-in"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {log.employee?.name || "Unknown"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {log.employee?.code} • {log.device?.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                    {log.direction && (
                      <div className="text-xs text-gray-500 mt-1">
                        {log.direction}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
