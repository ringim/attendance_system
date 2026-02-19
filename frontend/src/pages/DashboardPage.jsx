import React, { useState, useEffect } from 'react';
import { Users, Monitor, Clock, TrendingUp } from 'lucide-react';
import { attendanceAPI } from '../services/api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await attendanceAPI.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Today's Attendance",
      value: stats?.todayAttendance || 0,
      icon: Clock,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Employees',
      value: stats?.totalEmployees || 0,
      icon: Users,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Active Devices',
      value: stats?.activeDevices || 0,
      icon: Monitor,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Attendance Rate',
      value: stats?.totalEmployees > 0 
        ? `${Math.round((stats.todayAttendance / stats.totalEmployees) * 100)}%`
        : '0%',
      icon: TrendingUp,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back! Here's an overview of your attendance system.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon className={`w-8 h-8 ${stat.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Attendance
          </h2>
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View All
          </button>
        </div>

        {stats?.recentLogs && stats.recentLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Employee
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Time
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Direction
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Device
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLogs.map((log, index) => (
                  <tr key={log.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {log.employee?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {log.employee?.code || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${
                        log.direction === 'in' ? 'badge-success' : 'badge-error'
                      }`}>
                        {log.direction === 'in' ? 'Check In' : 'Check Out'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {log.device?.name || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No recent attendance records</p>
          </div>
        )}
      </div>
    </div>
  );
}
