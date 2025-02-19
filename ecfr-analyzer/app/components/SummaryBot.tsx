"use client";

import React, { useState } from "react";
import { FaInfoCircle, FaTimes } from "react-icons/fa"; // Added FaTimes
import styles from "./SummaryBot.module.css";

interface SummaryBotProps {
  title?: string;
  identifier?: string;
  date?: string;
  content?: string;
}

const SummaryBot: React.FC<SummaryBotProps> = ({ title, identifier, date, content }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);

    let prompt = `Summarize the following regulation information:\n`;
    if (title) prompt += `Title: ${title}\n`;
    if (identifier) prompt += `Identifier: ${identifier}\n`;
    if (date) prompt += `Date: ${date}\n`;
    if (content) prompt += `Content: ${content.substring(0, 1000)}...\n`;
    prompt += "Please make any suggestions for reducing regulation, overlap, or misuse in regard to this regulation.";

    try {
      const response = await fetch("/api/grok", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are a helpful assistant analyzing regulations." },
            { role: "user", content: prompt },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const summaryText = data.choices[0]?.message?.content || "No summary available.";
      setSummary(summaryText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (!isOpen) {
      fetchSummary();
    }
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className={styles.container}>
      <button onClick={handleClick} title="Get Summary from Grok" className={styles.infoButton}>
        <FaInfoCircle size={20} />
      </button>

      {isOpen && (
        <div className={styles.popup}>
          {/* Close 'X' Icon */}
          <button onClick={handleClose} className={styles.closeIcon} title="Close">
            <FaTimes size={16} />
          </button>

          {loading ? (
            <p className={styles.loading}>
              <span className={styles.spinner}></span>Loading summary...
            </p>
          ) : error ? (
            <p className={styles.error}>Error: {error}</p>
          ) : summary ? (
            <>
              <h4>Summary & Suggestions</h4>
              <p>{summary}</p>
              <button onClick={handleClose} className={styles.closeButton}>
                Close
              </button>
            </>
          ) : (
            <p>No summary available.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SummaryBot;