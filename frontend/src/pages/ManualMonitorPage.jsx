import React, { useState, useEffect, useRef } from "react";
import {
  Radio,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Download,
  Monitor,
  Calendar,
  MapPin,
  Building,
  Play,
  Square,
  RefreshCw,
} from "lucide-react";
import api from "../services/api";

export default function ManualMonitorPage() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [monitorAllDevices, setMonitorAllDevices] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [realtimeLogs, setRealtimeLogs] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [sessionStats, setSessionStats] = useState({
    totalLogs: 0,
    checkIns: 0,
    checkOuts: 0,
    uniqueEmployees: 0,
    sessionStart: null,
    sessionDuration: 0,
  });
  const eventSourceRef = useRef(null);
  const sessionTimerRef = useRef(null);

  useEffect(() => {
    fetchDevices();
    return () => {
      stopMonitoring();
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, []);

  // Update stats when logs change
  useEffect(() => {
    const checkIns = realtimeLogs.filter(
      (l) =>
        l.direction === "check-in" ||
        l.direction === "break-in" ||
        l.direction === "overtime-in",
    ).length;
    const checkOuts = realtimeLogs.filter(
      (l) =>
        l.direction === "check-out" ||
        l.direction === "break-out" ||
        l.direction === "overtime-out",
    ).length;
    const uniqueEmployees = new Set(
      realtimeLogs.map((l) => l.employee?.id).filter(Boolean),
    ).size;

    setSessionStats((prev) => ({
      ...prev,
      totalLogs: realtimeLogs.length,
      checkIns,
      checkOuts,
      uniqueEmployees,
    }));
  }, [realtimeLogs]);

  const fetchDevices = async () => {
    try {
      const response = await api.get("/devices");
      setDevices(response.data || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  const startSessionTimer = () => {
    const startTime = new Date();
    setSessionStats((prev) => ({ ...prev, sessionStart: startTime }));

    sessionTimerRef.current = setInterval(() => {
      const now = new Date();
      const duration = Math.floor((now - startTime) / 1000); // seconds
      setSessionStats((prev) => ({ ...prev, sessionDuration: duration }));
    }, 1000);
  };

  const stopSessionTimer = () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
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
      startSessionTimer();

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
            setRealtimeLogs((prev) => [data.data, ...prev].slice(0, 100)); // Keep last 100

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
        stopSessionTimer();
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
      stopSessionTimer();
    }
  };

  const stopMonitoring = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsMonitoring(false);
    setConnectionStatus("disconnected");
    stopSessionTimer();
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
      "Device Name",
      "Device Location",
      "Direction",
      "Session",
    ];

    const sessionId = sessionStats.sessionStart
      ? `Session_${sessionStats.sessionStart.toISOString().split("T")[0]}_${sessionStats.sessionStart.toTimeString().split(" ")[0].replace(/:/g, "")}`
      : "Unknown_Session";

    const rows = realtimeLogs.map((log) => [
      new Date(log.timestamp).toLocaleDateString(),
      new Date(log.timestamp).toLocaleTimeString(),
      log.employee?.code || "N/A",
      log.employee?.name || "Unknown",
      log.employee?.department || "N/A",
      log.device?.name || "Unknown",
      log.device?.location || "N/A",
      log.direction || "N/A",
      sessionId,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manual_session_${new Date().toISOString().split("T")[0]}.csv`;
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manual Live Monitor
          </h1>
          <p className="text-gray-600 mt-1">
            Session-based real-time attendance monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchDevices}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Devices
          </button>
          <button
            onClick={exportToCSV}
            disabled={realtimeLogs.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export Session
          </button>
        </div>
      </div>

      {/* Session Info */}
      {isMonitoring && (
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Radio className="w-6 h-6 text-blue-600 animate-pulse" />
              <div>
                <h3 className="font-semibold text-gray-900">
                  Active Monitoring Session
                </h3>
                <p className="text-sm text-gray-600">
                  Started: {sessionStats.sessionStart?.toLocaleString()} •
                  Duration: {formatDuration(sessionStats.sessionDuration)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Monitoring:{" "}
                {monitorAllDevices
                  ? "All Devices"
                  : devices.find((d) => d.id === selectedDevice)?.name}
              </div>
              <div className={`flex items-center gap-2 ${getStatusColor()}`}>
                {getStatusIcon()}
                <span className="text-sm font-medium capitalize">
                  {connectionStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Session Control</h3>
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
                className="btn-primary flex-1 disabled:opacity-50 flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Session
              </button>
            ) : (
              <button
                onClick={stopMonitoring}
                className="btn-secondary flex-1 flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Stop Session
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Session Statistics */}
      {isMonitoring && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Session Logs</p>
                <p className="text-2xl font-bold text-blue-600">
                  {sessionStats.totalLogs}
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
                  {sessionStats.checkIns}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="card bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Check Outs</p>
                <p className="text-2xl font-bold text-red-600">
                  {sessionStats.checkOuts}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="card bg-purple-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unique Employees</p>
                <p className="text-2xl font-bold text-purple-600">
                  {sessionStats.uniqueEmployees}
                </p>
              </div>
              <User className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Live Session Feed */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">
          Live Session Feed
          {isMonitoring && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({realtimeLogs.length} logs this session)
            </span>
          )}
        </h3>

        {!isMonitoring ? (
          <div className="text-center py-12">
            <Radio className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Active Session
            </h3>
            <p className="text-gray-600 mb-4">
              Select a device and start a monitoring session to see live
              attendance
            </p>
            <button
              onClick={startMonitoring}
              disabled={!selectedDevice && !monitorAllDevices}
              className="btn-primary disabled:opacity-50"
            >
              Start Monitoring Session
            </button>
          </div>
        ) : realtimeLogs.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-pulse" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Waiting for Check-ins...
            </h3>
            <p className="text-gray-600">
              Logs will appear here as employees check in during this session
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {realtimeLogs.map((log, index) => (
              <div
                key={log.id || index}
                className="p-4 border rounded-lg hover:bg-blue-50 transition-colors animate-fade-in border-blue-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {log.employee?.name || "Unknown Employee"}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-4">
                        <span>{log.employee?.code || "No Code"}</span>
                        {log.employee?.department && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {log.employee.department}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Monitor className="w-3 h-3" />
                          {log.device?.name || "Unknown Device"}
                        </span>
                        {log.device?.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {log.device.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <Calendar className="w-4 h-4" />
                      {new Date(log.timestamp).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                    {log.direction && (
                      <div
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                          log.direction.includes("in")
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {log.direction.replace("-", " ").toUpperCase()}
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
