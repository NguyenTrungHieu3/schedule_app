import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import TodayPage from './pages/TodayPage';
import ReviewPage from './pages/ReviewPage';
import ErrorLogPage from './pages/ErrorLogPage';
import StatsPage from './pages/StatsPage';
import WeekPage from './pages/WeekPage';
import SundayReviewPage from './pages/SundayReviewPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import HocPage from './pages/HocPage';
import FlashcardReviewPage from './pages/FlashcardReviewPage';
import VocabQuizPage from './pages/VocabQuizPage';
import WrongWordsPage from './pages/WrongWordsPage';

// HashRouter thay BrowserRouter: app deploy TĨNH (GitHub Pages/Netlify kéo-thả)
// mà không cần cấu hình rewrite — refresh hay mở deep link #/tuan đều không 404.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TodayPage />} />
          <Route path="/tuan" element={<WeekPage />} />
          <Route path="/on-tap" element={<ReviewPage />} />
          <Route path="/so-loi" element={<ErrorLogPage />} />
          <Route path="/thong-ke" element={<StatsPage />} />
          <Route path="/ra-soat" element={<SundayReviewPage />} />
          <Route path="/hoc" element={<HocPage />} />
          <Route path="/hoc/on-tap" element={<FlashcardReviewPage />} />
          <Route path="/hoc/bo-the/:deckId" element={<FlashcardReviewPage />} />
          <Route path="/hoc/kiem-tra" element={<VocabQuizPage />} />
          <Route path="/hoc/kiem-tra/tu-sai" element={<WrongWordsPage />} />
          <Route path="/cai-dat" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

