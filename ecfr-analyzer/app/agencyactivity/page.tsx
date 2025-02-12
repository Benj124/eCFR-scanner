/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import styles from './page.module.css';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import Navigation from '../components/Navigation';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Agency {
  slug: string;
  display_name: string;
}

interface AgencyCount {
  agencySlug: string;
  agencyName: string;
  count: number;
}

export default function AgencyActivityPage() {
  const [agencyCounts, setAgencyCounts] = useState<AgencyCount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // monthsRange is bound to the dropdown; queryMonths is set when "Run Query" is clicked.
  const [monthsRange, setMonthsRange] = useState<number>(6);
  const [queryMonths, setQueryMonths] = useState<number>(6);

  // Fetch agency activity when the component mounts or queryMonths changes.
  useEffect(() => {
    async function fetchAgencyActivity() {
      setLoading(true);
      try {
        // 1. Fetch the list of agencies
        const agenciesRes = await fetch('/api/regulatoryAgencies/get');
        const agenciesJson = await agenciesRes.json();
        if (!agenciesJson.success) {
          throw new Error(agenciesJson.error || 'Failed to fetch agencies.');
        }
        const agencies: Agency[] = agenciesJson.data.agencies || [];

        // 2. Compute the date "queryMonths" ago (formatted as YYYY-MM-DD)
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - queryMonths);
        const formattedDate = startDate.toISOString().split('T')[0];

        // 3. For each agency, call the count endpoint with filter last_modified_after
        const countPromises = agencies.map(async (agency) => {
          const countRes = await fetch(
            `/api/search/count?agency_slugs[]=${agency.slug}&last_modified_after=${formattedDate}`
          );
          const countJson = await countRes.json();
          // Assume count JSON has structure: { success: true, data: { meta: { total_count: number } } }
          const count =
            countJson.success && countJson.data?.meta?.total_count
              ? Number(countJson.data.meta.total_count)
              : 0;
          return {
            agencySlug: agency.slug,
            agencyName: agency.display_name,
            count,
          } as AgencyCount;
        });

        const counts: AgencyCount[] = await Promise.all(countPromises);
        // 4. Sort by count descending and select the top 20
        counts.sort((a, b) => b.count - a.count);
        setAgencyCounts(counts.slice(0, 20));
      } catch (error: any) {
        console.error('Error fetching agency activity:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAgencyActivity();
  }, [queryMonths]);

  // Prepare data for the Bar chart using queryMonths in the labels.
  const labels = agencyCounts.map((ac) => ac.agencyName);
  const chartData = {
    labels,
    datasets: [
      {
        label: `Regulations Passed (Last ${queryMonths} Months)`,
        data: agencyCounts.map((ac) => ac.count),
        backgroundColor: 'rgba(13, 71, 161, 0.6)',
        borderColor: 'rgba(13, 71, 161, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: `Top 20 Agencies - Regulations Passed in Last ${queryMonths} Months`,
      },
    },
  };

  // Run Query button handler: update queryMonths so the effect triggers
  const handleRunQuery = () => {
    setQueryMonths(monthsRange);
  };

  return (
    <main className={styles.main}>
      <Navigation />
      <h1 className={styles.title}></h1>
      <div className={styles.filterContainer}>
        <label htmlFor="monthsRange" className={styles.filterLabel}>
          Select Months Range:
        </label>
        <select
          id="monthsRange"
          value={monthsRange}
          onChange={(e) => setMonthsRange(Number(e.target.value))}
          className={styles.filterDropdown}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </select>
        <button className={styles.button} onClick={handleRunQuery}>
          Run Query
        </button>
      </div>
      {loading ? (
        <p>
          Loading agency activity data, this may take a minute, do not navigate
          away.
        </p>
      ) : (
        <>
          <div className={styles.chartContainer}>
            <Bar data={chartData} options={chartOptions} />
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Agency</th>
                  <th>Regulation Count</th>
                </tr>
              </thead>
              <tbody>
                {agencyCounts.map((ac) => (
                  <tr key={ac.agencySlug}>
                    <td>{ac.agencyName}</td>
                    <td>{ac.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
