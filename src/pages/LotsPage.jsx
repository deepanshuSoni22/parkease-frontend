import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { LotsListView } from '../components/LotsListView';
import { LotSlotsView } from '../components/LotSlotsView';

export default function LotsPage() {
  return (
    <Routes>
      <Route index element={<LotsListView />} />
      <Route path=":lotId" element={<LotSlotsView />} />
    </Routes>
  );
}
