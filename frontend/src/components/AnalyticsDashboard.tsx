'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, Activity, Target } from 'lucide-react'
import { Market } from '@/lib/aptos'

interface AnalyticsDashboardProps {
  markets: Market[]
}

interface AnalyticsData {
  totalMarkets: number
  activeMarkets: number
  resolvedMarkets: number
  totalVolume: number
  avgVolumePerMarket: number
  topPerformingMarkets: Market[]
  volumeOverTime: { date: string; volume: number }[]
}

export default function AnalyticsDashboard({ markets }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d'>('24h')

  useEffect(() => {
    if (markets.length > 0) {
      calculateAnalytics()
    }
  }, [markets])

  const calculateAnalytics = () => {
    const activeMarkets = markets.filter(m => !m.is_resolved)
    const resolvedMarkets = markets.filter(m => m.is_resolved)
    const totalVolume = markets.reduce((sum, m) => sum + m.total_volume, 0)
    const avgVolumePerMarket = totalVolume / markets.length

    // Mock top performing markets (in real app, would calculate based on volume/activity)
    const topPerformingMarkets = markets
      .sort((a, b) => b.total_volume - a.total_volume)
      .slice(0, 3)

    // Mock volume over time data
    const volumeOverTime = generateMockVolumeData()

    setAnalytics({
      totalMarkets: markets.length,
      activeMarkets: activeMarkets.length,
      resolvedMarkets: resolvedMarkets.length,
      totalVolume,
      avgVolumePerMarket: avgVolumePerMarket || 0,
      topPerformingMarkets,
      volumeOverTime
    })
  }

  const generateMockVolumeData = () => {
    const days = selectedTimeframe === '24h' ? 24 : selectedTimeframe === '7d' ? 7 : 30
    const data = []
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setHours(date.getHours() - i)
      data.push({
        date: selectedTimeframe === '24h' ? date.toISOString().slice(11, 16) : date.toISOString().slice(0, 10),
        volume: Math.random() * 1000 + 500 // Mock volume data
      })
    }
    
    return data
  }

  const formatAPT = (amount: number): string => {
    return (amount / 100000000).toFixed(2)
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-neutral-800 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-500 rounded-full animate-spin animation-delay-150"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Timeframe Selector */}
      <div className="flex justify-center">
        <div className="flex p-1 rounded-full bg-neutral-900/50 backdrop-blur-sm border border-neutral-800">
          {(['24h', '7d', '30d'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedTimeframe === timeframe
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {timeframe === '24h' ? '24 Hours' : timeframe === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-neutral-900/50 border-neutral-800 hover:border-blue-500/50 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Total Markets</p>
                <p className="text-2xl font-bold text-white">{analytics.totalMarkets}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/50 border-neutral-800 hover:border-green-500/50 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Active Markets</p>
                <p className="text-2xl font-bold text-green-400">{analytics.activeMarkets}</p>
              </div>
              <Target className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/50 border-neutral-800 hover:border-purple-500/50 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Total Volume</p>
                <p className="text-2xl font-bold text-white">{formatAPT(analytics.totalVolume)} APT</p>
              </div>
              <Activity className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/50 border-neutral-800 hover:border-yellow-500/50 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Avg Volume</p>
                <p className="text-2xl font-bold text-white">{formatAPT(analytics.avgVolumePerMarket)} APT</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Volume Chart Mock */}
        <Card className="bg-neutral-900/50 border-neutral-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Volume Over Time</h3>
            <div className="h-64 flex items-end justify-between gap-2">
              {analytics.volumeOverTime.map((point, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <div 
                    className="bg-gradient-to-t from-blue-500 to-purple-500 rounded-t-sm w-8 hover:from-blue-400 hover:to-purple-400 transition-all duration-300"
                    style={{ height: `${Math.max((point.volume / Math.max(...analytics.volumeOverTime.map(p => p.volume))) * 200, 8)}px` }}
                  />
                  <span className="text-xs text-neutral-500 rotate-90 origin-left whitespace-nowrap">
                    {selectedTimeframe === '24h' ? point.date.split(':')[0] : point.date.slice(-2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-neutral-500 text-center">
              {selectedTimeframe === '24h' ? 'Last 24 Hours' : selectedTimeframe === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
            </div>
          </CardContent>
        </Card>

        {/* Top Markets */}
        <Card className="bg-neutral-900/50 border-neutral-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Top Markets by Volume</h3>
            <div className="space-y-4">
              {analytics.topPerformingMarkets.map((market, index) => (
                <div key={market.id} className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg hover:bg-neutral-700/50 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-yellow-900' : 
                      index === 1 ? 'bg-gray-400 text-gray-800' : 
                      'bg-orange-500 text-orange-900'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white truncate max-w-40">
                        {market.description.length > 40 
                          ? `${market.description.slice(0, 40)}...` 
                          : market.description}
                      </div>
                      <div className="text-xs text-neutral-500">
                        Market #{market.id}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {formatAPT(market.total_volume)} APT
                    </div>
                    <div className="text-xs text-neutral-500">
                      {market.yes_pool === 0 && market.no_pool === 0 ? '0%' : 
                       ((market.yes_pool * 100) / (market.yes_pool + market.no_pool)).toFixed(0)}% YES
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Categories Distribution */}
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Market Categories</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl border border-blue-500/30">
              <div className="text-3xl font-bold text-blue-400 mb-2">Crypto</div>
              <div className="text-sm text-neutral-400">Most Popular</div>
              <div className="text-xs text-blue-300 mt-1">62% of volume</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl border border-purple-500/30">
              <div className="text-3xl font-bold text-purple-400 mb-2">Sports</div>
              <div className="text-sm text-neutral-400">Growing</div>
              <div className="text-xs text-purple-300 mt-1">23% of volume</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl border border-green-500/30">
              <div className="text-3xl font-bold text-green-400 mb-2">Politics</div>
              <div className="text-sm text-neutral-400">Stable</div>
              <div className="text-xs text-green-300 mt-1">15% of volume</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Feed Mock */}
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Market Activity</h3>
          <div className="space-y-3">
            {[
              { action: 'created', market: 'Bitcoin Price Prediction', user: '0x1a...b3c' },
              { action: 'bet', market: 'APT Surge Prediction', user: '0x4d...f9a' },
              { action: 'resolved', market: 'Ethereum Merge Success', user: 'admin' },
              { action: 'bet', market: 'Solana Performance', user: '0x7e...c2b' },
              { action: 'created', market: 'Federal Reserve Rate Decision', user: '0x9f...a8d' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-neutral-800/30 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  activity.action === 'created' ? 'bg-blue-400' :
                  activity.action === 'bet' ? 'bg-green-400' :
                  'bg-purple-400'
                }`} />
                <div className="flex-1">
                  <span className="text-sm text-white">
                    <span className="font-medium">{activity.user}</span> {activity.action === 'bet' ? 'placed a bet on' : activity.action === 'created' ? 'created' : 'resolved'} {' '}
                    <span className="text-blue-400">{activity.market}</span>
                  </span>
                </div>
                <div className="text-xs text-neutral-500">
                  {index < 2 ? `${5 - index}m ago` : `${12 - index * 3}h ago`}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
