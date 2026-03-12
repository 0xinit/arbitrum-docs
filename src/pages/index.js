import Head from '@docusaurus/Head';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

// NOTE: Path redirections have been moved to /vercel.json so they are handled in the
// server side by Vercel.

export default function Home() {
  return (
    <Layout title={`Arbitrum 🔵`}>
      <Head>
        <style>{`[class*='navbarSearchContainer'] { opacity: 0 !important; } .main-wrapper { min-height: 0 !important; }`}</style>
      </Head>
      <main className={styles.main}>
        <div className={styles.hero}>
          <svg
            className={styles.svg}
            width="1401"
            height="760"
            viewBox="0 0 1401 760"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1127.83 -899.985L1078.63 -1016.77L540.815 553.942L-681.57 31.322L-637.264 135.165L539.676 568.559L1127.83 -899.964V-899.985Z"
              fill="#05163D"
            ></path>
            <path
              d="M538.536 584.339L-592.514 239.917L-547.956 344.31L537.029 604.033L1224.65 -670.364L1176.75 -784.043L538.536 584.339Z"
              fill="#05163D"
            ></path>
            <path
              d="M-503.438 448.637L-456.543 558.509L534.036 642.615L1314.82 -456.291L1273.76 -553.746L535.774 619.812C302.866 581.249 -503.438 448.637 -503.438 448.637Z"
              fill="#05163D"
            ></path>
            <path
              d="M1371.67 -321.311L532.323 664.678L-416.673 652.579L-370.841 760.144L530.507 688.053L1419.94 -206.764L1371.67 -321.311Z"
              fill="#05163D"
            ></path>
            <path
              d="M1468.35 -91.8551L528.823 710.161L-326.809 862.594L-282.464 966.5L526.331 742.335L1519.03 28.4238L1468.33 -91.8975L1468.35 -91.8551Z"
              fill="#05163D"
            ></path>
            <path
              d="M-237.269 1069.94C-225.873 1097.33 -193.464 1171.84 -193.464 1171.84L521.058 811.211L1615.2 256.67L1566.43 141.087L524.033 772.542L-237.211 1069.92L-237.269 1069.96V1069.94Z"
              fill="#05163D"
            ></path>
            <path
              d="M1712.48 487.52C1701.49 461.121 1664.62 372.487 1664.62 372.487L518.122 849.416L-149.661 1278.47L-105.49 1380.94L514.471 897.222L1712.58 487.541L1712.5 487.478L1712.48 487.52Z"
              fill="#05163D"
            ></path>
          </svg>
        </div>
        <div className={styles.content}>
          <HomepageFeatures />
        </div>
      </main>
    </Layout>
  );
}
