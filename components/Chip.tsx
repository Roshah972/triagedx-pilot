'use client'

import { useState } from 'react'
import styles from './Chip.module.css'

export interface ChipProps {
  label: string
  value: string | number | boolean
  selected?: boolean
  onClick?: (value: string | number | boolean) => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  size?: 'small' | 'medium' | 'large'
  multiSelect?: boolean
  className?: string
}

/**
 * Chip component for selection UI
 * Supports single-select and multi-select modes
 */
export default function Chip({
  label,
  value,
  selected = false,
  onClick,
  disabled = false,
  variant = 'default',
  size = 'medium',
  multiSelect = false,
  className = '',
}: ChipProps) {
  const [isPressed, setIsPressed] = useState(false)

  const handleClick = () => {
    if (!disabled && onClick) {
      setIsPressed(true)
      setTimeout(() => setIsPressed(false), 150)
      onClick(value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <button
      type="button"
      className={`${styles.chip} ${styles[variant]} ${styles[size]} ${
        selected ? styles.selected : ''
      } ${disabled ? styles.disabled : ''} ${isPressed ? styles.pressed : ''} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label}
    >
      {label}
    </button>
  )
}

/**
 * Chip group component for multiple chips
 */
export interface ChipGroupProps {
  chips: Array<{ label: string; value: string | number | boolean }>
  selectedValues?: Array<string | number | boolean> | string | number | boolean
  onSelectionChange?: (values: Array<string | number | boolean> | string | number | boolean) => void
  multiSelect?: boolean
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function ChipGroup({
  chips,
  selectedValues = [],
  onSelectionChange,
  multiSelect = false,
  variant = 'default',
  size = 'medium',
  disabled = false,
  className = '',
  orientation = 'horizontal',
}: ChipGroupProps) {
  const isSelected = (value: string | number | boolean): boolean => {
    if (multiSelect) {
      return Array.isArray(selectedValues) && selectedValues.includes(value)
    }
    return selectedValues === value
  }

  const handleChipClick = (value: string | number | boolean) => {
    if (disabled || !onSelectionChange) return

    if (multiSelect) {
      const currentValues = Array.isArray(selectedValues) ? selectedValues : []
      const newValues = isSelected(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value]
      onSelectionChange(newValues)
    } else {
      onSelectionChange(value)
    }
  }

  return (
    <div
      className={`${styles.chipGroup} ${styles[orientation]} ${className}`}
      role={multiSelect ? 'group' : 'radiogroup'}
      aria-label="Selection options"
    >
      {chips.map((chip, index) => (
        <Chip
          key={`${chip.value}-${index}`}
          label={chip.label}
          value={chip.value}
          selected={isSelected(chip.value)}
          onClick={handleChipClick}
          disabled={disabled}
          variant={variant}
          size={size}
          multiSelect={multiSelect}
        />
      ))}
    </div>
  )
}

