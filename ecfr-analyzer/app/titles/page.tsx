/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect, useState } from 'react';
import styles from './page.module.css';
import Navigation from '../components/Navigation';

//
// Existing interfaces for Titles and Versions
//
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

//
// New interface for the structure data returned by /api/structure
// (You can adjust as needed if your real data differs)
//
interface StructureNode {
  identifier: string;
  label: string;
  label_level: string;
  label_description: string;
  type: string;
  size: number;
  reserved: boolean;
  children?: StructureNode[];
  // Add any other fields you wish to display...
}

//
// Recursive component to display a single node and its children.
// This transforms nested JSON into a visually structured layout.
//
function StructureViewer({ node }: { node: StructureNode }) {
  return (
    <div className={styles.structureNode}>
      <div className={styles.structureHeader}>
        {node.label_level} {node.label_description}
      </div>
      <div className={styles.structureMeta}>
        <p>
          <strong>Identifier:</strong> {node.identifier}
        </p>
        <p>
          <strong>Type:</strong> {node.type}
        </p>
        <p>
          <strong>Reserved:</strong> {node.reserved ? 'Yes' : 'No'}
        </p>
        <p>
          <strong>Size:</strong> {node.size}
        </p>
      </div>
      {node.children && node.children.length > 0 && (
        <div className={styles.structureChildren}>
          {node.children.map((child, index) => (
            <StructureViewer key={index} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

//
// Helper function to recursively render XML nodes
// (unchanged from your original code)
//
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

//
// XMLViewer to display the fetched XML as JSX
// (unchanged from your original code)
//
function XMLViewer({ xmlString }: { xmlString: string }) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
  const root = xmlDoc.documentElement;
  return <div className={styles.xmlContainer}>{renderXMLNode(root)}</div>;
}

export default function TitlesPage() {
  // Existing state for Titles
  const [titles, setTitles] = useState<TitleSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // State for expanded Title Versions
  const [expandedTitle, setExpandedTitle] = useState<number | null>(null);
  const [versionData, setVersionData] = useState<TitleVersion[] | null>(null);
  const [versionLoading, setVersionLoading] = useState<boolean>(false);

  // State for XML expansions
  const [expandedXml, setExpandedXml] = useState<{ [key: string]: XmlState }>({});

  // State to expand/collapse structure metadata
  const [expandedStructure, setExpandedStructure] = useState<{ [key: number]: boolean }>({});
  // Keep the structure response data, keyed by title.number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [structureData, setStructureData] = useState<{ [key: number]: any }>({});

  //
  // Fetch the titles summary data on mount
  //
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

  //
  // Toggle expansion for a given title's version data
  //
  const toggleExpansion = async (titleNumber: number) => {
    if (expandedTitle === titleNumber) {
      // Collapse if already expanded
      setExpandedTitle(null);
      setVersionData(null);
    } else {
      // Expand
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

  //
  // Toggle XML expansion for a version row
  //
  const toggleXml = async (
    versionKey: string,
    date: string,
    title: string,
    section: string
  ) => {
    // Flip the expansion state
    setExpandedXml((prev) => {
      const current = prev[versionKey];
      if (current && current.expanded) {
        // Collapse if expanded
        return { ...prev, [versionKey]: { ...current, expanded: false } };
      } else {
        // Expand, mark loading if no data yet
        return {
          ...prev,
          [versionKey]: { xml: '', loading: true, expanded: true },
        };
      }
    });

    // If we already have data and are re-expanding, don't refetch
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

  //
  // Toggle expansion for the "Structure Metadata" column
  //
  const toggleStructure = async (titleNumber: number, date: string) => {
    // Flip current expansion
    const isExpanding = !expandedStructure[titleNumber];
    setExpandedStructure((prev) => ({
      ...prev,
      [titleNumber]: isExpanding,
    }));

    // If expanding and no data fetched yet, fetch from /api/structure
    if (isExpanding && !structureData[titleNumber]) {
      try {
        const res = await fetch(`/api/structure?date=${date}&title=${titleNumber}`);
        const json = await res.json();

        setStructureData((prev) => ({
          ...prev,
          [titleNumber]: json, // store entire response
        }));
      } catch (error) {
        setStructureData((prev) => ({
          ...prev,
          [titleNumber]: { error: (error as Error).message },
        }));
      }
    }
  };

  //
  // Render the UI
  //
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
                // Fallback date if needed
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
                      {/* Button to expand/collapse version details */}
                      <td>
                        <button
                          className={styles.expandButton}
                          onClick={() => toggleExpansion(title.number)}
                        >
                          {expandedTitle === title.number ? '-' : '+'}
                        </button>
                      </td>
                      {/* Button to expand/collapse structure metadata */}
                      <td>
                        <button
                          className={styles.expandButton}
                          onClick={() => toggleStructure(title.number, dateForStructure)}
                        >
                          {expandedStructure[title.number] ? '-' : '+'}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded row for "Structure Metadata" */}
                    {expandedStructure[title.number] && (
                      <tr>
                        <td colSpan={8} className={styles.expandedRow}>
                          {structureData[title.number] ? (
                            structureData[title.number].success ? (
                              <StructureViewer node={structureData[title.number].data} />
                            ) : (
                              <p>
                                {structureData[title.number].error ||
                                  'Error loading structure data.'}
                              </p>
                            )
                          ) : (
                            <p>Loading structure data...</p>
                          )}
                        </td>
                      </tr>
                    )}

                    {/* Expanded row for Title Version details */}
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
