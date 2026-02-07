import { useState, useEffect } from 'react';
import { jobAPI, QueueStats as QueueStatsType } from '../lib/api';

const QueueStats = () => {
  const [stats, setStats] = useState<QueueStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await jobAPI.getQueueStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load queue stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Queue Statistics</h2>
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Queue Statistics</h2>
          <div className="text-center text-red-500">Failed to load statistics</div>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Waiting', value: stats.waiting, color: 'bg-yellow-500' },
    { label: 'Active', value: stats.active, color: 'bg-blue-500' },
    { label: 'Completed', value: stats.completed, color: 'bg-green-500' },
    { label: 'Failed', value: stats.failed, color: 'bg-red-500' },
    { label: 'Delayed', value: stats.delayed, color: 'bg-purple-500' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Queue Statistics</h2>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-gray-50 rounded-lg p-6 text-center">
              <div className={`w-12 h-12 ${stat.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <span className="text-white font-bold text-lg">{stat.value}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{stat.label}</h3>
              <p className="text-2xl font-bold text-gray-700 mt-2">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Queue Overview</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Jobs:</span>
                <span className="ml-2 font-semibold">
                  {stats.waiting + stats.active + stats.completed + stats.failed + stats.delayed}
                </span>
              </div>
              <div>
                <span className="text-gray-600">In Progress:</span>
                <span className="ml-2 font-semibold">{stats.active}</span>
              </div>
              <div>
                <span className="text-gray-600">Success Rate:</span>
                <span className="ml-2 font-semibold">
                  {stats.completed + stats.failed > 0
                    ? Math.round((stats.completed / (stats.completed + stats.failed)) * 100)
                    : 0}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">Pending:</span>
                <span className="ml-2 font-semibold">{stats.waiting + stats.delayed}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
