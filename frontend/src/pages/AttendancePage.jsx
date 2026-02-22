import React, { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  ArrowUpCircle,
  ArrowDownCircle,
  User,
  Monitor,
  Search,
} from "lucide-react";
import api from "../services/api";

export default function AttendancePage() {
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    employeeId: "",
    deviceId: "",
    startDate: "",
    endDate: "",
    direction: "",
  });

  useEffect(() => {
    fetchLogs();
  }, [
    pagination.page,
    filters.employeeId,
    filters.deviceId,
    filters.startDate,
    filters.endDate,
    filters.direction,
  ]);

  useEffect(() => {
    fetchEmployees();
    fetchDevices();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get("/attendance/logs", {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          ...filters,
        },
      });

      if (response.data) {
        setLogs(response.data.logs || []);
        setPagination((prev) => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/employees", { params: { limit: 1000 } });
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await api.get("/devices");
      setDevices(response.data || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
      setDevices([]);
    }
  };

  const handleSync = async (deviceId = null) => {
    try {
      setSyncing(true);
      const response = await api.post(
        "/attendance/sync",
        deviceId ? { deviceId } : {},
      );

      if (response.success) {
        alert("✅ Sync completed successfully!");
        fetchLogs();
      } else {
        alert("❌ Sync failed: " + response.message);
      }
    } catch (error) {
      alert("❌ Sync error: " + (error.message || "Unknown error"));
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = () => {
    // Prepare CSV data
    const headers = [
      "Date",
      "Time",
      "Employee Code",
      "Employee Name",
      "Department",
      "Device",
      "Direction",
      "Verify Mode",
    ];
    const rows = logs.map((log) => [
      new Date(log.timestamp).toLocaleDateString(),
      new Date(log.timestamp).toLocaleTimeString(),
      log.employee?.code || "N/A",
      log.employee?.name || "Unknown",
      log.employee?.department || "N/A",
      log.device?.name || "Unknown",
      log.direction || "N/A",
      log.verifyMode || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr =
      filters.startDate && filters.endDate
        ? `${filters.startDate}_to_${filters.endDate}`
        : new Date().toISOString().split("T")[0];
    a.download = `attendance_logs_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setFilters({
      employeeId: "",
      deviceId: "",
      startDate: "",
      endDate: "",
      direction: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getDirectionIcon = (direction) => {
    if (
      direction === "check-in" ||
      direction === "break-in" ||
      direction === "overtime-in"
    )
      return <ArrowUpCircle className="w-4 h-4 text-green-600" />;
    if (
      direction === "check-out" ||
      direction === "break-out" ||
      direction === "overtime-out"
    )
      return <ArrowDownCircle className="w-4 h-4 text-red-600" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const getDirectionColor = (direction) => {
    if (direction === "check-in") return "bg-green-100 text-green-800";
    if (direction === "check-out") return "bg-red-100 text-red-800";
    if (direction === "break-in") return "bg-blue-100 text-blue-800";
    if (direction === "break-out") return "bg-orange-100 text-orange-800";
    if (direction === "overtime-in") return "bg-purple-100 text-purple-800";
    if (direction === "overtime-out") return "bg-pink-100 text-pink-800";
    return "bg-gray-100 text-gray-800";
  };

  const getDirectionLabel = (direction) => {
    const labels = {
      "check-in": "Check In",
      "check-out": "Check Out",
      "break-in": "Break In",
      "break-out": "Break Out",
      "overtime-in": "OT In",
      "overtime-out": "OT Out",
    };
    return labels[direction] || "N/A";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Logs</h1>
          <p className="text-gray-600 mt-1">
            View and manage attendance records
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSync()}
            disabled={syncing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync All"}
          </button>
          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>

        {/* Quick Employee Search */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quick Search Employee
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or employee code..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          {employeeSearch && (
            <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg">
              {employees
                .filter(
                  (emp) =>
                    emp.name
                      .toLowerCase()
                      .includes(employeeSearch.toLowerCase()) ||
                    emp.employeeCode
                      .toLowerCase()
                      .includes(employeeSearch.toLowerCase()),
                )
                .slice(0, 10)
                .map((emp) => (
                  <button
                    key={emp.id}
                    onClick={(e) => {
                      e.preventDefault();
                      console.log("Selecting employee:", emp.name, emp.id);
                      setEmployeeSearch("");
                      setFilters((prev) => {
                        const newFilters = { ...prev, employeeId: emp.id };
                        console.log("New filters:", newFilters);
                        return newFilters;
                      });
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer"
                  >
                    <div className="font-medium text-gray-900">{emp.name}</div>
                    <div className="text-sm text-gray-500">
                      {emp.employeeCode}{" "}
                      {emp.department ? `• ${emp.department}` : ""}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee
            </label>
            <select
              value={filters.employeeId}
              onChange={(e) =>
                setFilters({ ...filters, employeeId: e.target.value })
              }
              className="input"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode})
                </option>
              ))}
            </select>
            {filters.employeeId && (
              <button
                onClick={() =>
                  setFilters((prev) => ({ ...prev, employeeId: "" }))
                }
                className="text-xs text-blue-600 hover:text-blue-800 mt-1"
              >
                Clear selection
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device
            </label>
            <select
              value={filters.deviceId}
              onChange={(e) =>
                setFilters({ ...filters, deviceId: e.target.value })
              }
              className="input"
            >
              <option value="">All Devices</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                className="input flex-1"
              />
              <button
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0];
                  setFilters({ ...filters, startDate: today, endDate: today });
                }}
                className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Today
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Direction
            </label>
            <select
              value={filters.direction}
              onChange={(e) =>
                setFilters({ ...filters, direction: e.target.value })
              }
              className="input"
            >
              <option value="">All</option>
              <option value="check-in">Check In</option>
              <option value="check-out">Check Out</option>
              <option value="break-in">Break In</option>
              <option value="break-out">Break Out</option>
              <option value="overtime-in">Overtime In</option>
              <option value="overtime-out">Overtime Out</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={resetFilters} className="btn-secondary text-sm">
            Reset Filters
          </button>
          <button
            onClick={() => setPagination((prev) => ({ ...prev, page: 1 }))}
            className="btn-primary text-sm"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Logs</p>
              <p className="text-2xl font-bold text-blue-600">
                {pagination.total}
              </p>
              {filters.employeeId && (
                <p className="text-xs text-gray-500 mt-1">
                  for {employees.find((e) => e.id === filters.employeeId)?.name}
                </p>
              )}
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="card bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Check Ins</p>
              <p className="text-2xl font-bold text-green-600">
                {
                  logs.filter(
                    (l) =>
                      l.direction === "check-in" ||
                      l.direction === "break-in" ||
                      l.direction === "overtime-in",
                  ).length
                }
              </p>
            </div>
            <ArrowUpCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="card bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Check Outs</p>
              <p className="text-2xl font-bold text-red-600">
                {
                  logs.filter(
                    (l) =>
                      l.direction === "check-out" ||
                      l.direction === "break-out" ||
                      l.direction === "overtime-out",
                  ).length
                }
              </p>
            </div>
            <ArrowDownCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="card bg-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unique Employees</p>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(logs.map((l) => l.employee?.id).filter(Boolean)).size}
              </p>
            </div>
            <User className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading attendance logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No attendance logs found
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your filters or sync data from devices
            </p>
            <button onClick={() => handleSync()} className="btn-primary">
              Sync Attendance Data
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Device
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Direction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verify Mode
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(log.timestamp).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {log.employee?.name || "Unknown"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {log.employee?.code || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.employee?.department || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {log.device?.name || "Unknown"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {log.device?.location || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getDirectionColor(log.direction)}`}
                        >
                          {getDirectionIcon(log.direction)}
                          {getDirectionLabel(log.direction)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.verifyMode || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  disabled={pagination.page === 1}
                  className="btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  disabled={pagination.page >= pagination.totalPages}
                  className="btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total,
                      )}
                    </span>{" "}
                    of <span className="font-medium">{pagination.total}</span>{" "}
                    results
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
                    }
                    disabled={pagination.page === 1}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
                    disabled={pagination.page >= pagination.totalPages}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
