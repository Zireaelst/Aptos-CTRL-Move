'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Globe, Zap, Shield } from 'lucide-react'
import WalletConnection from '@/components/WalletConnection'
import MarketCard from '@/components/MarketCard'
import UserPortfolio from '@/components/UserPortfolio'
import { Market, getAllMarkets } from '@/lib/aptos'

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'markets' | 'portfolio'>('markets')

  useEffect(() => {
    fetchMarkets()
  }, [])

  const fetchMarkets = async () => {
    try {
      const allMarkets = await getAllMarkets()
      setMarkets(allMarkets)
      console.log('Fetched markets:', allMarkets)
    } catch (error) {
      console.error('Error fetching markets:', error)
    } finally {
      setLoading(false)
    }
  }

  const activeMarkets = markets.filter(m => !m.is_resolved)
  const resolvedMarkets = markets.filter(m => m.is_resolved)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">Aptos Predict</h1>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                <button
                  onClick={() => setActiveTab('markets')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'markets'
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Markets
                </button>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'portfolio'
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Portfolio
                </button>
              </div>
            </div>
            <div className="flex items-center">
              <WalletConnection />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              The Future of{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                Prediction
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Harness the power of Aptos blockchain for lightning-fast, low-cost prediction markets.
              Bet on outcomes, earn rewards, and help discover the truth.
            </p>
            
            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <div className="bg-white bg-opacity-10 backdrop-blur rounded-xl p-6">
                <Zap className="h-12 w-12 text-yellow-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
                <p className="text-blue-100">
                  Sub-second transaction finality on Aptos means instant betting and payouts
                </p>
              </div>
              
              <div className="bg-white bg-opacity-10 backdrop-blur rounded-xl p-6">
                <Shield className="h-12 w-12 text-green-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Ultra Secure</h3>
                <p className="text-blue-100">
                  Move programming language ensures your funds are safe from exploits
                </p>
              </div>
              
              <div className="bg-white bg-opacity-10 backdrop-blur rounded-xl p-6">
                <Globe className="h-12 w-12 text-purple-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Global Access</h3>
                <p className="text-blue-100">
                  Accessible to everyone with minimal fees - bet with as little as $0.01
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {activeTab === 'markets' ? (
          <div>
            {/* Active Markets */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Active Prediction Markets</h2>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : activeMarkets.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                  <TrendingUp size={48} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Active Markets</h3>
                  <p className="text-gray-500">New prediction markets will appear here soon!</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {activeMarkets.map((market) => (
                    <MarketCard 
                      key={market.id} 
                      market={market} 
                      onUpdate={fetchMarkets}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Resolved Markets */}
            {resolvedMarkets.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Recently Resolved</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {resolvedMarkets.slice(0, 6).map((market) => (
                    <MarketCard 
                      key={market.id} 
                      market={market} 
                      onUpdate={fetchMarkets}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Live Stats */}
            <div className="mt-12 bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Platform Statistics</h3>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">{markets.length}</div>
                  <div className="text-gray-600">Total Markets</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600 mb-2">{activeMarkets.length}</div>
                  <div className="text-gray-600">Active Markets</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {markets.reduce((sum, m) => sum + m.total_volume, 0) / 100000000} APT
                  </div>
                  <div className="text-gray-600">Total Volume</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <UserPortfolio />
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-blue-400 mr-3" />
              <h3 className="text-2xl font-bold">Aptos Predict</h3>
            </div>
            <p className="text-gray-400 mb-6">
              Powered by Aptos blockchain technology
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                Built for ETH Global Hackathon • Live on Devnet
              </p>
              <p className="text-sm text-gray-500">
                Contract Address: 0x35a3...2fc6b
              </p>
              <p className="text-sm text-blue-400">
                <a 
                  href="https://explorer.aptoslabs.com/account/0x35a304995e62d1e91e576f3d43ceeb226372dfca8f246010b519f9d549b2fc6b?network=devnet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  View on Aptos Explorer
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
