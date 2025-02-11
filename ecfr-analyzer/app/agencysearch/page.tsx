/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import LineChart from '../components/LineChart'; // Adjust path as needed

export default function AgencySearchDashboard() {
  const searchParams = useSearchParams();
  const initialAgency = searchParams.get('agencySlug') || '';
  const [selectedAgency, setSelectedAgency] = useState<string>(initialAgency);
  const [selectedChildAgency, setSelectedChildAgency] = useState<string>('');
  const [agencyList, setAgencyList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // States for search endpoints data
  const [resultsData, setResultsData] = useState<any>(null);
  const [countData, setCountData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [dailyCounts, setDailyCounts] = useState<any>(null);
  const [titlesData, setTitlesData] = useState<any>(null);
  const [hierarchyData, setHierarchyData] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any>(null);

  // Fetch agency list for the dropdown
  useEffect(() => {
    async function fetchAgencies() {
      try {
        const res = await fetch('/api/regulatoryAgencies/get');
        const json = await res.json();
        if (json.success) {
          setAgencyList(json.data.agencies || []);
        }
      } catch (error) {
        console.error('Error fetching agencies list:', error);
      }
    }
    fetchAgencies();
  }, []);

  // Fetch dashboard data when selectedAgency or selectedChildAgency changes
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        // Use child selection if available, else use parent selection.
        const queryAgency = selectedChildAgency || selectedAgency;
        const query = queryAgency ? `?agency_slugs[]=${queryAgency}` : '';
        const endpoints = {
          results: `/api/search/results${query}`,
          count: `/api/search/count${query}`,
          summary: `/api/search/summary${query}`,
          daily: `/api/search/dailycounts${query}`,
          titles: `/api/search/titlecounts${query}`,
          hierarchy: `/api/search/hierarchy${query}`,
          suggestions: `/api/search/suggestions${query}`,
        };

        const fetchEndpoint = async (url: string) => {
          const res = await fetch(url, { method: 'GET' });
          if (!res.ok) {
            throw new Error(`Error fetching ${url}`);
          }
          return res.json();
        };

        const results = await fetchEndpoint(endpoints.results);
        const count = await fetchEndpoint(endpoints.count);
        const summary = await fetchEndpoint(endpoints.summary);
        const daily = await fetchEndpoint(endpoints.daily);
        const titles = await fetchEndpoint(endpoints.titles);
        const hierarchy = await fetchEndpoint(endpoints.hierarchy);
        const sugg = await fetchEndpoint(endpoints.suggestions);

        // Extract the inner "data" property from each endpoint response.
        setResultsData(results.data);
        setCountData(count.data);
        setSummaryData(summary.data);
        setDailyCounts(daily.data);
        setTitlesData(titles.data);
        setHierarchyData(hierarchy.data);
        setSuggestions(sugg.data);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [selectedAgency, selectedChildAgency]);

  const handleParentDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAgency(e.target.value);
    setSelectedChildAgency('');
  };

  const handleChildDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedChildAgency(e.target.value);
  };

  // Get the selected parent agency object
  const parentAgency = agencyList.find((a) => a.slug === selectedAgency);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>Agency Search Dashboard</h1>
        <div className={styles.dropdownContainer}>
          <label htmlFor="agencyDropdown" className={styles.dropdownLabel}>
            Select Agency:
          </label>
          <select
            id="agencyDropdown"
            value={selectedAgency}
            onChange={handleParentDropdownChange}
            className={styles.dropdown}
          >
            <option value="">All Agencies</option>
            {agencyList.map((agency) => (
              <option key={agency.slug} value={agency.slug}>
                {agency.display_name}
              </option>
            ))}
          </select>
          {parentAgency &&
            parentAgency.children &&
            parentAgency.children.length > 0 && (
              <>
                <label htmlFor="childAgencyDropdown" className={styles.dropdownLabel}>
                  Child Agencies:
                </label>
                <select
                  id="childAgencyDropdown"
                  value={selectedChildAgency}
                  onChange={handleChildDropdownChange}
                  className={styles.dropdown}
                >
                  <option value="">-- Select Child Agency --</option>
                  {parentAgency.children.map((child: any) => (
                    <option key={child.slug} value={child.slug}>
                      {child.display_name}
                    </option>
                  ))}
                </select>
              </>
            )}
        </div>
      </header>

      {loading && <p>Loading dashboard data...</p>}
      {!loading && (
        <div className={styles.dashboardContent}>
          {/* Daily Counts Section with Line Chart */}
          <section className={styles.section}>
            <h2>Daily Counts</h2>
            {dailyCounts && dailyCounts.dates ? (
              (() => {
                const sortedDates = Object.keys(dailyCounts.dates).sort(
                  (a, b) => new Date(a).getTime() - new Date(b).getTime()
                );
                const totalCount = sortedDates.reduce(
                  (sum, date) => sum + Number(dailyCounts.dates[date]),
                  0
                );
                return (
                  <>
                    <div className={styles.chartContainer}>
                      <LineChart data={dailyCounts.dates} />
                    </div>
                    <div className={styles.scrollableArea}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Count ({totalCount})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedDates.map((date) => (
                            <tr key={date}>
                              <td>{date}</td>
                              <td>{dailyCounts.dates[date]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()
            ) : (
              <p>No daily counts data.</p>
            )}
          </section>

          {/* Other sections remain unchanged... */}

          {/* Search Results Section */}
          <section className={styles.section}>
            <h2>Search Results</h2>
            {resultsData && resultsData.results && resultsData.results.length > 0 ? (
              <div className={styles.scrollableArea}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Starts On</th>
                      <th>Ends On</th>
                      <th>Type</th>
                      <th>Score</th>
                      <th>Section Heading</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultsData.results.map((result: any, index: number) => (
                      <tr key={index}>
                        <td>{result.starts_on || 'N/A'}</td>
                        <td>{result.ends_on || 'N/A'}</td>
                        <td>{result.type || 'N/A'}</td>
                        <td>{result.score || 'N/A'}</td>
                        <td>{result.headings?.section || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No search results found.</p>
            )}
          </section>

          {/* Count Section */}
          <section className={styles.section}>
            <h2>Count</h2>
            {countData && countData.meta ? (
              <div className={styles.scrollableArea}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Total Count</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{countData.meta.total_count || 'N/A'}</td>
                      <td>{countData.meta.description || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No count data.</p>
            )}
          </section>

          {/* Summary Section */}
          <section className={styles.section}>
            <h2>Summary</h2>
            {summaryData && summaryData.meta ? (
              <div className={styles.scrollableArea}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{summaryData.meta.description || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No summary data.</p>
            )}
          </section>

          {/* Titles Section */}
          <section className={styles.section}>
            <h2>Titles</h2>
            {titlesData && titlesData.titles ? (
              <div className={styles.scrollableArea}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(titlesData.titles).map(
                      ([title, count]: [string, any]) => (
                        <tr key={title}>
                          <td>{title}</td>
                          <td>{count}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No titles data.</p>
            )}
          </section>

          {/* Hierarchy Section */}
          <section className={styles.section}>
            <h2>Hierarchy</h2>
            {hierarchyData && hierarchyData.children ? (
              <div className={styles.scrollableArea}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th>Hierarchy</th>
                      <th>Heading</th>
                      <th>Count</th>
                      <th>Max Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hierarchyData.children.map((child: any, index: number) => (
                      <tr key={index}>
                        <td>{child.level || 'N/A'}</td>
                        <td>{child.hierarchy || 'N/A'}</td>
                        <td>{child.heading || 'N/A'}</td>
                        <td>{child.count || 'N/A'}</td>
                        <td>{child.max_score || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No hierarchy data.</p>
            )}
          </section>

          {/* Suggestions Section */}
          <section className={styles.section}>
            <h2>Suggestions</h2>
            {suggestions &&
            suggestions.suggestions &&
            suggestions.suggestions.length > 0 ? (
              <div className={styles.scrollableArea}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Suggestion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.suggestions.map((suggestion: any, index: number) => (
                      <tr key={index}>
                        <td>{suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No suggestions.</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
