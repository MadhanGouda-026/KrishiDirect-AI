import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout.jsx';
import { Skeleton } from './components/ui/Feedback.jsx';
import Home from './pages/Home.jsx';
import Marketplace from './pages/Marketplace.jsx';
import CropDetails from './pages/CropDetails.jsx';
import Sell from './pages/Sell.jsx';
import { Orders, Offers } from './pages/Trade.jsx';
import { Messages, Wishlist, Compare, Notifications } from './pages/Social.jsx';
import { About, Help, Contact, Privacy, Terms, NotFound } from './pages/Info.jsx';

// Chart-heavy pages are split out of the main bundle.
const Prices = lazy(() => import('./pages/Prices.jsx'));
const Dashboards = lazy(() => import('./pages/Dashboards.jsx'));
const Tools = lazy(() => import('./pages/Tools.jsx'));
const pick = (L, name) => lazy(() => L.then((m) => ({ default: m[name] })));
const FarmerDashboard = pick(import('./pages/Dashboards.jsx'), 'FarmerDashboard');
const BuyerDashboard = pick(import('./pages/Dashboards.jsx'), 'BuyerDashboard');
const Markets = pick(import('./pages/Tools.jsx'), 'Markets');
const Resources = pick(import('./pages/Tools.jsx'), 'Resources');
const Assistant = pick(import('./pages/Tools.jsx'), 'Assistant');
const Analytics = pick(import('./pages/Tools.jsx'), 'Analytics');
const Demo = pick(import('./pages/Tools.jsx'), 'Demo');
void Dashboards; void Tools;

export default function App() {
  return (
    <Suspense fallback={<div className="container section"><Skeleton h={300} /></div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="crop/:id" element={<CropDetails />} />
          <Route path="sell" element={<Sell />} />
          <Route path="sell/:id/edit" element={<Sell />} />
          <Route path="prices" element={<Prices />} />
          <Route path="farmer" element={<FarmerDashboard />} />
          <Route path="buyer" element={<BuyerDashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="offers" element={<Offers />} />
          <Route path="messages" element={<Messages />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="compare" element={<Compare />} />
          <Route path="markets" element={<Markets />} />
          <Route path="resources" element={<Resources />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="about" element={<About />} />
          <Route path="help" element={<Help />} />
          <Route path="contact" element={<Contact />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="demo" element={<Demo />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
