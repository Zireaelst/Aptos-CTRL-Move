'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'react-hot-toast'

interface CreateMarketModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateMarket: (data: MarketFormData) => void
}

export interface MarketFormData {
  title: string
  description: string
  endDate: string
  endTime: string
  category: string
  initialMarketType: 'binary' | 'price'
  priceTarget?: string
  tokenSymbol?: string
}

const MARKET_TEMPLATES = [
  {
    title: "Bitcoin Price Prediction",
    description: "Will BTC reach $100,000 before end of month?",
    category: "Crypto",
    type: "binary" as const
  },
  {
    title: "APT Price Target", 
    description: "Will APT price exceed $15 by next week?",
    category: "Crypto",
    type: "binary" as const
  },
  {
    title: "Ethereum Market Cap",
    description: "ETH market cap will hit $500B milestone",
    category: "Crypto", 
    type: "binary" as const
  },
  {
    title: "SOL Performance",
    description: "Solana will outperform Bitcoin this month",
    category: "Market",
    type: "binary" as const
  }
]

export default function CreateMarketModal({ isOpen, onClose, onCreateMarket }: CreateMarketModalProps) {
  const [formData, setFormData] = useState<MarketFormData>({
    title: '',
    description: '',
    endDate: '',
    endTime: '',
    category: 'Crypto',
    initialMarketType: 'binary',
    priceTarget: '',
    tokenSymbol: 'BTC'
  })

  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.description || !formData.endDate || !formData.endTime) {
      toast.error('Please fill in all required fields')
      return
    }

    onCreateMarket(formData)
    onClose()
    setFormData({
      title: '',
      description: '',
      endDate: '',
      endTime: '',
      category: 'Crypto',
      initialMarketType: 'binary',
      priceTarget: '',
      tokenSymbol: 'BTC'
    })
  }

  const handleTemplateSelect = (template: typeof MARKET_TEMPLATES[0], index: number) => {
    setSelectedTemplate(index)
    setFormData({
      ...formData,
      title: template.title,
      description: template.description,
      category: template.category,
      initialMarketType: template.type
    })
  }

  // Calculate duration for the contract call
  const getDurationSeconds = () => {
    if (!formData.endDate || !formData.endTime) return 0
    
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)
    const now = new Date()
    const durationMs = endDateTime.getTime() - now.getTime()
    return Math.max(0, Math.floor(durationMs / 1000))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-4xl mx-full mx-4 my-8"
          >
            <Card className="bg-neutral-900/95 border-neutral-800 backdrop-blur-xl">
              <CardHeader className="border-b border-neutral-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl text-white flex items-center gap-3">
                    <TrendingUp className="h-6 w-6 text-blue-400" />
                    Create New Market
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-neutral-400 hover:text-white hover:bg-neutral-800"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Quick Templates */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Quick Templates</h3>
                      <div className="grid gap-3">
                        {MARKET_TEMPLATES.map((template, index) => (
                          <div
                            key={index}
                            onClick={() => handleTemplateSelect(template, index)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                              selectedTemplate === index
                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-600 text-neutral-300'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-medium text-sm">{template.title}</div>
                                <div className="text-xs mt-1 opacity-75">{template.description}</div>
                              </div>
                              <div className="text-xs px-2 py-1 bg-neutral-700/50 rounded-full ml-2">
                                {template.category}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Crypto Price Displays (Mock) */}
                    <div className="bg-neutral-800/50 rounded-xl p-4">
                      <h4 className="text-sm font-medium text-white mb-3">Live Prices</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center justify-between p-2 bg-neutral-700/30 rounded">
                          <span className="text-neutral-300">BTC</span>
                          <span className="text-green-400">$91,234 +2.4%</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-neutral-700/30 rounded">
                          <span className="text-neutral-300">APT</span>
                          <span className="text-green-400">$8.45 +5.2%</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-neutral-700/30 rounded">
                          <span className="text-neutral-300">ETH</span>
                          <span className="text-red-400">$3,812 -1.8%</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-neutral-700/30 rounded">
                          <span className="text-neutral-300">SOL</span>
                          <span className="text-green-400">$156 +3.7%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Market Details</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Market Title *
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. Will Bitcoin hit $100K this month?"
                          className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Description *
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Detailed description of what this market predicts..."
                          rows={3}
                          className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none resize-none"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-300 mb-2">
                            End Date *
                          </label>
                          <input
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-300 mb-2">
                            End Time *
                          </label>
                          <input
                            type="time"
                            value={formData.endTime}
                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Category
                          </label>
                          <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                          >
                            <option value="Crypto">Cryptocurrency</option>
                            <option value="Sports">Sports</option>
                            <option value="Politics">Politics</option>
                            <option value="Weather">Weather</option>
                            <option value="Technology">Technology</option>
                            <option value="Entertainment">Entertainment</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Market Type
                          </label>
                          <select
                            value={formData.initialMarketType}
                            onChange={(e) => setFormData({ ...formData, initialMarketType: e.target.value as 'binary' | 'price' })}
                            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                          >
                            <option value="binary">Yes/No Prediction</option>
                            <option value="price">Price Target</option>
                          </select>
                        </div>
                      </div>

                      {formData.initialMarketType === 'price' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                              Token Symbol
                            </label>
                            <input
                              type="text"
                              value={formData.tokenSymbol}
                              onChange={(e) => setFormData({ ...formData, tokenSymbol: e.target.value })}
                              placeholder="BTC, ETH, APT..."
                              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                              Target Price ($)
                            </label>
                            <input
                              type="number"
                              value={formData.priceTarget}
                              onChange={(e) => setFormData({ ...formData, priceTarget: e.target.value })}
                              placeholder="100000"
                              step="0.01"
                              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                      <div className="bg-neutral-800/50 rounded-xl p-4 mt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-blue-400" />
                          <span className="text-sm font-medium text-white">Market Duration</span>
                        </div>
                        <div className="text-sm text-neutral-400">
                          Duration: {getDurationSeconds() > 0 ? Math.floor(getDurationSeconds() / 86400) : 0} days {getDurationSeconds() > 0 ? Math.floor((getDurationSeconds() % 86400) / 3600) : 0} hours
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">
                          Ends: {formData.endDate && formData.endTime ? `${formData.endDate} at ${formData.endTime}` : 'Select end date'}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onClose}
                          className="flex-1 bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        >
                          Create Market
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
