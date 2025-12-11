/**
 * Language Selector Component
 * Allows users to change application language
 * December 2025
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './button'
import { Card } from './card'
import { Globe, Check } from '@phosphor-icons/react'
import { i18n } from '@/lib/i18n/i18n'
import type { Language } from '@/lib/i18n/translations'

interface LanguageSelectorProps {
  compact?: boolean
  showCurrentLanguage?: boolean
}

export function LanguageSelector({ compact = false, showCurrentLanguage = true }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState<Language>(i18n.getCurrentLanguage())

  useEffect(() => {
    const unsubscribe = i18n.onLanguageChange(setCurrentLanguage)
    return unsubscribe
  }, [])

  const languages = i18n.getAvailableLanguages()
  const currentLangInfo = languages.find(lang => lang.code === currentLanguage)

  const handleLanguageChange = (language: Language) => {
    i18n.setLanguage(language)
    setIsOpen(false)
  }

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-black/30 border border-yellow-600/20 rounded-lg hover:border-yellow-600/40 transition-colors"
        >
          <Globe size={16} className="text-yellow-500" />
          {showCurrentLanguage && (
            <span className="text-gray-300">{currentLangInfo?.nativeName}</span>
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute top-full mt-2 right-0 z-50 w-48"
              >
                <Card className="bg-black/95 border border-yellow-600/20 p-2">
                  {languages.map(language => (
                    <button
                      key={language.code}
                      onClick={() => handleLanguageChange(language.code)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-yellow-600/10 transition-colors ${
                        currentLanguage === language.code ? 'text-yellow-500' : 'text-gray-300'
                      }`}
                    >
                      <span>{language.nativeName}</span>
                      {currentLanguage === language.code && (
                        <Check size={14} className="text-yellow-500" />
                      )}
                    </button>
                  ))}
                </Card>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Globe size={24} className="text-yellow-500" />
        <h3 className="text-lg font-semibold text-white">Language</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {languages.map(language => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
              currentLanguage === language.code
                ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                : 'border-yellow-600/20 bg-black/30 text-gray-300 hover:border-yellow-600/40'
            }`}
          >
            <div>
              <div className="font-medium">{language.nativeName}</div>
              <div className="text-xs text-gray-500">{language.name}</div>
            </div>
            {currentLanguage === language.code && (
              <Check size={18} className="text-yellow-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
