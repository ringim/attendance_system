import React, { useState, useEffect } from "react";
import {
  Monitor,
  Plus,
  Wifi,
  WifiOff,
  Edit2,
  Trash2,
  X,
  Save,
  RefreshCw,
  Activity,
  Users,
  Database,
  MapPin,
  Info,
} from "lucide-react";
import api from "../services/api";

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testingDevice, setTestingDevice] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    ipAddress: "",
    port: 4370,
    location: "",
    model: "S900",
    description: "",
  });

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await api.get("/devices");
      setDevices(response.data || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post("/devices", formData);
      setShowAddModal(false);
      resetForm();
      fetchDevices();
      alert("Device registered successfully!");
    } catch (error) {
      alert(
        error.message || "Error registering device. Please check connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/devices/${selectedDevice.id}`, formData);
      setShowEditModal(false);
      resetForm();
      fetchDevices();
      alert("Device updated successfully!");
    } catch (error) {
      alert(error.message || "Error updating device");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this device?")) return;
    try {
      await api.delete(`/devices/${id}`);
      fetchDevices();
      alert("Device deleted successfully!");
    } catch (error) {
      alert(error.message || "Error deleting device");
    }
  };

  const handleTestConnection = async (device) => {
    try {
      setTestingDevice(device.id);
      const response = await api.post(`/devices/${device.id}/test`);

      if (response.success) {
        alert(
          `✅ Connection Successful!\n\nDevice Info:\n- Users: ${response.data?.userCounts || "N/A"}\n- Logs: ${response.data?.logCounts || "N/A"}\n- Capacity: ${response.data?.logCapacity || "N/A"}`,
        );
      } else {
        alert(`❌ Connection Failed\n\n${response.message}`);
      }

      fetchDevices(); // Refresh to update online status
    } catch (error) {
      alert(
        `❌ Connection Failed\n\n${error.message || "Could not reach device"}`,
      );
    } finally {
      setTestingDevice(null);
    }
  };

  const handleViewInfo = async (device) => {
    try {
      setLoading(true);
      setSelectedDevice(device);
      const response = await api.get(`/devices/${device.id}/info`);
      setDeviceInfo(response.data);
      setShowInfoModal(true);
    } catch (error) {
      alert(
        "Error fetching device info: " + (error.message || "Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSyncUsers = async (device) => {
    if (!confirm(`Sync all users from ${device.name}?`)) return;

    try {
      setLoading(true);
      const response = await api.post(`/employees/sync/${device.id}`);
      alert(
        `✅ Sync Completed!\n\nImported: ${response.data.imported}\nSkipped: ${response.data.skipped}\nFailed: ${response.data.failed}`,
      );
    } catch (error) {
      alert("Error syncing users: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (device) => {
    setSelectedDevice(device);
    setFormData({
      name: device.name,
      ipAddress: device.ipAddress,
      port: device.port,
      location: device.location || "",
      model: device.model || "S900",
      description: device.description || "",
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      ipAddress: "",
      port: 4370,
      location: "",
      model: "S900",
      description: "",
    });
    setSelectedDevice(null);
  };

  const getStatusColor = (device) => {
    if (!device.isOnline) return "bg-red-100 text-red-800";
    if (device.status === "active") return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusText = (device) => {
    if (!device.isOnline) return "Offline";
    return device.status === "active" ? "Online" : "Inactive";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Device Management
          </h1>
          <p className="text-gray-600 mt-1">Manage ZKTeco biometric devices</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchDevices}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Register Device
          </button>
        </div>
      </div>

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && devices.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading devices...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No devices registered
            </h3>
            <p className="text-gray-600 mb-4">
              Get started by registering your first device
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              Register Device
            </button>
          </div>
        ) : (
          devices.map((device) => (
            <div
              key={device.id}
              className="card hover:shadow-lg transition-shadow"
            >
              {/* Device Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-lg ${device.isOnline ? "bg-green-100" : "bg-gray-100"}`}
                  >
                    <Monitor
                      className={`w-6 h-6 ${device.isOnline ? "text-green-600" : "text-gray-400"}`}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {device.name}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(device)}`}
                    >
                      {device.isOnline ? (
                        <Wifi className="w-3 h-3" />
                      ) : (
                        <WifiOff className="w-3 h-3" />
                      )}
                      {getStatusText(device)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Device Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Activity className="w-4 h-4" />
                  <span className="font-mono">
                    {device.ipAddress}:{device.port}
                  </span>
                </div>
                {device.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{device.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Database className="w-4 h-4" />
                  <span>Model: {device.model || "S900"}</span>
                </div>
                {device.lastSeenAt && (
                  <div className="text-xs text-gray-500">
                    Last seen: {new Date(device.lastSeenAt).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <button
                  onClick={() => handleTestConnection(device)}
                  disabled={testingDevice === device.id}
                  className="flex-1 btn-secondary text-sm py-2 disabled:opacity-50"
                >
                  {testingDevice === device.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4" />
                      Test
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleViewInfo(device)}
                  className="flex-1 btn-secondary text-sm py-2"
                >
                  <Info className="w-4 h-4" />
                  Info
                </button>
                <button
                  onClick={() => handleSyncUsers(device)}
                  className="flex-1 btn-secondary text-sm py-2"
                >
                  <Users className="w-4 h-4" />
                  Sync
                </button>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => openEditModal(device)}
                  className="flex-1 text-blue-600 hover:text-blue-800 text-sm py-2 px-3 rounded hover:bg-blue-50"
                >
                  <Edit2 className="w-4 h-4 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(device.id)}
                  className="flex-1 text-red-600 hover:text-red-800 text-sm py-2 px-3 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {showEditModal ? "Edit Device" : "Register New Device"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={showEditModal ? handleUpdate : handleCreate}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input"
                  placeholder="Main Entrance Device"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IP Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ipAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, ipAddress: e.target.value })
                    }
                    className="input"
                    placeholder="192.168.1.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Port *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.port}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        port: parseInt(e.target.value),
                      })
                    }
                    className="input"
                    placeholder="4370"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="input"
                  placeholder="Building A - Floor 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <select
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  className="input"
                >
                  <option value="S900">S900</option>
                  <option value="K40">K40</option>
                  <option value="F18">F18</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="input"
                  rows="3"
                  placeholder="Additional notes about this device..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {showEditModal ? "Update" : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Device Info Modal */}
      {showInfoModal && deviceInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Device Information</h2>
              <button
                onClick={() => {
                  setShowInfoModal(false);
                  setDeviceInfo(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Device Details */}
              <div className="card bg-gray-50">
                <h3 className="font-semibold mb-3">Device Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-medium">{selectedDevice?.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">IP Address:</span>
                    <p className="font-medium font-mono">
                      {selectedDevice?.ipAddress}:{selectedDevice?.port}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Location:</span>
                    <p className="font-medium">
                      {selectedDevice?.location || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Model:</span>
                    <p className="font-medium">
                      {selectedDevice?.model || "S900"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Device Statistics */}
              {deviceInfo.info && (
                <div className="card bg-blue-50">
                  <h3 className="font-semibold mb-3">Statistics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {deviceInfo.info.userCounts || 0}
                      </div>
                      <div className="text-sm text-gray-600">Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {deviceInfo.info.logCounts || 0}
                      </div>
                      <div className="text-sm text-gray-600">Logs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {deviceInfo.info.logCapacity || 0}
                      </div>
                      <div className="text-sm text-gray-600">Capacity</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Device Time */}
              {deviceInfo.time && (
                <div className="card bg-green-50">
                  <h3 className="font-semibold mb-2">Device Time</h3>
                  <p className="text-lg font-mono">
                    {new Date(deviceInfo.time).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Raw Data */}
              <div className="card bg-gray-50">
                <h3 className="font-semibold mb-2">Raw Data</h3>
                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                  {JSON.stringify(deviceInfo, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowInfoModal(false);
                  setDeviceInfo(null);
                }}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
