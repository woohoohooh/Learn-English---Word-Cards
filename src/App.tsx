import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Review } from './pages/Review';
import { Profile } from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home type="words" />} />
          <Route path="/phrases" element={<Home type="phrases" />} />
          <Route path="/sentences" element={<Home type="sentences" />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        
        {/* Review routes are full-screen, so they are outside the main Layout */}
        <Route path="/review/:listId" element={<Review />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
