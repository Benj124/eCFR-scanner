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

interface XmlState {
  xml: string;
  loading: boolean;
  expanded: boolean;
}

/**
 * Helper function to recursively render XML nodes.
 * This function ignores raw tags and outputs nested content.
 */
function renderXMLNode(node: ChildNode): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    const trimmed = node.textContent?.trim();
    return trimmed ? trimmed : null;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    return (
      <div className={`xml-${element.tagName.toLowerCase()}`}>
        {Array.from(node.childNodes).map((child, i) => (
          <div key={i} className={styles.xmlNode}>
            {renderXMLNode(child)}
          </div>
        ))}
      </div>
    );
  }
  return null;
}

/**
 * XMLViewer component uses DOMParser to convert the XML string
 * into a DOM and then renders it as JSX.
 */
function XMLViewer({ xmlString }: { xmlString: string }) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
  const root = xmlDoc.documentElement;
  return <div className={styles.xmlContainer}>{renderXMLNode(root)}</div>;
}

export default function TitlesPage() {
  const [titles, setTitles] = useState<TitleSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // State and handlers for version data
  const [expandedTitle, setExpandedTitle] = useState<number | null>(null);
  const [versionData, setVersionData] = useState<TitleVersion[] | null>(null);
  const [versionLoading, setVersionLoading] = useState<boolean>(false);

  // State and handlers for XML expansions (within version data)
  const [expandedXml, setExpandedXml] = useState<{ [key: string]: XmlState }>({});

  // State and handlers for the "Structure Metadata" expansions
  const [expandedStructure, setExpandedStructure] = useState<{ [key: number]: boolean }>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [structureData, setStructureData] = useState<{ [key: number]: any }>({});

  // 1. Fetch the titles summary on mount
  useEffect(() => {
    async function fetchTitles() {
      try {
        const res = await fetch('/api/titles');
        const json = await res.json();
        if (json.success && json.data.titles) {
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

  // 2. Toggle (expand/collapse) version data for a given title
  const toggleExpansion = async (titleNumber: number) => {
    if (expandedTitle === titleNumber) {
      // Collapse if this title is already expanded
      setExpandedTitle(null);
      setVersionData(null);
    } else {
      // Expand new title
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

  // 3. Toggle (expand/collapse) XML data for a given version
  // versionKey is something like "identifier-index" to keep them unique
  const toggleXml = async (
    versionKey: string,
    date: string,
    title: string,
    section: string
  ) => {
    setExpandedXml((prev) => {
      const current = prev[versionKey];
      if (current && current.expanded) {
        // Currently expanded => collapse
        return { ...prev, [versionKey]: { ...current, expanded: false } };
      } else {
        // Expand (set loading if data not yet fetched)
        return {
          ...prev,
          [versionKey]: { xml: '', loading: true, expanded: true },
        };
      }
    });

    // If we already have XML and it's expanded, no need to refetch
    if (expandedXml[versionKey] && expandedXml[versionKey].xml) {
      return;
    }

    try {
      const res = await fetch(
        `/api/titles/section?date=${encodeURIComponent(date)}&title=${encodeURIComponent(
          title
        )}&section=${encodeURIComponent(section)}`
      );
      if (!res.ok) {
        const errorText = `Error loading XML: ${res.status}`;
        setExpandedXml((prev) => ({
          ...prev,
          [versionKey]: { xml: errorText, loading: false, expanded: true },
        }));
      } else {
        const xmlText = await res.text();
        setExpandedXml((prev) => ({
          ...prev,
          [versionKey]: { xml: xmlText, loading: false, expanded: true },
        }));
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setExpandedXml((prev) => ({
        ...prev,
        [versionKey]: {
          xml: 'Error loading XML',
          loading: false,
          expanded: true,
        },
      }));
    }
  };

  // 4. Toggle (expand/collapse) "Structure Metadata" for a given title
  const toggleStructure = async (titleNumber: number, date: string) => {
    // Determine whether we are about to expand or collapse
    const isExpanding = !expandedStructure[titleNumber];

    // Flip the expanded state
    setExpandedStructure((prev) => ({
      ...prev,
      [titleNumber]: isExpanding,
    }));

    // Only fetch if we're expanding and have not fetched before
    if (isExpanding && !structureData[titleNumber]) {
      try {
        const res = await fetch(`/api/structure?date=${date}&title=${titleNumber}`);
        const json = await res.json();
        setStructureData((prev) => ({
          ...prev,
          [titleNumber]: json, // Store the entire JSON response
        }));
      } catch (error) {
        setStructureData((prev) => ({
          ...prev,
          [titleNumber]: { error: (error as Error).message },
        }));
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
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {titles.map((title) => {
                // We can pick a fallback date if latest_issue_date is null
                const dateForStructure = title.latest_issue_date || '2025-02-11';
  
                return (
                  <React.Fragment key={title.number}>
                    <tr>
                      <td>{title.number}</td>
                      <td>{title.name}</td>
                      <td>{title.latest_amended_on || 'N/A'}</td>
                      <td>{title.latest_issue_date || 'N/A'}</td>
                      <td>{title.up_to_date_as_of || 'N/A'}</td>
                      <td>{title.reserved ? 'Yes' : 'No'}</td>
                      {/* Button for the Version Details expansion */}
                      <td>
                        <button
                          className={styles.expandButton}
                          onClick={() => toggleExpansion(title.number)}
                        >
                          {expandedTitle === title.number ? '-' : '+'}
                        </button>
                      </td>
                      {/* Button for the Structure Metadata expansion */}
                      <td>
                        <button
                          className={styles.expandButton}
                          onClick={() => toggleStructure(title.number, dateForStructure)}
                        >
                          {expandedStructure[title.number] ? '-' : '+'}
                        </button>
                      </td>
                    </tr>
  
                    {/* Expanded row: Structure Metadata */}
                    {expandedStructure[title.number] && (
                      <tr>
                        <td colSpan={8} className={styles.expandedRow}>
                          {structureData[title.number] ? (
                            <div style={{ textAlign: 'left' }}>
                              <pre>
                                {JSON.stringify(structureData[title.number], null, 2)}
                              </pre>
                            </div>
                          ) : (
                            <p>Loading structure data...</p>
                          )}
                        </td>
                      </tr>
                    )}
  
                    {/* Expanded row: Version Details */}
                    {expandedTitle === title.number && (
                      <tr>
                        <td colSpan={8} className={styles.expandedRow}>
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
                                  <th>XML</th>
                                </tr>
                              </thead>
                              <tbody>
                                {versionData.map((version, index) => {
                                  const versionKey = `${version.identifier}-${index}`;
                                  const xmlState = expandedXml[versionKey];
  
                                  return (
                                    <React.Fragment key={versionKey}>
                                      <tr>
                                        <td>{version.identifier}</td>
                                        <td>{version.name}</td>
                                        <td>{version.part}</td>
                                        <td>{version.type}</td>
                                        <td>{version.date}</td>
                                        <td>{version.issue_date}</td>
                                        <td>
                                          <button
                                            className={styles.expandButton}
                                            onClick={() =>
                                              toggleXml(
                                                versionKey,
                                                version.date,
                                                version.title,
                                                version.identifier
                                              )
                                            }
                                          >
                                            {xmlState && xmlState.expanded ? '-' : '+'}
                                          </button>
                                        </td>
                                      </tr>
                                      {xmlState && xmlState.expanded && (
                                        <tr>
                                          <td colSpan={7} className={styles.xmlRow}>
                                            {xmlState.loading ? (
                                              <p>Loading XML...</p>
                                            ) : (
                                              <XMLViewer xmlString={xmlState.xml} />
                                            )}
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <p>No version data found.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );  
}
