/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import Navigation from "../components/Navigation";
import SummaryBot from "../components/SummaryBot";

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

interface StructureNode {
  identifier: string;
  label: string;
  label_level: string;
  label_description: string;
  type: string;
  size: number;
  reserved: boolean;
  children?: StructureNode[];
}

function StructureViewer({ node }: { node: StructureNode }) {
  return (
    <div className={styles.structureNode}>
      <div className={styles.structureHeader}>
        {node.label_level} {node.label_description}
        <SummaryBot
          title={`${node.label_level} ${node.label_description}`}
          identifier={node.identifier}
        />
      </div>
      <div className={styles.structureMeta}>
        <p><strong>Identifier:</strong> {node.identifier}</p>
        <p><strong>Type:</strong> {node.type}</p>
        <p><strong>Reserved:</strong> {node.reserved ? "Yes" : "No"}</p>
        <p><strong>Size:</strong> {node.size}</p>
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

function XMLViewer({ xmlString }: { xmlString: string }) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");
  const root = xmlDoc.documentElement;
  return <div className={styles.xmlContainer}>{renderXMLNode(root)}</div>;
}

export default function TitlesPage() {
  const [titles, setTitles] = useState<TitleSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedTitle, setExpandedTitle] = useState<number | null>(null);
  const [versionData, setVersionData] = useState<TitleVersion[] | null>(null);
  const [versionLoading, setVersionLoading] = useState<boolean>(false);
  const [expandedXml, setExpandedXml] = useState<{ [key: string]: XmlState }>({});
  const [expandedStructure, setExpandedStructure] = useState<{ [key: number]: boolean }>({});
  const [structureData, setStructureData] = useState<{ [key: number]: any }>({});

  interface AncestryState {
    data: any;
    loading: boolean;
    expanded: boolean;
  }
  const [expandedAncestry, setExpandedAncestry] = useState<{ [key: string]: AncestryState }>({});

  useEffect(() => {
    async function fetchTitles() {
      try {
        const res = await fetch("/api/titles");
        const json = await res.json();
        if (json.success && json.data.titles) {
          setTitles(json.data.titles);
        } else {
          console.error("Error fetching titles:", json.error);
        }
      } catch (error) {
        console.error("Error fetching titles:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTitles();
  }, []);

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
          console.error("Error fetching title versions:", json.error);
          setVersionData(null);
        }
      } catch (error) {
        console.error("Error fetching title versions:", error);
        setVersionData(null);
      } finally {
        setVersionLoading(false);
      }
    }
  };

  const toggleXml = async (versionKey: string, date: string, title: string, section: string) => {
    setExpandedXml((prev) => {
      const current = prev[versionKey];
      if (current && current.expanded) {
        return { ...prev, [versionKey]: { ...current, expanded: false } };
      } else {
        return { ...prev, [versionKey]: { xml: "", loading: true, expanded: true } };
      }
    });

    if (expandedXml[versionKey] && expandedXml[versionKey].xml) {
      return;
    }

    try {
      // Fix URL encoding to properly handle '§' symbol
      const url = `/api/titles/section?date=${encodeURIComponent(date)}&title=${encodeURIComponent(title)}&section=${encodeURIComponent(section)}`;
      console.log("Fetching XML with URL:", url); // Debug log
      const res = await fetch(url);
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
        [versionKey]: { xml: "Error loading XML", loading: false, expanded: true },
      }));
    }
  };

  const toggleStructure = async (titleNumber: number, date: string) => {
    const isExpanding = !expandedStructure[titleNumber];
    setExpandedStructure((prev) => ({ ...prev, [titleNumber]: isExpanding }));

    if (isExpanding && !structureData[titleNumber]) {
      try {
        const res = await fetch(`/api/structure?date=${date}&title=${titleNumber}`);
        const json = await res.json();
        setStructureData((prev) => ({ ...prev, [titleNumber]: json }));
      } catch (error) {
        setStructureData((prev) => ({
          ...prev,
          [titleNumber]: { error: (error as Error).message },
        }));
      }
    }
  };

  const toggleAncestry = async (
    versionKey: string,
    date: string,
    title: string,
    section: string
  ) => {
    setExpandedAncestry((prev) => {
      const current = prev[versionKey];
      if (current && current.expanded) {
        return { ...prev, [versionKey]: { ...current, expanded: false } };
      } else {
        return { ...prev, [versionKey]: { data: null, loading: true, expanded: true } };
      }
    });

    if (expandedAncestry[versionKey]?.data) {
      return;
    }

    try {
      const res = await fetch(
        `/api/ancestry?date=${encodeURIComponent(date)}&title=${encodeURIComponent(
          title
        )}&section=${encodeURIComponent(section)}`
      );
      if (!res.ok) {
        const errorText = `Error loading ancestry data: ${res.status}`;
        setExpandedAncestry((prev) => ({
          ...prev,
          [versionKey]: { data: errorText, loading: false, expanded: true },
        }));
      } else {
        const ancestryJson = await res.json();
        setExpandedAncestry((prev) => ({
          ...prev,
          [versionKey]: { data: ancestryJson, loading: false, expanded: true },
        }));
      }
    } catch (error) {
      setExpandedAncestry((prev) => ({
        ...prev,
        [versionKey]: { data: "Error loading ancestry", loading: false, expanded: true },
      }));
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
                const dateForStructure = title.latest_issue_date || "2025-02-11";

                return (
                  <React.Fragment key={title.number}>
                    <tr>
                      <td>{title.number}</td>
                      <td>
                        {title.name}
                        <SummaryBot title={`Title ${title.number}: ${title.name}`} />
                      </td>
                      <td>{title.latest_amended_on || "N/A"}</td>
                      <td>{title.latest_issue_date || "N/A"}</td>
                      <td>{title.up_to_date_as_of || "N/A"}</td>
                      <td>{title.reserved ? "Yes" : "No"}</td>
                      <td>
                        <button
                          className={styles.expandButton}
                          onClick={() => toggleExpansion(title.number)}
                        >
                          {expandedTitle === title.number ? "-" : "+"}
                        </button>
                      </td>
                      <td>
                        <button
                          className={styles.expandButton}
                          onClick={() => toggleStructure(title.number, dateForStructure)}
                        >
                          {expandedStructure[title.number] ? "-" : "+"}
                        </button>
                      </td>
                    </tr>

                    {expandedStructure[title.number] && (
                      <tr>
                        <td colSpan={8} className={styles.expandedRow}>
                          {structureData[title.number] ? (
                            structureData[title.number].success ? (
                              <StructureViewer node={structureData[title.number].data} />
                            ) : (
                              <p>
                                {structureData[title.number].error || "Error loading structure data."}
                              </p>
                            )
                          ) : (
                            <p>Loading structure data...</p>
                          )}
                        </td>
                      </tr>
                    )}

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
                                  <th>Ancestry</th>
                                </tr>
                              </thead>
                              <tbody>
                                {versionData.map((version, index) => {
                                  const versionKey = `${version.identifier}-${index}`;
                                  const xmlState = expandedXml[versionKey];
                                  const ancestryState = expandedAncestry[versionKey];

                                  return (
                                    <React.Fragment key={versionKey}>
                                      <tr>
                                        <td>
                                          {version.identifier}
                                          <SummaryBot
                                            title={version.name}
                                            identifier={version.identifier}
                                            date={version.date}
                                            content={xmlState?.xml}
                                          />
                                        </td>
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
                                            {xmlState && xmlState.expanded ? "-" : "+"}
                                          </button>
                                        </td>
                                        <td>
                                          <button
                                            className={styles.expandButton}
                                            onClick={() =>
                                              toggleAncestry(
                                                versionKey,
                                                version.date,
                                                version.title,
                                                version.identifier
                                              )
                                            }
                                          >
                                            {ancestryState && ancestryState.expanded ? "-" : "+"}
                                          </button>
                                        </td>
                                      </tr>

                                      {xmlState && xmlState.expanded && (
                                        <tr>
                                          <td colSpan={8} className={styles.xmlRow}>
                                            {xmlState.loading ? (
                                              <p>Loading XML...</p>
                                            ) : (
                                              <XMLViewer xmlString={xmlState.xml} />
                                            )}
                                          </td>
                                        </tr>
                                      )}

                                      {ancestryState && ancestryState.expanded && (
                                        <tr>
                                          <td colSpan={8} className={styles.xmlRow}>
                                            {ancestryState.loading ? (
                                              <p>Loading ancestry data...</p>
                                            ) : typeof ancestryState.data === "string" ? (
                                              <p>{ancestryState.data}</p>
                                            ) : ancestryState.data?.success ? (
                                              <pre>{JSON.stringify(ancestryState.data, null, 2)}</pre>
                                            ) : (
                                              <p>Error or no data found.</p>
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
