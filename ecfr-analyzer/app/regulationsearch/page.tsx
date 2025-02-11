/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import Navigation from '../components/Navigation';

export default function RegulationSearchPage() {
  // Search term and additional filters
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const [lastModifiedAfter, setLastModifiedAfter] = useState('');
  const [lastModifiedOnOrAfter, setLastModifiedOnOrAfter] = useState('');
  const [lastModifiedBefore, setLastModifiedBefore] = useState('');
  const [lastModifiedOnOrBefore, setLastModifiedOnOrBefore] = useState('');
  const [perPage, setPerPage] = useState('');
  const [page, setPage] = useState('');

  // Agency selection state
  const [selectedAgency, setSelectedAgency] = useState('');
  const [selectedChildAgency, setSelectedChildAgency] = useState('');
  const [agencyList, setAgencyList] = useState<any[]>([]);

  // State for results and loading indicator
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch the agency list (from our regulatory agencies endpoint)
  useEffect(() => {
    async function fetchAgencies() {
      try {
        const res = await fetch('/api/regulatoryAgencies/get');
        const json = await res.json();
        if (json.success) {
          setAgencyList(json.data.agencies || []);
        }
      } catch (error) {
        console.error('Error fetching agencies:', error);
      }
    }
    fetchAgencies();
  }, []);

  // Get the selected parent agency object (if any) for showing child options.
  const parentAgency = agencyList.find((a) => a.slug === selectedAgency);

  // When the search button is clicked, build a query string with all filters
  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (date) params.append('date', date);
      if (lastModifiedAfter) params.append('last_modified_after', lastModifiedAfter);
      if (lastModifiedOnOrAfter) params.append('last_modified_on_or_after', lastModifiedOnOrAfter);
      if (lastModifiedBefore) params.append('last_modified_before', lastModifiedBefore);
      if (lastModifiedOnOrBefore) params.append('last_modified_on_or_before', lastModifiedOnOrBefore);
      if (perPage) params.append('per_page', perPage);
      if (page) params.append('page', page);

      // Use child agency if selected, otherwise use parent.
      const agencySlug = selectedChildAgency || selectedAgency;
      if (agencySlug) {
        params.append('agency_slugs[]', agencySlug);
      }

      const res = await fetch(`/api/search/results?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        // Assume our API route wraps the external data in a "data" property.
        setResults(data.data);
      } else {
        console.error('Error:', data.error);
        setResults(null);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
        <Navigation />
      <header className={styles.header}>
        <h1 className={styles.title}></h1>
      </header>
      {/* Search Filters */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Enter search term..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.filtersContainer}>
          <div className={styles.filterGroup}>
            <label htmlFor="date">Date:</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="lastModifiedAfter">Last Modified After:</label>
            <input
              type="date"
              id="lastModifiedAfter"
              value={lastModifiedAfter}
              onChange={(e) => setLastModifiedAfter(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="lastModifiedOnOrAfter">Last Modified On or After:</label>
            <input
              type="date"
              id="lastModifiedOnOrAfter"
              value={lastModifiedOnOrAfter}
              onChange={(e) => setLastModifiedOnOrAfter(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="lastModifiedBefore">Last Modified Before:</label>
            <input
              type="date"
              id="lastModifiedBefore"
              value={lastModifiedBefore}
              onChange={(e) => setLastModifiedBefore(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="lastModifiedOnOrBefore">Last Modified On or Before:</label>
            <input
              type="date"
              id="lastModifiedOnOrBefore"
              value={lastModifiedOnOrBefore}
              onChange={(e) => setLastModifiedOnOrBefore(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="perPage">Results Per Page:</label>
            <input
              type="number"
              id="perPage"
              placeholder="20"
              value={perPage}
              onChange={(e) => setPerPage(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="page">Page:</label>
            <input
              type="number"
              id="page"
              placeholder="1"
              value={page}
              onChange={(e) => setPage(e.target.value)}
            />
          </div>
        </div>
        {/* Agency Selection */}
        <div className={styles.agencySelection}>
          <label htmlFor="agencyDropdown" className={styles.dropdownLabel}>
            Search Under Agency:
          </label>
          <select
            id="agencyDropdown"
            value={selectedAgency}
            onChange={(e) => {
              setSelectedAgency(e.target.value);
              setSelectedChildAgency('');
            }}
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
                  onChange={(e) => setSelectedChildAgency(e.target.value)}
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
        <button onClick={handleSearch} className={styles.button}>
          Search
        </button>
      </div>
      {loading && <p>Loading...</p>}
      {results && results.results && results.results.length > 0 ? (
        <div className={styles.resultsContainer}>
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
              {results.results.map((result: any, index: number) => (
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
      ) : results ? (
        <p>No results found.</p>
      ) : null}
    </main>
  );
}
