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

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Federal Authority Regulatory Tracker</h1>

      <button className={styles.navButton} onClick={goToAgencies}>
        Agency List
      </button>
      <br />
      <button className={styles.navButton} onClick={goToAgencySearch}>
        Agency Search
      </button>
    </main>
  );
}
