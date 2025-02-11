'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface LineChartProps {
  data: Record<string, number>;
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  // Sort the dates so the chart is in order
  const sortedDates = Object.keys(data).sort();
  const counts = sortedDates.map((date) => data[date]);

  const chartData = {
    labels: sortedDates,
    datasets: [
      {
        label: 'Daily Count',
        data: counts,
        fill: false,
        borderColor: '#0d47a1',
        backgroundColor: '#0d47a1',
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Daily Count Over Time',
      },
    },
  };

  return <Line data={chartData} options={options} />;
};

export default LineChart;
