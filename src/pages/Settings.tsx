/**
 * Settings.tsx - Settings page for pipeline configuration
 */

import React from 'react'
import { PipelineSettingsPanel } from '@/components/settings/PipelineSettings'

export default function Settings() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-950 to-black p-6">
      <div className="max-w-6xl mx-auto">
        <PipelineSettingsPanel />
      </div>
    </div>
  )
}
