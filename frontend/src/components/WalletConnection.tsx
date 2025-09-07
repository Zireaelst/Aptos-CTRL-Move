'use client'

import { useState, useEffect } from 'react'
import { Wallet, LogOut } from 'lucide-react'
import { connectWallet, disconnectWallet, getWalletAddress, formatAPT } from '@/lib/aptos'
import toast from 'react-hot-toast'

export default function WalletConnection() {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkWalletConnection()
  }, [])

  const checkWalletConnection = async () => {
    const addr = await getWalletAddress()
    if (addr) {
      setConnected(true)
      setAddress(addr)
      // In a real app, you'd fetch the balance here
      setBalance(1000000000) // 10 APT in Octas for demo
    }
  }

  const handleConnect = async () => {
    setLoading(true)
    try {
      const addr = await connectWallet()
      setConnected(true)
      setAddress(addr)
      setBalance(1000000000) // Demo balance
      toast.success('Wallet connected successfully!')
    } catch (error) {
      toast.error('Failed to connect wallet. Please install Petra wallet.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnectWallet()
      setConnected(false)
      setAddress(null)
      setBalance(0)
      toast.success('Wallet disconnected')
    } catch (error) {
      toast.error('Failed to disconnect wallet')
      console.error(error)
    }
  }

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="flex items-center space-x-4">
      {connected ? (
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <div className="font-semibold text-gray-900">
              {truncateAddress(address || '')}
            </div>
            <div className="text-gray-500">
              {formatAPT(balance)} APT
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            <LogOut size={16} />
            <span>Disconnect</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wallet size={16} />
          <span>{loading ? 'Connecting...' : 'Connect Wallet'}</span>
        </button>
      )}
    </div>
  )
}
