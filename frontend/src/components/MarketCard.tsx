'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Clock, Users, DollarSign } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Market, buyShares } from '@/lib/aptos'

interface MarketCardProps {
  market: Market
  onUpdate: () => void
}

function formatAPT(amount: number): string {
  return (amount / 100000000).toFixed(2)
}

export default function MarketCard({ market, onUpdate }: MarketCardProps) {
  const [loading, setLoading] = useState(false)
  const [betAmount, setBetAmount] = useState('')

  const totalPool = market.yes_pool + market.no_pool
  const yesPercentage = totalPool > 0 ? (market.yes_pool / totalPool) * 100 : 50
  const noPercentage = totalPool > 0 ? (market.no_pool / totalPool) * 100 : 50

  const handleBet = async (outcome: 0 | 1) => {
    if (!betAmount || isNaN(parseFloat(betAmount))) {
      toast.error('Please enter a valid bet amount')
      return
    }

    const amount = parseFloat(betAmount)
    if (amount < 0.01) {
      toast.error('Minimum bet is 0.01 APT')
      return
    }

    setLoading(true)
    try {
      await buyShares(market.id, outcome, Math.floor(amount * 100000000))
      toast.success(`Successfully placed ${amount} APT bet on ${outcome === 1 ? 'YES' : 'NO'}!`)
      setBetAmount('')
      onUpdate()
    } catch (error) {
      console.error('Betting error:', error)
      toast.error('Failed to place bet. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isResolved = market.is_resolved
  const winningOutcome = market.winning_outcome

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full"
    >
      <Card className="h-full bg-neutral-900/50 border-neutral-800 hover:border-blue-500/50 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {isResolved ? (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs">
                  <Clock className="w-3 h-3" />
                  Resolved
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Live
                </div>
              )}
            </div>
            <div className="text-xs text-neutral-500">#{market.id}</div>
          </div>
          
          <CardTitle className="text-lg leading-tight text-white">
            {market.description}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Odds Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border transition-all duration-300 ${
              isResolved && winningOutcome === 1 
                ? 'bg-green-500/20 border-green-500/50' 
                : 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-400">YES</span>
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {yesPercentage.toFixed(1)}%
              </div>
              <div className="text-xs text-neutral-400">
                {formatAPT(market.yes_pool)} APT
              </div>
            </div>

            <div className={`p-4 rounded-xl border transition-all duration-300 ${
              isResolved && winningOutcome === 0 
                ? 'bg-red-500/20 border-red-500/50' 
                : 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-400">NO</span>
                <TrendingDown className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {noPercentage.toFixed(1)}%
              </div>
              <div className="text-xs text-neutral-400">
                {formatAPT(market.no_pool)} APT
              </div>
            </div>
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-2 gap-4 py-4 border-t border-neutral-800">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-xs text-neutral-400">Total Volume</div>
                <div className="text-sm font-medium text-white">
                  {formatAPT(market.total_volume)} APT
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-xs text-neutral-400">Pool Size</div>
                <div className="text-sm font-medium text-white">
                  {formatAPT(totalPool)} APT
                </div>
              </div>
            </div>
          </div>

          {/* Betting Interface */}
          {!isResolved && (
            <div className="space-y-4 pt-4 border-t border-neutral-800">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Bet Amount (APT)
                </label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="0.01"
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleBet(1)}
                  disabled={loading || !betAmount}
                  variant="glow"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Betting...' : 'Bet YES'}
                </Button>
                
                <Button
                  onClick={() => handleBet(0)}
                  disabled={loading || !betAmount}
                  variant="glow"
                  className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Betting...' : 'Bet NO'}
                </Button>
              </div>
            </div>
          )}

          {/* Resolution Status */}
          {isResolved && (
            <div className="pt-4 border-t border-neutral-800">
              <div className={`p-4 rounded-xl text-center ${
                winningOutcome === 1 
                  ? 'bg-green-500/20 border border-green-500/50' 
                  : 'bg-red-500/20 border border-red-500/50'
              }`}>
                <div className="text-sm font-medium text-white mb-1">
                  Market Resolved
                </div>
                <div className={`text-lg font-bold ${
                  winningOutcome === 1 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {winningOutcome === 1 ? 'YES' : 'NO'} Won
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
