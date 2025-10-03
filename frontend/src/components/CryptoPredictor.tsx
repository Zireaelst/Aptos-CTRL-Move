'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Target, Zap } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface CryptoPredictorProps {
  tokenSymbol: string
  currentPrice: number
  priceChange24h: number
  marketCap: number
  onPlaceBet: (prediction: 'up' | 'down', amount: number) => void
}

interface PriceChange {
  time: string
  price: number
  change: number
}

export default function CryptoPredictor({ 
  tokenSymbol, 
  currentPrice, 
  priceChange24h, 
  marketCap,
  onPlaceBet 
}: CryptoPredictorProps) {
  const [betAmount, setBetAmount] = useState('')
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '24h' | '7d'>('1h')
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([])
  const [loading, setLoading] = useState(false)
  const [showBetInterface, setShowBetInterface] = useState<'up' | 'down' | null>(null)

  // Mock price data - in real app, would fetch from CoinGecko or similar
  useEffect(() => {
    const mockData = generateMockPriceChanges()
    setPriceChanges(mockData)
  }, [timeframe])

  const generateMockPriceChanges = (): PriceChange[] => {
    const intervals = {
      '1h': 12,
      '4h': 10, 
      '24h': 24,
      '7d': 7
    }
    
    const count = intervals[timeframe]
    const now = Date.now()
    const steps = timeframe === '7d' ? 86400000 : 
                 timeframe === '24h' ? 3600000 :
                 timeframe === '4h' ? 14400000 : 300000
    
    const changes = []
    let price = currentPrice
    
    for (let i = count; i >= 0; i--) {
      const time = new Date(now - (i * steps))
      const change = (Math.random() - 0.5) * 0.02
      price = price * (1 + change)
      
      changes.push({
        time: time.toISOString().slice(11, 16),
        price,
        change: change * 100
      })
    }
    
    return changes
  }

  const handleBet = async (prediction: 'up' | 'down') => {
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
      await onPlaceBet(prediction, amount)
      toast.success(`Successfully placed ${amount} APT bet on ${prediction === 'up' ? '↗ Price Rise' : '↘ Price Fall'}!`)
      setBetAmount('')
      setShowBetInterface(null)
    } catch (error) {
      console.error('Betting error:', error)
      toast.error('Failed to place bet. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: tokenSymbol === 'BTC' ? 0 : 2,
      maximumFractionDigits: tokenSymbol === 'BTC' ? 0 : 2,
    }).format(price)
  }

  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B` 
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`
    return `$${cap.toFixed(0)}`
  }

  return (
    <div className="space-y-6">
      {/* Price Display */}
      <Card className="bg-gradient-to-br from-neutral-900/90 to-neutral-800/90 border-neutral-700 backdrop-blur-xl">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{tokenSymbol.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{tokenSymbol}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium text-white">{formatPrice(currentPrice)}</span>
                    <span className={`text-sm px-2 py-1 rounded-full flex items-center gap-1 ${
                      priceChange24h >= 0 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {priceChange24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(priceChange24h).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-neutral-400">
                Market Cap: {formatMarketCap(marketCap)}
              </div>
            </div>

            {/* Quick Bet Buttons */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => setShowBetInterface('up')}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Predict Rise
              </Button>
              <Button
                onClick={() => setShowBetInterface('down')}
                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white"
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                Predict Fall
              </Button>
            </div>
          </div>

          {/* Price Chart Mini */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white">Price Movement ({timeframe})</h4>
              <div className="flex gap-1">
                {(['1h', '4h', '24h', '7d'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-1 text-xs rounded ${
                      timeframe === tf 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-neutral-700 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Mini Sparklines */}
            <div className="flex items-end gap-1 h-16">
              {priceChanges.map((change, index) => (
                <div
                  key={index}
                  className="flex-1 bg-gradient-to-t from-blue-500/30 to-transparent rounded-sm min-h-[2px] hover:from-blue-400/50 transition-colors cursor-pointer"
                  style={{ height: `${Math.max(5, ((change.price - Math.min(...priceChanges.map(c => c.price))) / (Math.max(...priceChanges.map(c => c.price)) - Math.min(...priceChanges.map(c => c.price)))) * 60)}px` }}
                  title={`${formatPrice(change.price)} (${change.change.toFixed(2)}%) at ${change.time}`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Bet Interface */}
      {showBetInterface && (
        <Card className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-500/50 animation-pulse">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  showBetInterface === 'up' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {showBetInterface === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">
                    Predict {showBetInterface === 'up' ? '↗ Price Rise' : '↘ Price Fall'}
                  </div>
                  <div className="text-xs text-neutral-400">
                    Within next {timeframe === '7d' ? '7 days' : timeframe === '24h' ? '24 hours' : timeframe === '4h' ? '4 hours' : '1 hour'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="0.01"
                  min="0.01"
                  step="0.01"
                  className="w-24 px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none text-sm"
                />
                <span className="text-sm text-neutral-400">APT</span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleBet(showBetInterface)}
                    disabled={loading || !betAmount}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm"
                  >
                    {loading ? 'Placing...' : 'Place Bet'}
                  </Button>
                  <Button
                    onClick={() => setShowBetInterface(null)}
                    className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Prediction Insights */}
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardContent className="p-6">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-400" />
            Market Insights
          </h4>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-neutral-800/50 rounded-lg">
              <div className="text-sm text-neutral-400 mb-1">Bullish Signals</div>
              <div className="text-lg font-bold text-green-400">73%</div>
              <div className="text-xs text-neutral-500">Community sentiment</div>
            </div>
            <div className="p-4 bg-neutral-800/50 rounded-lg">
              <div className="text-sm text-neutral-400 mb-1">Volume Trend</div>
              <div className="text-lg font-bold text-blue-400">+24%</div>
              <div className="text-xs text-neutral-500">24h increase</div>
            </div>
            <div className="p-4 bg-neutral-800/50 rounded-lg">
              <div className="text-sm text-neutral-400 mb-1">Price Target</div>
              <div className="text-lg font-bold text-purple-400">
                {formatPrice(currentPrice * 1.15)}
              </div>
              <div className="text-xs text-neutral-500">Next resistance</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-700">
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span>High volatility segment - great for quick predictions!</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
