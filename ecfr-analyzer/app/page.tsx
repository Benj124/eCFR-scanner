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

/** Basic shape of each title returned from /api/titles */
interface TitleSummary {
  number: number;
  name: string;
  latest_amended_on: string | null;
  latest_issue_date: string | null;
  up_to_date_as_of: string | null;
  reserved: boolean;
}

/** We’ll display a short set of fields */
interface TitleLatest {
  identifier: string;
  name: string;
  date: string; // e.g. '2024-01-05' or 'N/A'
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dailyCounts, setDailyCounts] = useState<DailyCountsData | null>(null);
  const [dailyAvg, setDailyAvg] = useState<number | null>(null);
  const [dailyLoading, setDailyLoading] = useState<boolean>(false);

  // Fetch top agencies metric based on selectedDays (30/60/90)
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

  // Fetch the latest Titles/Versions (most recent 5 from "today" back)
  useEffect(() => {
    async function fetchLatestTitles() {
      setTitlesLoading(true);
      try {
        // Call /api/titles to get all available titles
        const res = await fetch('/api/titles');
        const json = await res.json();

        if (json.success && json.data?.titles) {
          // `titles` is an array of TitleSummary
          const summaries: TitleSummary[] = json.data.titles;

          // We'll define a helper to get the latest date from each summary
          const now = new Date();
          const validTitles = summaries
            .map((t) => {
              // Determine which date is more recent
              const issueDate = t.latest_issue_date ? new Date(t.latest_issue_date) : null;
              const amendDate = t.latest_amended_on ? new Date(t.latest_amended_on) : null;
              // Find the more recent of the two (if both exist)
              let effectiveDate: Date | null = null;
              if (issueDate && amendDate) {
                effectiveDate = issueDate > amendDate ? issueDate : amendDate;
              } else {
                effectiveDate = issueDate || amendDate; // whichever is non-null
              }

              return {
                title: t,
                effectiveDate,
              };
            })
            .filter((obj) => {
              // Keep only titles with a valid date that is <= now
              return obj.effectiveDate && obj.effectiveDate <= now;
            });

          // Sort them by effectiveDate desc
          validTitles.sort((a, b) => (b.effectiveDate as Date).getTime() - (a.effectiveDate as Date).getTime());

          // Take the top 5
          const mostRecent5 = validTitles.slice(0, 10);

          // Map to your TitleLatest shape
          const mapped: TitleLatest[] = mostRecent5.map((obj) => {
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

  // Fetch daily counts and compute average
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
          const counts = Object.values(json.data.dates) as number[];
          if (counts.length > 0) {
            const sum = counts.reduce((a, b) => a + b, 0);
            setDailyAvg(sum / counts.length);
          }
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
