/**
 * Autonomy Module Index
 * 
 * CANONICAL IMPLEMENTATION: productionBrain
 * This is the main production-ready autonomous engine that should be used
 * for all domain acquisition, listing, and sale operations.
 * 
 * ARCHITECTURE:
 * - ProductionBrain: Main execution engine with full safety features
 * - ThoughtStream: Real-time reasoning visualization
 * - TotalAutonomy: High-level autonomy coordination
 * - EmpireEngine: Empire state management
 * 
 * DEPRECATED (for backwards compatibility only):
 * - AutonomousBrain: Older implementation, use productionBrain instead
 */

// CANONICAL: Production-ready brain with full infrastructure
export { productionBrain, type BrainState, type ProductionConfig } from './ProductionBrain'

// Thought visualization
export { 
  thoughtStream, 
  think, 
  startThinking, 
  concludeThinking,
  type Thought, 
  type ThoughtType, 
  type ThinkingSession 
} from './ThoughtStream'

// Autonomy coordination
export { totalAutonomy } from './TotalAutonomy'
export { empireEngine } from './EmpireEngine'

// DEPRECATED: Legacy brain (use productionBrain instead)
export { autonomousBrain, type BrainStats } from './AutonomousBrain'
