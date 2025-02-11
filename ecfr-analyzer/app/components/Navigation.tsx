'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './Navigation.module.css';

export default function Navigation() {
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <header className={styles.header}>
      <div className={styles.logoContainer}>
        <Image
          src="/32pxusa.png"
          alt="USA Icon"
          width={32}
          height={32}
          className={styles.logo}
        />
        <span className={styles.siteTitle}>
          Federal Regulation Tracker
        </span>
      </div>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          <li className={styles.navItem} onClick={() => handleNavigation('/agencies')}>
            Agency List
          </li>
          <li className={styles.navItem} onClick={() => handleNavigation('/agencysearch')}>
            Agency Search
          </li>
          <li className={styles.navItem} onClick={() => handleNavigation('/regulationsearch')}>
            Regulation Search
          </li>
          <li className={styles.navItem} onClick={() => handleNavigation('/agencyactivity')}>
            Agency 12 Month Activity
          </li>
        </ul>
      </nav>
    </header>
  );
}
