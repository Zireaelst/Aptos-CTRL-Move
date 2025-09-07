'use client'

import { useState, useEffect } from 'react'
import { PieChart, TrendingUp, TrendingDown, Award } from 'lucide-react'
import { Position, Market, getUserPortfolio, getMarket, claimWinnings, formatAPT, getWalletAddress } from '@/lib/aptos'
import toast from 'react-hot-toast'

export default function UserPortfolio() {
  const [positions, setPositions] = useState<Position[]>([])
  const [markets, setMarkets] = useState<Map<number, Market>>(new Map())
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<number | null>(null)

  useEffect(() => {
    fetchPortfolio()
  }, [])

  const fetchPortfolio = async () => {
    try {
      const address = await getWalletAddress()
      if (!address) {
        setLoading(false)
        return
      }

      const userPositions = await getUserPortfolio(address)
      setPositions(userPositions)

      // Fetch market details for each position
      const marketMap = new Map<number, Market>()
      for (const position of userPositions) {
        const market = await getMarket(position.market_id)
        if (market) {
          marketMap.set(position.market_id, market)
        }
      }
      setMarkets(marketMap)
    } catch (error) {
      toast.error('Failed to fetch portfolio')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleClaimWinnings = async (marketId: number) => {
    setClaiming(marketId)
    try {
      await claimWinnings(marketId)
      toast.success('Winnings claimed successfully!')
      fetchPortfolio() // Refresh portfolio
    } catch (error) {
      toast.error('Failed to claim winnings')
      console.error(error)
    } finally {
      setClaiming(null)
    }
  }

  const calculateWinnings = (position: Position, market: Market): number => {
    if (!market.is_resolved || !market.winning_outcome) return 0
    
    const winningShares = market.winning_outcome === 1 ? position.yes_shares : position.no_shares
    if (winningShares === 0) return 0

    const totalPool = market.yes_pool + market.no_pool
    const winningPool = market.winning_outcome === 1 ? market.yes_pool : market.no_pool
    
    return (winningShares * totalPool) / winningPool
  }

  const getPositionValue = (position: Position, market: Market): number => {
    if (market.is_resolved) {
      return calculateWinnings(position, market)
    }
    
    // For active markets, estimate value based on current pools
    const totalShares = position.yes_shares + position.no_shares
    const totalPool = market.yes_pool + market.no_pool
    if (totalPool === 0) return totalShares
    
    return totalShares // Simplified estimation
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (positions.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <PieChart size={48} className="mx-auto mb-4 opacity-50" />
        <p>No positions found. Start betting on markets to see your portfolio!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Portfolio</h2>
      
      {positions.map((position) => {
        const market = markets.get(position.market_id)
        if (!market) return null

        const positionValue = getPositionValue(position, market)
        const canClaim = market.is_resolved && calculateWinnings(position, market) > 0

        return (
          <div key={position.market_id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-4">
                {market.description}
              </h3>
              <div className="text-sm text-gray-500">
                Market #{market.id}
              </div>
            </div>

            {market.is_resolved && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className={`font-semibold ${
                  market.winning_outcome === 1 ? 'text-green-800' : 'text-red-800'
                }`}>
                  ✓ Resolved: {market.winning_outcome === 1 ? 'YES' : 'NO'} wins
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp size={20} className="text-green-600 mr-1" />
                  <span className="font-semibold text-green-800">YES</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatAPT(position.yes_shares)}
                </div>
                <div className="text-sm text-green-600">shares</div>
              </div>

              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <TrendingDown size={20} className="text-red-600 mr-1" />
                  <span className="font-semibold text-red-800">NO</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {formatAPT(position.no_shares)}
                </div>
                <div className="text-sm text-red-600">shares</div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Position Value:</span> {formatAPT(positionValue)} APT
              </div>
              
              {canClaim && (
                <button
                  onClick={() => handleClaimWinnings(market.id)}
                  disabled={claiming === market.id}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Award size={16} />
                  <span>
                    {claiming === market.id ? 'Claiming...' : 'Claim Winnings'}
                  </span>
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
