'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function HomePage() {
  const router = useRouter();

  function goToAgencies() {
    router.push('/agencies');
  }

  function goToAgencySearch() {
    router.push('/agencysearch');
  }

  function goToRegulationSearch() {
    router.push('/regulationsearch');
  }

  function goToAgencyActivity() {
    router.push('/agencyactivity');
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Federal Authority Regulatory Tracker</h1>
      <div className={styles.buttonGrid}>
        <button className={styles.navButton} onClick={goToAgencies}>
          Agency List
        </button>
        <button className={styles.navButton} onClick={goToAgencySearch}>
          Agency Search
        </button>
        <button className={styles.navButton} onClick={goToRegulationSearch}>
          Regulation Search
        </button>
        <button className={styles.navButton} onClick={goToAgencyActivity}>
          Agency 12 Month Activity
        </button>
      </div>
    </main>
  );
}
