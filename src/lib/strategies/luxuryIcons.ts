import { 
  GlobeSimple,
  Coins,
  Brain,
  Rocket,
  Buildings,
  Sparkle,
  TextAa,
  Atom,
  CurrencyDollar,
  NumberCircleThree,
} from '@phosphor-icons/react'

export const LUXURY_ICONS = {
  brandable: GlobeSimple,
  crypto: Coins,
  ai: Brain,
  lll: NumberCircleThree,
  'geo-service': Buildings,
  traffic: Sparkle,
  pumpfun: Rocket,
  typo: TextAa,
  'one-word-io': Atom,
  numbers: CurrencyDollar,
}

export type StrategyIconType = keyof typeof LUXURY_ICONS
