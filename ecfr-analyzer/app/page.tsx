/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import styles from './page.module.css';

interface Agency {
  slug: string;
  display_name: string;
}

interface AgencyCount {
  agencySlug: string;
  agencyName: string;
  count: number;
}

interface TitleSummary {
  number: number;
  name: string;
  latest_amended_on: string | null;
  latest_issue_date: string | null;
  up_to_date_as_of: string | null;
  reserved: boolean;
}

interface TitleLatest {
  identifier: string;
  name: string;
  date: string;
}

interface DailyCountsData {
  dates: { [key: string]: number };
}

export default function HomePage() {
  // Top agencies metric states
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [topAgencies, setTopAgencies] = useState<AgencyCount[]>([]);
  const [agenciesLoading, setAgenciesLoading] = useState<boolean>(false);

  // Latest titles/versions states
  const [latestTitles, setLatestTitles] = useState<TitleLatest[]>([]);
  const [titlesLoading, setTitlesLoading] = useState<boolean>(false);

  // Daily counts states
  const [dailyCounts, setDailyCounts] = useState<DailyCountsData | null>(null);
  const [dailyAvg, setDailyAvg] = useState<number | null>(null);
  const [dailyLoading, setDailyLoading] = useState<boolean>(false);

  // Outlier exclusion toggle
  const [excludeOutliers, setExcludeOutliers] = useState<boolean>(false);

  // ---------------------------
  //   FETCH TOP AGENCIES
  // ---------------------------
  useEffect(() => {
    async function fetchTopAgencies() {
      setAgenciesLoading(true);
      try {
        // 1. Fetch the list of agencies
        const agenciesRes = await fetch('/api/regulatoryAgencies/get');
        const agenciesJson = await agenciesRes.json();
        if (!agenciesJson.success) {
          throw new Error(agenciesJson.error || 'Failed to fetch agencies.');
        }
        const agencies: Agency[] = agenciesJson.data.agencies || [];

        // 2. Compute the date "selectedDays" ago (formatted as YYYY-MM-DD)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - selectedDays);
        const formattedDate = startDate.toISOString().split('T')[0];

        // 3. For each agency, call /api/search/count with the filter last_modified_after
        const countPromises = agencies.map(async (agency) => {
          const resCount = await fetch(
            `/api/search/count?agency_slugs[]=${agency.slug}&last_modified_after=${formattedDate}`
          );
          const countJson = await resCount.json();
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

        const allCounts = await Promise.all(countPromises);
        // 4. Sort by count desc and select the top 5
        allCounts.sort((a, b) => b.count - a.count);
        setTopAgencies(allCounts.slice(0, 5));
      } catch (error: any) {
        console.error('Error fetching top agencies:', error);
      } finally {
        setAgenciesLoading(false);
      }
    }
    fetchTopAgencies();
  }, [selectedDays]);

  // ---------------------------
  //   FETCH LATEST TITLES
  // ---------------------------
  useEffect(() => {
    async function fetchLatestTitles() {
      setTitlesLoading(true);
      try {
        // Call /api/titles to get all available titles
        const res = await fetch('/api/titles');
        const json = await res.json();

        if (json.success && json.data?.titles) {
          const summaries: TitleSummary[] = json.data.titles;
          const now = new Date();

          const validTitles = summaries
            .map((t) => {
              const issueDate = t.latest_issue_date ? new Date(t.latest_issue_date) : null;
              const amendDate = t.latest_amended_on ? new Date(t.latest_amended_on) : null;
              // whichever is more recent
              let effectiveDate: Date | null = null;
              if (issueDate && amendDate) {
                effectiveDate = issueDate > amendDate ? issueDate : amendDate;
              } else {
                effectiveDate = issueDate || amendDate;
              }

              return {
                title: t,
                effectiveDate,
              };
            })
            // Keep only titles with a valid date <= now
            .filter((obj) => obj.effectiveDate && obj.effectiveDate <= now);

          // Sort them desc by date
          validTitles.sort(
            (a, b) => (b.effectiveDate as Date).getTime() - (a.effectiveDate as Date).getTime()
          );

          // Take top 10, or top 5, etc. (Adjust as needed)
          const mostRecent = validTitles.slice(0, 10);

          const mapped: TitleLatest[] = mostRecent.map((obj) => {
            const t = obj.title;
            const dateStr = obj.effectiveDate
              ? obj.effectiveDate.toISOString().split('T')[0]
              : 'N/A';

            return {
              identifier: t.number.toString(),
              name: t.name,
              date: dateStr,
            };
          });

          setLatestTitles(mapped);
        } else {
          console.error('Error fetching titles:', json.error);
        }
      } catch (error) {
        console.error('Error fetching latest titles:', error);
      } finally {
        setTitlesLoading(false);
      }
    }
    fetchLatestTitles();
  }, []);

  // ---------------------------
  //   FETCH DAILY COUNTS
  // ---------------------------
  useEffect(() => {
    async function fetchDailyCounts() {
      setDailyLoading(true);
      try {
        const res = await fetch(`/api/search/dailycounts`);
        const json = (await res.json()) as {
          error?: any;
          success: boolean;
          data?: DailyCountsData;
        };
        if (json.success && json.data && json.data.dates) {
          setDailyCounts(json.data);
        } else {
          console.error('Error fetching daily counts:', json.error);
        }
      } catch (error) {
        console.error('Error fetching daily counts:', error);
      } finally {
        setDailyLoading(false);
      }
    }
    fetchDailyCounts();
  }, []);

  // ---------------------------
  //   RECALCULATE AVERAGE
  // ---------------------------
  useEffect(() => {
    if (!dailyCounts) {
      setDailyAvg(null);
      return;
    }

    const counts = Object.values(dailyCounts.dates) as number[];
    if (!counts.length) {
      setDailyAvg(null);
      return;
    }

    // If "excludeOutliers" is unchecked, simple average
    if (!excludeOutliers) {
      const sum = counts.reduce((a, b) => a + b, 0);
      setDailyAvg(sum / counts.length);
      return;
    }

    // Otherwise, compute mean, filter out points outside ±1 std dev
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance =
      counts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);

    // Keep data points within mean ± 1 std dev
    const lower = mean - stdDev;
    const upper = mean + stdDev;
    const filtered = counts.filter((val) => val >= lower && val <= upper);

    if (filtered.length === 0) {
      // If everything was outliered out, no average
      setDailyAvg(null);
      return;
    }

    const filteredSum = filtered.reduce((a, b) => a + b, 0);
    setDailyAvg(filteredSum / filtered.length);
  }, [dailyCounts, excludeOutliers]);

  return (
    <main className={styles.main}>
      <Navigation />
      <h1 className={styles.title}></h1>

      {/* Top 5 Agencies Section */}
      <section className={styles.metricsSection}>
        <h2>Top 5 Agencies by Count (Last {selectedDays} Days)</h2>
        <div className={styles.buttonGroup}>
          {[30, 60, 90].map((days) => (
            <button
              key={days}
              className={`${styles.metricButton} ${
                selectedDays === days ? styles.activeButton : ''
              }`}
              onClick={() => setSelectedDays(days)}
            >
              {days} Days
            </button>
          ))}
        </div>
        {agenciesLoading ? (
          <p>Loading top agencies...</p>
        ) : (
          <table className={styles.metricTable}>
            <thead>
              <tr>
                <th>Agency</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {topAgencies.map((agency, index) => (
                <tr key={index}>
                  <td>{agency.agencyName}</td>
                  <td>{agency.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Latest Titles/Versions Section */}
      <section className={styles.metricsSection}>
        <h2>Latest Titles/Version Updates</h2>
        {titlesLoading ? (
          <p>Loading latest titles...</p>
        ) : (
          <table className={styles.metricTable}>
            <thead>
              <tr>
                <th>Identifier</th>
                <th>Name</th>
                <th>Latest Date</th>
              </tr>
            </thead>
            <tbody>
              {latestTitles.map((title, index) => (
                <tr key={index}>
                  <td>{title.identifier}</td>
                  <td>{title.name}</td>
                  <td>{title.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Daily Count Average Section */}
      <section className={styles.metricsSection}>
        <h2>Daily Count Average</h2>
        {/* Checkbox for excluding outliers */}
        <div style={{ marginBottom: '1rem' }}>
          <label>
            <input
              type="checkbox"
              checked={excludeOutliers}
              onChange={(e) => setExcludeOutliers(e.target.checked)}
            />{' '}
            Exclude outliers (±1 std dev)
          </label>
        </div>
        {dailyLoading ? (
          <p>Loading daily counts...</p>
        ) : dailyAvg !== null ? (
          <p>Average daily count added: {dailyAvg.toFixed(2)}</p>
        ) : (
          <p>No daily counts data available.</p>
        )}
      </section>
    </main>
  );
}
