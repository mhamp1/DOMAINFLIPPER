/**
 * Slider component — Gold themed
 */

import * as React from 'react'

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  className?: string
  disabled?: boolean
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className = '',
  disabled = false,
}: SliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([Number(e.target.value)])
  }

  const percentage = ((value[0] - min) / (max - min)) * 100

  return (
    <div className={`relative w-full ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        disabled={disabled}
        className="w-full h-2 bg-yellow-600/20 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-5
          [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-yellow-500
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-yellow-400
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:shadow-yellow-600/30
          [&::-webkit-slider-thumb]:transition-all
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-moz-range-thumb]:w-5
          [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-yellow-500
          [&::-moz-range-thumb]:border-2
          [&::-moz-range-thumb]:border-yellow-400
          [&::-moz-range-thumb]:cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: `linear-gradient(to right, rgb(202, 138, 4) ${percentage}%, rgba(202, 138, 4, 0.2) ${percentage}%)`,
        }}
      />
    </div>
  )
}

