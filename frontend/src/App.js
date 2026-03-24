import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home     from './pages/Home';
import Tracking from './pages/Tracking';
import Report   from './pages/Report';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Home />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/report"   element={<Report />} />
        <Route path="*"         element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
