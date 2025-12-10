/**
 * Autonomy module exports
 */

export { autonomousBrain, type BrainStats } from './AutonomousBrain'
export { productionBrain, type BrainState, type ProductionConfig } from './ProductionBrain'
export { totalAutonomy } from './TotalAutonomy'
export { empireEngine } from './EmpireEngine'
export { 
  thoughtStream, 
  think, 
  startThinking, 
  concludeThinking,
  type Thought, 
  type ThoughtType, 
  type ThinkingSession 
} from './ThoughtStream'
