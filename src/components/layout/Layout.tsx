import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import AudioPlayer from '../AudioPlayer'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1 pb-32 min-w-0 w-full overflow-x-hidden">
        <Outlet />
      </main>
      <AudioPlayer />
    </div>
  )
}
