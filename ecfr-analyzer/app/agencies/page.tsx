'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface CFRReference {
  title: number;
  chapter: string;
}

export interface Agency {
  name: string;
  short_name?: string;
  display_name: string;
  slug: string;
  children?: Agency[];
  cfr_references?: CFRReference[];
}

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // For the header search dropdowns:
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [selectedChildAgency, setSelectedChildAgency] = useState<string>('');
  // New state to toggle display of children in the table
  const [expandedAgency, setExpandedAgency] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    async function fetchAgencies() {
      try {
        const res = await fetch('/api/regulatoryAgencies/get', { method: 'GET' });
        const json = await res.json();
        if (json.success) {
          setAgencies(json.data.agencies || []);
        } else {
          console.error('Error from API:', json.error);
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAgencies();
  }, []);

  // When the parent dropdown changes, clear any child selection.
  const handleParentDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAgency(e.target.value);
    setSelectedChildAgency('');
  };

  const handleChildDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedChildAgency(e.target.value);
  };

  // "Go" button in the header uses the child agency if available, else the parent.
  const handleGoDashboard = () => {
    const agencySlug = selectedChildAgency || selectedAgency;
    router.push(`/agencysearch?agencySlug=${agencySlug}`);
  };

  // Toggle the expanded agency (for "View Children" in the table)
  const toggleExpandedAgency = (agencySlug: string) => {
    setExpandedAgency((prev) => (prev === agencySlug ? '' : agencySlug));
  };

  // Find the selected parent agency (for dropdown child options)
  const parentAgency = agencies.find((a) => a.slug === selectedAgency);
  // Find the expanded agency object (for displaying children table below)
  const expandedAgencyObj = agencies.find((a) => a.slug === expandedAgency);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>Agency List</h1>
        <div className={styles.dropdownContainer}>
          <label htmlFor="agencyDropdown" className={styles.dropdownLabel}>
            Search Agency:
          </label>
          <select
            id="agencyDropdown"
            value={selectedAgency}
            onChange={handleParentDropdownChange}
            className={styles.dropdown}
          >
            <option value="">All Agencies</option>
            {agencies.map((agency) => (
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
                  {parentAgency.children.map((child) => (
                    <option key={child.slug} value={child.slug}>
                      {child.display_name}
                    </option>
                  ))}
                </select>
              </>
            )}
          <button className={styles.button} onClick={handleGoDashboard}>
            Go
          </button>
        </div>
      </header>

      {loading && <p>Loading agencies...</p>}
      {!loading && agencies.length === 0 && <p>No agencies found.</p>}

      {/* Main Agencies Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Display Name</th>
              <th>Short Name</th>
              <th>Slug</th>
              <th>Children Count</th>
              <th>View Children</th>
              <th>Search Agency</th>
            </tr>
          </thead>
          <tbody>
            {agencies.map((agency) => (
              <tr key={agency.slug}>
                <td>{agency.display_name}</td>
                <td>{agency.short_name || ''}</td>
                <td>{agency.slug}</td>
                <td>{agency.children?.length || 0}</td>
                <td>
                  {agency.children && agency.children.length > 0 ? (
                    <button
                      className={styles.button}
                      onClick={() => toggleExpandedAgency(agency.slug)}
                    >
                      {expandedAgency === agency.slug ? 'Hide Children' : 'Show Children'}
                    </button>
                  ) : (
                    <em>No Children</em>
                  )}
                </td>
                <td>
                  <button
                    className={styles.button}
                    onClick={() =>
                      router.push(`/agencysearch?agencySlug=${agency.slug}`)
                    }
                  >
                    Search Agency
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expanded Child Agencies Table */}
      {expandedAgency && expandedAgencyObj && expandedAgencyObj.children && expandedAgencyObj.children.length > 0 && (
        <div className={styles.childContainer}>
          <h2>{expandedAgencyObj.display_name} - Children</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Display Name</th>
                  <th>Short Name</th>
                  <th>Slug</th>
                  <th>CFR References</th>
                  <th>Search Agency</th>
                </tr>
              </thead>
              <tbody>
                {expandedAgencyObj.children.map((child) => {
                  let cfrRefs = 'None';
                  if (child.cfr_references && child.cfr_references.length > 0) {
                    cfrRefs = child.cfr_references
                      .map((ref) => `Title ${ref.title} Chapter ${ref.chapter}`)
                      .join('; ');
                  }
                  return (
                    <tr key={child.slug}>
                      <td>{child.display_name}</td>
                      <td>{child.short_name || ''}</td>
                      <td>{child.slug}</td>
                      <td>{cfrRefs}</td>
                      <td>
                        <button
                          className={styles.button}
                          onClick={() =>
                            router.push(`/agencysearch?agencySlug=${child.slug}`)
                          }
                        >
                          Search Agency
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
