'use client';

import React from 'react';
import Navigation from './components/Navigation'; // Adjust the path if needed
import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.main}>
      <Navigation />
    </main>
  );
}
