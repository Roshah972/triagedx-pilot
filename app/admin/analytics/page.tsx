import { getAllAnalytics } from '@/lib/analytics/computeMetrics'
import styles from './page.module.css'

// Force dynamic rendering (requires database connection)
export const dynamic = 'force-dynamic'

/**
 * Admin Analytics Page
 * 
 * Displays key operational metrics:
 * - Average time from arrival to triage
 * - EWS level distribution (last 24 hours)
 * - Active visits count
 */
export default async function AnalyticsPage() {
  const analytics = await getAllAnalytics()

  const formatMinutes = (minutes: number | null): string => {
    if (minutes === null) return 'N/A'
    if (minutes < 60) {
      return `${Math.round(minutes)} minutes`
    }
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  const getEwsColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return styles.critical
      case 'HIGH':
        return styles.high
      case 'MODERATE':
        return styles.moderate
      case 'LOW':
        return styles.low
      default:
        return ''
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Admin Analytics</h1>
        <p className={styles.subtitle}>Operational Metrics Dashboard</p>
      </header>

      <div className={styles.metricsGrid}>
        {/* Time to Triage Metric */}
        <section className={styles.metricCard}>
          <h2>Time to Triage</h2>
          <p className={styles.metricDescription}>
            Average time from patient arrival to when vitals are recorded (triage)
          </p>
          {analytics.timeToTriage.count > 0 ? (
            <div className={styles.metricValues}>
              <div className={styles.metricValue}>
                <span className={styles.metricLabel}>Average:</span>
                <span className={styles.metricNumber}>
                  {formatMinutes(analytics.timeToTriage.averageMinutes)}
                </span>
              </div>
              <div className={styles.metricValue}>
                <span className={styles.metricLabel}>Median:</span>
                <span className={styles.metricNumber}>
                  {formatMinutes(analytics.timeToTriage.medianMinutes)}
                </span>
              </div>
              <div className={styles.metricValue}>
                <span className={styles.metricLabel}>Range:</span>
                <span className={styles.metricNumber}>
                  {formatMinutes(analytics.timeToTriage.minMinutes)} -{' '}
                  {formatMinutes(analytics.timeToTriage.maxMinutes)}
                </span>
              </div>
              <div className={styles.metricValue}>
                <span className={styles.metricLabel}>Sample Size:</span>
                <span className={styles.metricNumber}>{analytics.timeToTriage.count} visits</span>
              </div>
            </div>
          ) : (
            <div className={styles.noData}>No triage data available</div>
          )}
        </section>

        {/* EWS Distribution Metric */}
        <section className={styles.metricCard}>
          <h2>EWS Level Distribution</h2>
          <p className={styles.metricDescription}>
            Distribution of Early Warning Scores over the last 24 hours
          </p>
          {analytics.ewsDistribution.some((d) => d.count > 0) ? (
            <div className={styles.ewsDistribution}>
              {analytics.ewsDistribution.map((dist) => (
                <div key={dist.level} className={styles.ewsBar}>
                  <div className={styles.ewsBarHeader}>
                    <span className={`${styles.ewsLevel} ${getEwsColor(dist.level)}`}>
                      {dist.level}
                    </span>
                    <span className={styles.ewsCount}>
                      {dist.count} ({dist.percentage}%)
                    </span>
                  </div>
                  <div className={styles.ewsBarContainer}>
                    <div
                      className={`${styles.ewsBarFill} ${getEwsColor(dist.level)}`}
                      style={{ width: `${dist.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noData}>No EWS data for last 24 hours</div>
          )}
        </section>

        {/* Active Visits Metric */}
        <section className={styles.metricCard}>
          <h2>Active Visits</h2>
          <p className={styles.metricDescription}>
            Current patients in the system (not discharged or LWBS)
          </p>
          <div className={styles.metricValues}>
            <div className={styles.metricValue}>
              <span className={styles.metricLabel}>Total Active:</span>
              <span className={styles.metricNumber}>{analytics.activeVisits.total}</span>
            </div>
          </div>

          <div className={styles.breakdown}>
            <h3>By Status</h3>
            <div className={styles.breakdownList}>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>Waiting:</span>
                <span className={styles.breakdownValue}>
                  {analytics.activeVisits.byStatus.waiting}
                </span>
              </div>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>In Triage:</span>
                <span className={styles.breakdownValue}>
                  {analytics.activeVisits.byStatus.inTriage}
                </span>
              </div>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>Roomed:</span>
                <span className={styles.breakdownValue}>
                  {analytics.activeVisits.byStatus.roomed}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.breakdown}>
            <h3>By Arrival Path</h3>
            <div className={styles.breakdownList}>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>Walk-In:</span>
                <span className={styles.breakdownValue}>
                  {analytics.activeVisits.byArrivalPath.walkIn}
                </span>
              </div>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>EMS:</span>
                <span className={styles.breakdownValue}>
                  {analytics.activeVisits.byArrivalPath.ems}
                </span>
              </div>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>Trauma/Direct:</span>
                <span className={styles.breakdownValue}>
                  {analytics.activeVisits.byArrivalPath.traumaDirect}
                </span>
              </div>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>Other:</span>
                <span className={styles.breakdownValue}>
                  {analytics.activeVisits.byArrivalPath.other}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.footer}>
        <p className={styles.lastUpdated}>
          Last updated: {new Date().toLocaleString()}
        </p>
        <p className={styles.note}>
          Metrics are computed in real-time from the database. Refresh page to update.
        </p>
      </div>
    </div>
  )
}

