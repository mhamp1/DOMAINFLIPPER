/**
 * Config Module Index
 * Central configuration management for the empire
 */

export { masterConfig } from './MasterConfig'
export type { MasterConfigData } from './MasterConfig'
export { empireSettings } from './EmpireSettings'
export { apiConfigManager } from './APIConfigManager'
export { useEmpireConfig } from './UserEmpireConfig'
export { SettingsService } from './settingsService'
export { loadRuntimeConfig, validateConfig, getRuntimeConfig } from './runtimeConfig'
export type { RuntimeConfig } from './runtimeConfig'
