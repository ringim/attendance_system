import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Monitor,
  User,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Building,
  RefreshCw,
} from "lucide-react";
import api from "../services/api";
import useBackgroundMonitorStore from "../store/backgroundMonitorStore";

export default function BackgroundMonitorPage() {
  // Zustand store
  const {
    logs: backgroundLogs,
    setLogs,
    addLog,
    clearLogs,
    shouldFetchFromDB,
    setLastFetchTime,
    pruneOldLogs,
  } = useBackgroundMonitorStore();

  console.log("Rendering with backgroundLogs.length:", backgroundLogs.length);

  const [backgroundMonitoring, setBackgroundMonitoring] = useState({
    isRunning: false,
    devicesCount: 0,
    status: null,
  });
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const eventSourceRef = useRef(null);
  const [stats, setStats] = useState({
    totalLogs: 0,
    checkIns: 0,
    checkOuts: 0,
    uniqueEmployees: 0,
  });

  useEffect(() => {
    fetchBackgroundMonitoringStatus();

    // Load today's logs on mount (only if cache is empty or stale)
    if (backgroundLogs.length === 0 || shouldFetchFromDB()) {
      loadRecentLogs();
    }

    // Check status every 10 seconds
    const statusInterval = setInterval(() => {
      fetchBackgroundMonitoringStatus();
    }, 10000);

    return () => {
      clearInterval(statusInterval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate effect for managing SSE connection based on monitoring status
  useEffect(() => {
    const connect = () => {
      if (eventSourceRef.current) {
        return; // Already connected
      }

      try {
        setConnectionStatus("connecting");
        const token = localStorage.getItem("token");
        const endpoint = `http://localhost:5000/api/v1/attendance/background-monitor/stream?token=${token}`;

        const eventSource = new EventSource(endpoint);

        eventSource.onopen = () => {
          console.log("Connected to background monitoring stream");
          setConnectionStatus("connected");
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Received background monitoring event:", data);

            if (data.type === "attendance") {
              // Add new log to the store (not replace)
              addLog(data.data);

              // Show notification
              if (Notification.permission === "granted") {
                new Notification("Background Monitoring", {
                  body: `${data.data.employee.name} checked ${data.data.direction || "in"}`,
                  icon: "/favicon.ico",
                });
              }
            } else if (data.type === "connected") {
              console.log(data.message);
            } else if (data.type === "error") {
              console.error("Stream error:", data.message);
              setConnectionStatus("error");
            }
          } catch (error) {
            console.error("Error parsing SSE data:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("SSE connection error:", error);
          setConnectionStatus("error");
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
        };

        eventSourceRef.current = eventSource;

        // Request notification permission
        if (Notification.permission === "default") {
          Notification.requestPermission();
        }
      } catch (error) {
        console.error("Error connecting to stream:", error);
        setConnectionStatus("error");
      }
    };

    const disconnect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setConnectionStatus("disconnected");
      }
    };

    if (backgroundMonitoring.isRunning) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [backgroundMonitoring.isRunning]);

  // Update stats when logs change
  useEffect(() => {
    const checkIns = backgroundLogs.filter(
      (l) =>
        l.direction === "check-in" ||
        l.direction === "break-in" ||
        l.direction === "overtime-in",
    ).length;
    const checkOuts = backgroundLogs.filter(
      (l) =>
        l.direction === "check-out" ||
        l.direction === "break-out" ||
        l.direction === "overtime-out",
    ).length;
    const uniqueEmployees = new Set(
      backgroundLogs.map((l) => l.employee?.id).filter(Boolean),
    ).size;

    setStats({
      totalLogs: backgroundLogs.length,
      checkIns,
      checkOuts,
      uniqueEmployees,
    });
  }, [backgroundLogs]);

  const fetchBackgroundMonitoringStatus = async () => {
    try {
      const response = await api.get("/attendance/background-monitor/status");
      setBackgroundMonitoring(response.data);
    } catch (error) {
      console.error("Error fetching background monitoring status:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentLogs = async () => {
    try {
      // Get today's date in YYYY-MM-DD format (local timezone)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const todayStr = `${year}-${month}-${day}`;

      console.log(`Fetching logs for date: ${todayStr}`);

      const response = await api.get("/attendance/logs", {
        params: {
          limit: 100,
          page: 1,
          startDate: todayStr,
          endDate: todayStr,
        },
      });

      console.log("API response:", response.data);

      if (response.data && response.data.logs) {
        // Log first log to see structure
        if (response.data.logs.length > 0) {
          console.log("Sample log structure:", response.data.logs[0]);
        }

        // Filter: must have valid employee and timestamp (direction can be null)
        const validLogs = response.data.logs.filter((log) => {
          const hasEmployee = log.employee && log.employee.name;
          const hasValidTimestamp =
            log.timestamp && !isNaN(new Date(log.timestamp).getTime());

          return hasEmployee && hasValidTimestamp;
        });

        console.log(
          `Filtered ${validLogs.length} valid logs from ${response.data.logs.length} total`,
        );

        // Show first few for debugging
        if (validLogs.length > 0) {
          console.log(
            "First 3 valid logs:",
            validLogs.slice(0, 3).map((l) => ({
              employee: l.employee?.name,
              direction: l.direction,
              timestamp: new Date(l.timestamp).toLocaleString(),
            })),
          );
        }

        setLogs(validLogs);
        console.log(
          "After setLogs, backgroundLogs.length:",
          backgroundLogs.length,
        );
        setLastFetchTime(Date.now());
      }
    } catch (error) {
      console.error("Error loading recent logs:", error);
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

  const exportToCSV = () => {
    if (backgroundLogs.length === 0) {
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
      "Verify Mode",
    ];

    const rows = backgroundLogs.map((log) => [
      new Date(log.timestamp).toLocaleDateString(),
      new Date(log.timestamp).toLocaleTimeString(),
      log.employee?.code || "N/A",
      log.employee?.name || "Unknown",
      log.employee?.department || "N/A",
      log.device?.name || "Unknown",
      log.device?.location || "N/A",
      log.direction || "N/A",
      log.verifyMode || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const timestamp = new Date().toISOString().split("T")[0];
    a.download = `background_monitoring_${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Background Monitoring
          </h1>
          <p className="text-gray-600 mt-1">
            24/7 monitoring with live updates - Logs persist even when page is
            closed
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              clearLogs();
              loadRecentLogs();
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Load Today
          </button>
          <button
            onClick={clearLogs}
            className="btn-secondary flex items-center gap-2"
          >
            Clear
          </button>
          <button
            onClick={exportToCSV}
            disabled={backgroundLogs.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Background Monitoring Control */}
      <div className="card bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity
              className={`w-8 h-8 ${backgroundMonitoring.isRunning ? "text-green-600 animate-pulse" : "text-gray-400"}`}
            />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Background Monitoring Status
              </h3>
              <p className="text-gray-600">
                {backgroundMonitoring.isRunning
                  ? `Actively monitoring ${backgroundMonitoring.devicesCount} devices continuously`
                  : "Background monitoring is currently inactive"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`px-4 py-2 rounded-full font-medium ${
                backgroundMonitoring.isRunning
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {backgroundMonitoring.isRunning ? "ACTIVE" : "INACTIVE"}
            </div>
            <button
              onClick={toggleBackgroundMonitoring}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                backgroundMonitoring.isRunning
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {backgroundMonitoring.isRunning
                ? "Stop Monitoring"
                : "Start Monitoring"}
            </button>
          </div>
        </div>

        {/* Monitored Devices */}
        {backgroundMonitoring.isRunning &&
          backgroundMonitoring.status?.devices && (
            <div className="mt-6 pt-6 border-t border-indigo-200">
              <h4 className="font-medium text-gray-900 mb-3">
                Monitored Devices ({backgroundMonitoring.status.devices.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {backgroundMonitoring.status.devices.map((device) => (
                  <div
                    key={device.id}
                    className="bg-white p-3 rounded-lg border border-indigo-200"
                  >
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-indigo-600" />
                      <div>
                        <div className="font-medium text-sm text-gray-900">
                          {device.name}
                        </div>
                        <div className="text-xs text-gray-500">{device.ip}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>

      {/* Date Filters */}
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Logs</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.totalLogs}
              </p>
            </div>
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="card bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Check Ins</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.checkIns}
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
                {stats.checkOuts}
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
                {stats.uniqueEmployees}
              </p>
            </div>
            <User className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Background Monitoring Feed */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">
              Background Monitoring Feed
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({backgroundLogs.length} logs today)
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Showing today's attendance. Background monitoring runs 24/7.
            </p>
          </div>
          {backgroundMonitoring.isRunning && (
            <div
              className={`flex items-center gap-2 text-sm ${
                connectionStatus === "connected"
                  ? "text-green-600"
                  : connectionStatus === "connecting"
                    ? "text-yellow-600"
                    : "text-gray-600"
              }`}
            >
              <Activity
                className={`w-4 h-4 ${connectionStatus === "connected" ? "animate-pulse" : ""}`}
              />
              <span className="capitalize">{connectionStatus}</span>
            </div>
          )}
        </div>

        {backgroundLogs.length === 0 ? (
          !backgroundMonitoring.isRunning ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Background Monitoring Inactive
              </h3>
              <p className="text-gray-600 mb-4">
                Start background monitoring to see continuous attendance feed
              </p>
              <button
                onClick={toggleBackgroundMonitoring}
                className="btn-primary"
              >
                Start Background Monitoring
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Logs Found
              </h3>
              <p className="text-gray-600">Waiting for attendance logs...</p>
            </div>
          )
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {backgroundLogs.map((log, index) => (
              <div
                key={log.id || index}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-indigo-600" />
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
