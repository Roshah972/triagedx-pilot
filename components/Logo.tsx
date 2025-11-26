import styles from './Logo.module.css'

interface LogoProps {
  size?: 'small' | 'medium' | 'large'
  showText?: boolean
  className?: string
}

export default function Logo({ size = 'medium', showText = true, className }: LogoProps) {
  return (
    <div className={`${styles.logo} ${styles[size]} ${className || ''}`}>
      <svg
        className={styles.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Medical cross symbol */}
        <rect x="20" y="8" width="8" height="32" rx="2" fill="currentColor" />
        <rect x="8" y="20" width="32" height="8" rx="2" fill="currentColor" />
      </svg>
      {showText && <span className={styles.text}>TRIAGEDX</span>}
    </div>
  )
}

