import { HashRouter, Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { TierListBuilder } from './pages/TierListBuilder'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/list/:id" element={<TierListBuilder />} />
      </Routes>
    </HashRouter>
  )
}
