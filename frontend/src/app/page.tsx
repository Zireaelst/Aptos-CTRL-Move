'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Zap, Shield, Globe } from 'lucide-react'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { FloatingNav } from '@/components/ui/floating-navbar'
import { SparklesCore } from '@/components/ui/sparkles'
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

  const navItems = [
    { name: "Markets", link: "#markets" },
    { name: "Portfolio", link: "#portfolio" },
    { name: "About", link: "#about" },
  ]

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-hidden">
      {/* Floating Navigation */}
      <FloatingNav navItems={navItems} />

      {/* Hero Section */}
      <div className="h-screen w-full relative flex flex-col items-center justify-center">
        <div className="absolute inset-0 w-full h-full">
          <SparklesCore
            id="hero-sparkles"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={80}
            className="w-full h-full"
            particleColor="#3b82f6"
          />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-neutral-300">Live on Aptos Devnet</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600">
            Aptos
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient">
              Predict
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-neutral-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            The future of prediction markets. Lightning-fast, ultra-secure, and globally accessible.
            <span className="block mt-2 text-lg text-neutral-500">
              Powered by Aptos blockchain technology.
            </span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <WalletConnection />
            <button 
              onClick={() => setActiveTab('markets')}
              className="px-8 py-3 bg-transparent border border-neutral-700 text-neutral-300 rounded-full hover:border-blue-500 hover:text-blue-400 transition-all duration-300"
            >
              Explore Markets
            </button>
          </div>

          {/* Key Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="group p-6 rounded-xl glass border border-neutral-800 hover:border-blue-500/50 transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 rounded-full bg-blue-500/10 mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <Zap className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Lightning Fast</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Sub-second finality means instant betting and payouts
                </p>
              </div>
            </div>

            <div className="group p-6 rounded-xl glass border border-neutral-800 hover:border-purple-500/50 transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 rounded-full bg-purple-500/10 mb-4 group-hover:bg-purple-500/20 transition-colors">
                  <Shield className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Ultra Secure</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Move programming language ensures fund safety
                </p>
              </div>
            </div>

            <div className="group p-6 rounded-xl glass border border-neutral-800 hover:border-green-500/50 transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 rounded-full bg-green-500/10 mb-4 group-hover:bg-green-500/20 transition-colors">
                  <Globe className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Global Access</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Accessible to everyone with minimal fees
                </p>
              </div>
            </div>
          </div>
        </div>

        <BackgroundBeams />
      </div>

      {/* Markets Section */}
      <div id="markets" className="relative min-h-screen py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-12">
            <div className="flex p-1 rounded-full bg-neutral-900/50 backdrop-blur-sm border border-neutral-800">
              <button
                onClick={() => setActiveTab('markets')}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === 'markets'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Markets
              </button>
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === 'portfolio'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Portfolio
              </button>
            </div>
          </div>

          {activeTab === 'markets' ? (
            <div>
              {/* Active Markets */}
              <div className="mb-16">
                <h2 className="text-4xl font-bold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                  Active Prediction Markets
                </h2>
                
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-neutral-800 border-t-blue-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-500 rounded-full animate-spin animation-delay-150"></div>
                    </div>
                  </div>
                ) : activeMarkets.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="max-w-md mx-auto">
                      <div className="p-8 rounded-2xl glass border border-neutral-800">
                        <TrendingUp size={48} className="mx-auto mb-4 text-neutral-500" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Active Markets</h3>
                        <p className="text-neutral-400">New prediction markets will appear here soon!</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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

              {/* Platform Statistics */}
              <div className="mt-20">
                <div className="text-center mb-12">
                  <h3 className="text-3xl font-bold mb-4 text-white">Platform Statistics</h3>
                  <p className="text-neutral-400">Real-time metrics from the Aptos blockchain</p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="text-center p-8 rounded-2xl glass border border-neutral-800 hover:border-blue-500/50 transition-all duration-300">
                    <div className="text-4xl font-bold text-blue-400 mb-2">{markets.length}</div>
                    <div className="text-neutral-400">Total Markets</div>
                  </div>
                  <div className="text-center p-8 rounded-2xl glass border border-neutral-800 hover:border-purple-500/50 transition-all duration-300">
                    <div className="text-4xl font-bold text-purple-400 mb-2">{activeMarkets.length}</div>
                    <div className="text-neutral-400">Active Markets</div>
                  </div>
                  <div className="text-center p-8 rounded-2xl glass border border-neutral-800 hover:border-green-500/50 transition-all duration-300">
                    <div className="text-4xl font-bold text-green-400 mb-2">
                      {(markets.reduce((sum, m) => sum + m.total_volume, 0) / 100000000).toFixed(1)} APT
                    </div>
                    <div className="text-neutral-400">Total Volume</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <UserPortfolio />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-950/50 backdrop-blur-sm py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <TrendingUp className="h-8 w-8 text-blue-400 mr-3" />
              <h3 className="text-2xl font-bold text-white">Aptos Predict</h3>
            </div>
            <p className="text-neutral-400 mb-8 max-w-2xl mx-auto">
              Revolutionizing prediction markets with the speed and security of Aptos blockchain.
              Built for ETH Global Hackathon.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-sm text-neutral-500">
              <span>Contract: 0x35a3...2fc6b</span>
              <span className="hidden sm:block">•</span>
              <a 
                href="https://explorer.aptoslabs.com/account/0x35a304995e62d1e91e576f3d43ceeb226372dfca8f246010b519f9d549b2fc6b?network=devnet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                View on Explorer
              </a>
              <span className="hidden sm:block">•</span>
              <a 
                href="https://github.com/Zireaelst/Cognito-Aptos-ETH-ist"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
