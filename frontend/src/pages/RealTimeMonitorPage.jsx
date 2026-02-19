import React, { useState, useEffect, useRef } from "react";
import {
  Radio,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Download,
} from "lucide-react";
import api from "../services/api";

export default function RealTimeMonitorPage() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [monitorAllDevices, setMonitorAllDevices] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [realtimeLogs, setRealtimeLogs] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const eventSourceRef = useRef(null);

  useEffect(() => {
    fetchDevices();
    return () => {
      stopMonitoring();
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

      {/* Control Panel */}
      <div className="card">
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
      {isMonitoring && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Live Logs</p>
                <p className="text-2xl font-bold text-blue-600">
                  {realtimeLogs.length}
                </p>
              </div>
              <Radio className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
          </div>

          <div className="card bg-green-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Check Ins</p>
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
        </div>
      )}

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
