'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { Market, MarketOdds, getMarketOdds, buyShares, formatAPT, formatTimestamp, isMarketExpired, parseAPT } from '@/lib/aptos'
import toast from 'react-hot-toast'

interface MarketCardProps {
  market: Market
  onUpdate?: () => void
}

export default function MarketCard({ market, onUpdate }: MarketCardProps) {
  const [odds, setOdds] = useState<MarketOdds>({ yes_odds: 50, no_odds: 50 })
  const [loading, setLoading] = useState(false)
  const [betAmount, setBetAmount] = useState('')
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null)
  const [showBetModal, setShowBetModal] = useState(false)

  const fetchOdds = useCallback(async () => {
    const marketOdds = await getMarketOdds(market.id)
    setOdds(marketOdds)
  }, [market.id])

  useEffect(() => {
    fetchOdds()
  }, [fetchOdds])

  const handleBet = async (outcome: number) => {
    if (!betAmount || parseFloat(betAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setLoading(true)
    try {
      const amountInOctas = parseAPT(betAmount)
      await buyShares(market.id, outcome, amountInOctas)
      toast.success(`Successfully placed bet on ${outcome === 1 ? 'YES' : 'NO'}!`)
      setBetAmount('')
      setSelectedOutcome(null)
      setShowBetModal(false)
      fetchOdds()
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to place bet. Make sure you have enough APT.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const openBetModal = (outcome: number) => {
    if (isMarketExpired(market.end_timestamp)) {
      toast.error('This market has expired')
      return
    }
    if (market.is_resolved) {
      toast.error('This market has been resolved')
      return
    }
    setSelectedOutcome(outcome)
    setShowBetModal(true)
  }

  const isExpired = isMarketExpired(market.end_timestamp)
  const totalPool = market.yes_pool + market.no_pool

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-4">
            {market.description}
          </h3>
          <div className="flex items-center text-sm text-gray-500">
            <Clock size={16} className="mr-1" />
            {isExpired ? 'Expired' : formatTimestamp(market.end_timestamp)}
          </div>
        </div>

        {market.is_resolved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-800 font-semibold">
              ✓ Resolved: {market.winning_outcome === 1 ? 'YES' : 'NO'} wins
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {odds.yes_odds}%
            </div>
            <div className="text-sm text-gray-600 mb-2">YES</div>
            <button
              onClick={() => openBetModal(1)}
              disabled={isExpired || market.is_resolved || loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <TrendingUp size={16} />
              <span>Bet YES</span>
            </button>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 mb-1">
              {odds.no_odds}%
            </div>
            <div className="text-sm text-gray-600 mb-2">NO</div>
            <button
              onClick={() => openBetModal(2)}
              disabled={isExpired || market.is_resolved || loading}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <TrendingDown size={16} />
              <span>Bet NO</span>
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600 grid grid-cols-2 gap-4">
          <div>
            <span className="font-semibold">Total Volume:</span><br />
            {formatAPT(totalPool)} APT
          </div>
          <div>
            <span className="font-semibold">Market ID:</span><br />
            #{market.id}
          </div>
        </div>
      </div>

      {/* Betting Modal */}
      {showBetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">
              Place Bet on {selectedOutcome === 1 ? 'YES' : 'NO'}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (APT)
              </label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="Enter amount in APT"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.01"
                min="0.01"
              />
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                Current odds: {selectedOutcome === 1 ? odds.yes_odds : odds.no_odds}%
              </div>
              {betAmount && (
                <div className="text-sm text-gray-600 mt-1">
                  Potential return: ~{(parseFloat(betAmount) * (100 / (selectedOutcome === 1 ? odds.yes_odds : odds.no_odds))).toFixed(2)} APT
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowBetModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedOutcome && handleBet(selectedOutcome)}
                disabled={loading || !betAmount}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Placing Bet...' : 'Place Bet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
