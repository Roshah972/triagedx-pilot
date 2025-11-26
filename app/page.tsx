import Link from 'next/link'
import Logo from '@/components/Logo'
import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.container}>
      <div className={styles.content}>
        {/* Header Section */}
        <header className={styles.header}>
          <h1 className={styles.title}>TriageDX</h1>
          <p className={styles.tagline}>ER Triage Accelerator - Cut door-to-triage time in half</p>
          
          {/* Technology Badges */}
          <div className={styles.techBadges}>
            <span className={styles.badge}>Next.js 14</span>
            <span className={styles.badge}>TypeScript</span>
            <span className={styles.badge}>Prisma</span>
            <span className={styles.badge}>PostgreSQL</span>
            <span className={styles.badge}>React</span>
            <span className={styles.badge}>CSS Modules</span>
          </div>
        </header>

        {/* Feature Cards */}
        <section className={styles.features}>
          <div className={styles.featureCard}>
            <h2 className={styles.featureTitle}>Fast Check-in</h2>
            <p className={styles.featureDescription}>2-3 minute kiosk check-in with minimal data collection</p>
            <p className={styles.featureDetail}>Last name + DOB + OTP/ID scan. No SSN or insurance upfront.</p>
          </div>
          
          <div className={styles.featureCard}>
            <h2 className={styles.featureTitle}>Smart Screening</h2>
            <p className={styles.featureDescription}>Structured safety screening with auto high-risk detection</p>
            <p className={styles.featureDetail}>Chips, sliders, yes/no questions with intelligent flagging.</p>
          </div>
          
          <div className={styles.featureCard}>
            <h2 className={styles.featureTitle}>Pre-Triage Support</h2>
            <p className={styles.featureDescription}>Provisional risk assessment and structured intake data</p>
            <p className={styles.featureDetail}>Provides pre-triage snapshot to support nurses. Nurses still perform full clinical triage.</p>
          </div>
        </section>

        {/* Call to Action */}
        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>Ready to get started?</h2>
          <div className={styles.ctaButtons}>
            <Link href="/check-in?mode=kiosk" className={styles.primaryButton}>
              Start Triage
            </Link>
            <Link href="/staff/dashboard" className={styles.secondaryButton}>
              Nurse Console
            </Link>
          </div>
        </section>

        {/* Demo Links */}
        <section className={styles.demos}>
          <Link href="/check-in" className={styles.demoLink}>View Check-in Demo</Link>
          <Link href="/admin/analytics" className={styles.demoLink}>View Analytics</Link>
          <Link href="/staff/dashboard" className={styles.demoLink}>View Dashboard</Link>
        </section>
      </div>
    </main>
  )
}
