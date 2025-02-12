'use client';

import React, { useEffect, useState } from 'react';
import styles from './page.module.css';
import Navigation from '../components/Navigation';

interface TitleSummary {
  number: number;
  name: string;
  latest_amended_on: string | null;
  latest_issue_date: string | null;
  up_to_date_as_of: string | null;
  reserved: boolean;
}

interface TitleVersion {
  date: string;
  amendment_date: string;
  issue_date: string;
  identifier: string;
  name: string;
  part: string;
  substantive: boolean;
  removed: boolean;
  subpart: string | null;
  title: string;
  type: string;
}

export default function TitlesPage() {
  const [titles, setTitles] = useState<TitleSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedTitle, setExpandedTitle] = useState<number | null>(null);
  const [versionData, setVersionData] = useState<TitleVersion[] | null>(null);
  const [versionLoading, setVersionLoading] = useState<boolean>(false);

  // Fetch the titles summary data on mount
  useEffect(() => {
    async function fetchTitles() {
      try {
        const res = await fetch('/api/titles');
        const json = await res.json();
        if (json.success && json.data.titles) {
          // Assume the response has { "titles": [ ... ], "meta": { ... } }
          setTitles(json.data.titles);
        } else {
          console.error('Error fetching titles:', json.error);
        }
      } catch (error) {
        console.error('Error fetching titles:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTitles();
  }, []);

  // Toggle expansion for a given title number
  const toggleExpansion = async (titleNumber: number) => {
    if (expandedTitle === titleNumber) {
      setExpandedTitle(null);
      setVersionData(null);
    } else {
      setExpandedTitle(titleNumber);
      setVersionLoading(true);
      try {
        const res = await fetch(`/api/titles/version?title=${titleNumber}`);
        const json = await res.json();
        if (json.success && json.data.content_versions) {
          setVersionData(json.data.content_versions);
        } else {
          console.error('Error fetching title versions:', json.error);
          setVersionData(null);
        }
      } catch (error) {
        console.error('Error fetching title versions:', error);
        setVersionData(null);
      } finally {
        setVersionLoading(false);
      }
    }
  };

  return (
    <main className={styles.main}>
      <Navigation />
      <h1 className={styles.title}></h1>
      {loading ? (
        <p>Loading titles...</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Title #</th>
                <th>Name</th>
                <th>Latest Amended On</th>
                <th>Latest Issue Date</th>
                <th>Up To Date As Of</th>
                <th>Reserved</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {titles.map((title) => (
                <React.Fragment key={title.number}>
                  <tr>
                    <td>{title.number}</td>
                    <td>{title.name}</td>
                    <td>{title.latest_amended_on || 'N/A'}</td>
                    <td>{title.latest_issue_date || 'N/A'}</td>
                    <td>{title.up_to_date_as_of || 'N/A'}</td>
                    <td>{title.reserved ? 'Yes' : 'No'}</td>
                    <td>
                      <button
                        className={styles.expandButton}
                        onClick={() => toggleExpansion(title.number)}
                      >
                        {expandedTitle === title.number ? '-' : '+'}
                      </button>
                    </td>
                  </tr>
                  {expandedTitle === title.number && (
                    <tr>
                      <td colSpan={7} className={styles.expandedRow}>
                        {versionLoading ? (
                          <p>Loading version data...</p>
                        ) : versionData ? (
                          <table className={styles.innerTable}>
                            <thead>
                              <tr>
                                <th>Identifier</th>
                                <th>Name</th>
                                <th>Part</th>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Issue Date</th>
                              </tr>
                            </thead>
                            <tbody>
                            {versionData.map((version, index) => (
                                <tr key={`${version.identifier}-${index}`}>
                                <td>{version.identifier}</td>
                                <td>{version.name}</td>
                                <td>{version.part}</td>
                                <td>{version.type}</td>
                                <td>{version.date}</td>
                                <td>{version.issue_date}</td>
                                </tr>
                            ))}
                            </tbody>
                          </table>
                        ) : (
                          <p>No version data found.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
