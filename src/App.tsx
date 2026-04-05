/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  HashRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate, 
  useParams 
} from 'react-router-dom';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp, 
  doc, 
  getDoc,
  where,
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, signIn, logOut } from './firebase';
import { 
  Mountain, 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  User as UserIcon, 
  ChevronRight, 
  ArrowLeft,
  Loader2,
  Camera,
  Send,
  LogOut,
  LogIn,
  Facebook,
  Twitter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { GoogleGenAI } from "@google/genai";

// --- Types ---
interface MountainEvent {
  id: string;
  title: string;
  dateTime: Timestamp;
  location: string;
  description: string;
  maxParticipants: number;
  creatorName: string;
  createdAt: Timestamp;
  participantCount?: number;
}

interface Participant {
  id: string;
  eventId: string;
  name: string;
  contact: string;
  note: string;
  createdAt: Timestamp;
}

// --- Components ---

const Navbar = () => {
  return (
    <nav className="bg-emerald-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <Mountain className="w-8 h-8 text-emerald-300" />
          <span>山健客</span>
        </Link>
      </div>
    </nav>
  );
};

const EventCard = ({ event }: React.PropsWithChildren<{ event: MountainEvent }>) => {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
    >
      <Link to={`/event/${event.id}`}>
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{event.title}</h3>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full border border-emerald-100">
              {event.participantCount || 0} / {event.maxParticipants} 人
            </span>
          </div>
          
          <div className="space-y-2 text-gray-600 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>{format(event.dateTime.toDate(), 'yyyy/MM/dd (eee) HH:mm', { locale: zhTW })}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-emerald-600" />
              <span>發起人：{event.creatorName}</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-5 py-3 flex items-center justify-between text-emerald-700 font-medium text-sm">
          <span>查看詳情</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </Link>
    </motion.div>
  );
};

const Home = () => {
  const [events, setEvents] = useState<MountainEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('dateTime', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const eventList: MountainEvent[] = [];
      
      // Fetch participant counts for each event
      const eventsWithCounts = await Promise.all(snapshot.docs.map(async (eventDoc) => {
        const data = eventDoc.data();
        const participantsQuery = query(collection(db, 'participants'), where('eventId', '==', eventDoc.id));
        const participantsSnapshot = await getDocs(participantsQuery);
        
        return {
          id: eventDoc.id,
          ...data,
          participantCount: participantsSnapshot.size
        } as MountainEvent;
      }));

      setEvents(eventsWithCounts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-gray-500 font-medium">正在載入山林活動...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <div className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=2000" 
            alt="Mountain Hero" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-emerald-900/60 backdrop-blur-[2px]" />
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center text-white">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
              山健客
            </h1>
            <p className="text-xl md:text-2xl font-medium text-emerald-50 mb-10 opacity-90">
              山健客邀約平台 · 讓每一次出發都充滿期待
            </p>
            <Link 
              to="/create" 
              className="inline-flex items-center gap-2 bg-white text-emerald-900 px-8 py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-50 transition-all active:scale-95"
            >
              <Plus className="w-6 h-6" />
              發起新邀約
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">探索山林邀約</h2>
            <p className="text-gray-600 font-medium">找到志同道合的朋友，一起出發吧！</p>
          </div>
        </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
          <Mountain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">目前還沒有活動</h3>
          <p className="text-gray-500 mb-6">成為第一個發起登山邀約的人吧！</p>
          <Link to="/create" className="text-emerald-700 font-bold hover:underline">立即發起活動</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  </div>
);
};

const CreateEvent = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    maxParticipants: 5,
    creatorName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.creatorName) {
      setError('請填寫發起人姓名');
      return;
    }
    
    setLoading(true);
    try {
      // Ensure time is in HH:mm format (some browsers might send HH:mm:ss)
      const timePart = formData.time.split(':').slice(0, 2).join(':');
      const dateTimeStr = `${formData.date}T${timePart}`;
      console.log('Parsing dateTimeStr:', dateTimeStr);
      
      const dateTime = new Date(dateTimeStr);
      
      if (isNaN(dateTime.getTime())) {
        console.error('Invalid date/time:', dateTimeStr);
        throw new Error('日期或時間格式不正確，請重新選擇。');
      }

      console.log('Creating event with dateTime:', dateTime);

      await addDoc(collection(db, 'events'), {
        title: formData.title,
        dateTime: Timestamp.fromDate(dateTime),
        location: formData.location,
        description: formData.description || '',
        maxParticipants: Number(formData.maxParticipants),
        creatorName: formData.creatorName,
        createdAt: Timestamp.now()
      });
      navigate('/');
    } catch (err: any) {
      console.error('Error adding event:', err);
      
      let errorMessage = '發起活動失敗，請檢查輸入內容或稍後再試';
      if (err.message && err.message.includes('permission-denied')) {
        errorMessage = '權限不足：請確認資料庫規則已更新。';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-emerald-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>返回列表</span>
      </Link>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">發起新山林邀約</h1>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">活動標題</label>
            <input 
              required
              type="text" 
              placeholder="例如：玉山主峰兩天一夜"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">日期</label>
              <input 
                required
                type="date" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">時間</label>
              <input 
                required
                type="time" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                value={formData.time}
                onChange={e => setFormData({...formData, time: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">地點 / 山名</label>
            <input 
              required
              type="text" 
              placeholder="例如：南投縣信義鄉"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">活動描述</label>
            <textarea 
              rows={4}
              placeholder="請輸入活動細節、裝備要求、集合地點等..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">人數上限</label>
              <input 
                required
                type="number" 
                min="1"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                value={formData.maxParticipants}
                onChange={e => setFormData({...formData, maxParticipants: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">發起人稱呼</label>
              <input 
                required
                type="text" 
                placeholder="您的姓名或暱稱"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                value={formData.creatorName}
                onChange={e => setFormData({...formData, creatorName: e.target.value})}
              />
            </div>
          </div>

          <button 
            disabled={loading}
            type="submit"
            className="w-full bg-emerald-800 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : '立即發起邀約'}
          </button>
        </form>
      </div>
    </div>
  );
};

const EventDetail = () => {
  const { id } = useParams();
  const [event, setEvent] = useState<MountainEvent | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinData, setJoinData] = useState({ name: '', contact: '', note: '' });

  // Gemini State
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const eventDoc = doc(db, 'events', id);
    const unsubscribeEvent = onSnapshot(eventDoc, (snapshot) => {
      if (snapshot.exists()) {
        setEvent({ id: snapshot.id, ...snapshot.data() } as MountainEvent);
      }
      setLoading(false);
    });

    const q = query(collection(db, 'participants'), where('eventId', '==', id), orderBy('createdAt', 'asc'));
    const unsubscribeParticipants = onSnapshot(q, (snapshot) => {
      const list: Participant[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Participant));
      setParticipants(list);
    });

    return () => {
      unsubscribeEvent();
      unsubscribeParticipants();
    };
  }, [id]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !event) return;
    
    if (participants.length >= event.maxParticipants) {
      alert('報名人數已滿！');
      return;
    }

    setJoining(true);
    try {
      await addDoc(collection(db, 'participants'), {
        eventId: id,
        name: joinData.name,
        contact: joinData.contact,
        note: joinData.note,
        createdAt: Timestamp.now()
      });
      setJoinData({ name: '', contact: '', note: '' });
      // Using a more reliable feedback than alert
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed bottom-4 right-4 bg-emerald-800 text-white px-6 py-3 rounded-xl shadow-lg z-[100] animate-bounce';
      successMsg.innerText = '報名成功！';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    } catch (err: any) {
      console.error('Error joining event:', err);
      
      if (err.code === 'permission-denied') {
        const errInfo = {
          error: err.message,
          operationType: 'create',
          path: 'participants',
          authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
          }
        };
        console.error('Firestore Error Details:', JSON.stringify(errInfo));
      }
      alert('報名失敗，請稍後再試');
    } finally {
      setJoining(false);
    }
  };

  const handleImageAnalysis = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      setImagePreview(reader.result as string);
      setAnalyzing(true);
      setAnalysisResult(null);

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: {
            parts: [
              { text: "這是一張與登山活動相關的圖片（可能是裝備、地圖或風景）。請分析這張圖片，並給予專業的登山建議或資訊。" },
              { inlineData: { data: base64Data, mimeType: file.type } }
            ]
          }
        });
        setAnalysisResult(response.text || "無法分析圖片內容。");
      } catch (error) {
        console.error("Gemini analysis error:", error);
        setAnalysisResult("AI 分析失敗，請稍後再試。");
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">找不到該活動</h2>
        <Link to="/" className="text-emerald-700 font-bold hover:underline">返回首頁</Link>
      </div>
    );
  }

  const isFull = participants.length >= event.maxParticipants;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-emerald-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>返回列表</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Event Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="bg-emerald-800 text-white text-xs font-bold px-3 py-1 rounded-full">
                {isFull ? '已額滿' : '招募中'}
              </span>
              <span className="text-gray-400 text-sm">發布於 {format(event.createdAt.toDate(), 'yyyy/MM/dd')}</span>
            </div>
            
            <h1 className="text-3xl font-black text-gray-900 mb-6">{event.title}</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-50 p-3 rounded-xl">
                  <Calendar className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">日期時間</p>
                  <p className="text-gray-900 font-bold">{format(event.dateTime.toDate(), 'yyyy/MM/dd (eee) HH:mm', { locale: zhTW })}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-emerald-50 p-3 rounded-xl">
                  <MapPin className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">活動地點</p>
                  <p className="text-gray-900 font-bold">{event.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-emerald-50 p-3 rounded-xl">
                  <Users className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">報名人數</p>
                  <p className="text-gray-900 font-bold">{participants.length} / {event.maxParticipants} 人</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-emerald-50 p-3 rounded-xl">
                  <UserIcon className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">發起人</p>
                  <p className="text-gray-900 font-bold">{event.creatorName}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">活動描述</h3>
              <div className="text-gray-600 leading-relaxed whitespace-pre-wrap mb-8">
                {event.description || '暫無詳細描述'}
              </div>

              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => {
                    const url = window.location.href;
                    const text = `【登山邀約】${event.title}\n時間：${format(event.dateTime.toDate(), 'yyyy/MM/dd HH:mm')}\n地點：${event.location}\n立即報名：${url}`;
                    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="flex items-center gap-2 bg-[#00B900] text-white px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                  title="分享到 Line"
                >
                  <Send className="w-4 h-4" />
                  Line
                </button>
                <button 
                  onClick={() => {
                    const url = window.location.href;
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                  }}
                  className="flex items-center gap-2 bg-[#1877F2] text-white px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                  title="分享到 Facebook"
                >
                  <Facebook className="w-4 h-4" />
                  Facebook
                </button>
                <button 
                  onClick={() => {
                    const url = window.location.href;
                    const text = `【登山邀約】${event.title}\n時間：${format(event.dateTime.toDate(), 'yyyy/MM/dd HH:mm')}\n地點：${event.location}\n立即報名：`;
                    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="flex items-center gap-2 bg-[#1DA1F2] text-white px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                  title="分享到 Twitter"
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    const toast = document.createElement('div');
                    toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-xl shadow-lg z-[100]';
                    toast.innerText = '連結已複製！';
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 2000);
                  }}
                  className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                >
                  <Plus className="w-4 h-4 rotate-45" />
                  複製連結
                </button>
              </div>
            </div>
          </div>

          {/* Gemini Analysis Section */}
          <div className="bg-emerald-50 rounded-3xl p-8 border border-emerald-100">
            <div className="flex items-center gap-3 mb-6">
              <Camera className="w-6 h-6 text-emerald-800" />
              <h3 className="text-xl font-bold text-emerald-900">山林 AI 助手</h3>
            </div>
            <p className="text-emerald-800/70 mb-6">上傳裝備照、路線圖或風景照，讓 AI 為您的行程提供建議！</p>
            
            <div className="flex flex-col gap-4">
              <label className="cursor-pointer bg-white border-2 border-dashed border-emerald-300 rounded-2xl p-6 text-center hover:border-emerald-500 transition-all">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageAnalysis} />
                <div className="flex flex-col items-center gap-2">
                  <Plus className="w-8 h-8 text-emerald-600" />
                  <span className="font-bold text-emerald-700">點擊上傳圖片</span>
                </div>
              </label>

              {imagePreview && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-xl mb-4" />
                  {analyzing ? (
                    <div className="flex items-center gap-3 text-emerald-700 font-bold py-4">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>AI 正在分析中...</span>
                    </div>
                  ) : analysisResult ? (
                    <div className="bg-emerald-50 p-4 rounded-xl text-emerald-900 text-sm leading-relaxed">
                      <p className="font-bold mb-2">AI 分析結果：</p>
                      {analysisResult}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Participants List */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6">已報名山友 ({participants.length})</h3>
            <div className="space-y-4">
              {participants.length === 0 ? (
                <p className="text-gray-400 text-center py-4">目前還沒有人報名</p>
              ) : (
                participants.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-800 text-white rounded-full flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">{format(p.createdAt.toDate(), 'MM/dd HH:mm')}</p>
                      </div>
                    </div>
                    {p.note && (
                      <div className="hidden md:block text-sm text-gray-500 italic max-w-[200px] truncate">
                        「{p.note}」
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Join Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 sticky top-24">
            <h3 className="text-xl font-bold text-gray-900 mb-6">我要報名</h3>
            
            {isFull ? (
              <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-center font-bold">
                抱歉，人數已滿
              </div>
            ) : (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">姓名 / 暱稱</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={joinData.name}
                    onChange={e => setJoinData({...joinData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">聯絡方式 (Line/電話)</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={joinData.contact}
                    onChange={e => setJoinData({...joinData, contact: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">備註 (選填)</label>
                  <textarea 
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                    value={joinData.note}
                    onChange={e => setJoinData({...joinData, note: e.target.value})}
                  />
                </div>
                <button 
                  disabled={joining}
                  type="submit"
                  className="w-full bg-emerald-800 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : '確認報名'}
                </button>
                <p className="text-[10px] text-gray-400 text-center">
                  報名即表示同意發起人的行程安排與安全規範。
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  useEffect(() => {
    // Test Firestore connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-[#F8F9F8] font-sans text-gray-900">
        <Navbar />
        <main>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreateEvent />} />
              <Route path="/event/:id" element={<EventDetail />} />
            </Routes>
          </AnimatePresence>
        </main>
        
        <footer className="bg-white border-t border-gray-100 py-12 mt-20">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 font-bold text-xl text-emerald-800 mb-4">
              <Mountain className="w-6 h-6" />
              <span>山健客</span>
            </div>
            <p className="text-gray-400 text-sm">© 2026 山健客邀約平台 · 讓每一次出發都充滿期待</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}
