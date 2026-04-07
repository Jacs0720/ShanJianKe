/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Version: 2026-04-07-v3 (Added Event Photos and fixed AI Analysis)
 */

import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
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
  getDocFromServer,
  updateDoc,
  deleteDoc
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
  Twitter,
  Edit,
  Trash2,
  History,
  Search,
  CheckCircle2,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Markdown from 'react-markdown';

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
  celebrationLocation?: string;
  photos?: string[];
  status?: 'active' | 'cancelled' | 'completed';
  managementPassword?: string;
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
  const isPast = event.dateTime.toDate() < new Date();
  const isCancelled = event.status === 'cancelled';

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all ${isCancelled ? 'opacity-60' : ''}`}
    >
      <Link to={`/event/${event.id}`}>
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{event.title}</h3>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isCancelled ? 'bg-red-50 text-red-700 border-red-100' :
                isPast ? 'bg-gray-50 text-gray-700 border-gray-100' :
                'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`}>
                {isCancelled ? '已取消' : isPast ? '已結束' : '招募中'}
              </span>
              <span className="text-xs font-bold text-emerald-800">
                {event.participantCount || 0} / {event.maxParticipants} 人
              </span>
            </div>
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
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('dateTime', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
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

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.creatorName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isPast = event.dateTime.toDate() < new Date();
    
    if (activeTab === 'upcoming') {
      return matchesSearch && !isPast && event.status !== 'cancelled';
    } else {
      return matchesSearch && (isPast || event.status === 'cancelled');
    }
  });

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
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="搜尋活動、地點、發起人..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-4">
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'upcoming' 
                ? 'bg-emerald-800 text-white shadow-lg shadow-emerald-900/20' 
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-5 h-5" />
            進行中 ({events.filter(e => e.dateTime.toDate() >= new Date() && e.status !== 'cancelled').length})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'history' 
                ? 'bg-gray-800 text-white shadow-lg shadow-gray-900/20' 
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <History className="w-5 h-5" />
            歷史活動 ({events.filter(e => e.dateTime.toDate() < new Date() || e.status === 'cancelled').length})
          </button>
        </div>

      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
          <Mountain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {searchTerm ? '找不到符合的活動' : activeTab === 'upcoming' ? '目前還沒有活動' : '目前還沒有歷史活動'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? '請嘗試更換關鍵字搜尋' : activeTab === 'upcoming' ? '成為第一個發起登山邀約的人吧！' : '過去的活動會顯示在這裡'}
          </p>
          {activeTab === 'upcoming' && !searchTerm && (
            <Link to="/create" className="text-emerald-700 font-bold hover:underline">立即發起活動</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => (
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
    creatorName: '',
    celebrationLocation: '',
    managementPassword: ''
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
        celebrationLocation: formData.celebrationLocation || '',
        managementPassword: formData.managementPassword || '',
        status: 'active',
        photos: [],
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

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">慶功宴地點 (選填)</label>
            <input 
              type="text" 
              placeholder="例如：某某熱炒店、火鍋店"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              value={formData.celebrationLocation}
              onChange={e => setFormData({...formData, celebrationLocation: e.target.value})}
            />
          </div>

          <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
            <label className="block text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              設定管理密碼 (必填)
            </label>
            <p className="text-xs text-amber-700 mb-4">此密碼用於日後修改或取消活動，請務必記住。</p>
            <input 
              required
              type="password" 
              placeholder="請輸入管理密碼"
              className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all bg-white"
              value={formData.managementPassword}
              onChange={e => setFormData({...formData, managementPassword: e.target.value})}
            />
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

  // Admin State
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Photo State
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  const handleAdminLogin = () => {
    if (adminPassword === event?.managementPassword) {
      setIsAdminMode(true);
      setShowAdminLogin(false);
      setAdminPassword('');
      setEditFormData({
        title: event.title,
        location: event.location,
        description: event.description,
        maxParticipants: event.maxParticipants,
        celebrationLocation: event.celebrationLocation || ''
      });
    } else {
      alert('密碼錯誤！');
    }
  };

  const handleUpdateEvent = async () => {
    if (!id || !editFormData) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'events', id), {
        ...editFormData,
        maxParticipants: Number(editFormData.maxParticipants)
      });
      setIsEditing(false);
      alert('活動已更新！');
    } catch (err) {
      console.error('Error updating event:', err);
      alert('更新失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!id || !window.confirm('確定要取消此活動嗎？此動作無法復原。')) return;
    setIsCancelling(true);
    try {
      await updateDoc(doc(db, 'events', id), {
        status: 'cancelled'
      });
      alert('活動已取消');
    } catch (err) {
      console.error('Error cancelling event:', err);
      alert('取消失敗');
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !event) return;
    
    if ((event.photos?.length || 0) >= 10) {
      alert('最多只能上傳 10 張照片！');
      return;
    }

    setUploadingPhoto(true);
    
    // Image compression logic
    const compressImage = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            // Compress to 0.7 quality to stay under Firestore 1MB limit
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
        };
      });
    };

    try {
      console.log('Starting photo compression...');
      const compressedBase64 = await compressImage(file);
      console.log('Compression complete. Size:', (compressedBase64.length / 1024).toFixed(2), 'KB');
      
      const newPhotos = [...(event.photos || []), compressedBase64];
      console.log('Updating Firestore document...');
      await updateDoc(doc(db, 'events', id), {
        photos: newPhotos
      });
      console.log('Firestore update successful!');
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('上傳失敗，可能是照片太大了 (Firestore 限制 1MB)');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (index: number) => {
    if (!id || !event || !window.confirm('確定要刪除這張照片嗎？')) return;
    try {
      const newPhotos = [...(event.photos || [])];
      newPhotos.splice(index, 1);
      await updateDoc(doc(db, 'events', id), {
        photos: newPhotos
      });
    } catch (err) {
      console.error('Error deleting photo:', err);
    }
  };

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
        // @ts-ignore
        let apiKey = (process.env.GEMINI_API_KEY as string);
        
        // Fallback to import.meta.env if process.env is not available
        if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
          // @ts-ignore
          apiKey = import.meta.env?.VITE_GEMINI_API_KEY;
        }
        
        if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
          throw new Error("API Key 未設定。請在 Vercel Settings -> Environment Variables 中新增 GEMINI_API_KEY，或在 .env 中設定 VITE_GEMINI_API_KEY。");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const result = await model.generateContent([
          "這是一張與登山活動相關的圖片（可能是裝備、地圖或風景）。請分析這張圖片，並給予專業的登山建議或資訊。",
          {
            inlineData: {
              data: base64Data,
              mimeType: file.type
            }
          }
        ]);
        
        const response = await result.response;
        const text = response.text();
        
        if (!text) {
          throw new Error("AI 回傳了空內容，請嘗試換一張照片。");
        }
        
        setAnalysisResult(text);
      } catch (error: any) {
        console.error("Gemini analysis error:", error);
        let msg = error.message || "發生未知錯誤";
        if (msg.includes("API key not valid")) {
          msg = "API Key 無效，請檢查您的金鑰是否正確。";
        }
        setAnalysisResult(`AI 分析失敗 (v2)：${msg}`);
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
              {event.celebrationLocation && (
                <div className="flex items-start gap-3">
                  <div className="bg-amber-50 p-3 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">慶功宴地點</p>
                    <p className="text-gray-900 font-bold">{event.celebrationLocation}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">活動描述</h3>
                {!isAdminMode ? (
                  <button 
                    onClick={() => setShowAdminLogin(true)}
                    className="text-xs font-bold text-gray-400 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                    管理活動
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      編輯
                    </button>
                    <button 
                      onClick={handleCancelEvent}
                      className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      取消活動
                    </button>
                    <button 
                      onClick={() => setIsAdminMode(false)}
                      className="text-xs font-bold text-gray-400 hover:underline"
                    >
                      退出管理
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="bg-gray-50 p-6 rounded-2xl mb-8 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">標題</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 rounded-lg border border-gray-200"
                      value={editFormData.title}
                      onChange={e => setEditFormData({...editFormData, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">地點</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 rounded-lg border border-gray-200"
                      value={editFormData.location}
                      onChange={e => setEditFormData({...editFormData, location: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">慶功宴</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 rounded-lg border border-gray-200"
                      value={editFormData.celebrationLocation}
                      onChange={e => setEditFormData({...editFormData, celebrationLocation: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">描述</label>
                    <textarea 
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200"
                      value={editFormData.description}
                      onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleUpdateEvent}
                      className="bg-emerald-800 text-white px-4 py-2 rounded-xl font-bold text-sm"
                    >
                      儲存修改
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold text-sm"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-600 leading-relaxed whitespace-pre-wrap mb-8">
                  {event.description || '暫無詳細描述'}
                </div>
              )}

              {showAdminLogin && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
                  >
                    <h3 className="text-xl font-bold mb-4">管理員驗證</h3>
                    <p className="text-sm text-gray-500 mb-6">請輸入發起活動時設定的管理密碼。</p>
                    <input 
                      type="password" 
                      placeholder="管理密碼"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 mb-6 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-3">
                      <button 
                        onClick={handleAdminLogin}
                        className="flex-1 bg-emerald-800 text-white py-3 rounded-xl font-bold"
                      >
                        驗證
                      </button>
                      <button 
                        onClick={() => setShowAdminLogin(false)}
                        className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold"
                      >
                        取消
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

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
                      <p className="font-bold mb-2 underline decoration-emerald-300">山林助手分析：</p>
                      <div className="prose prose-emerald max-w-none prose-sm">
                        <Markdown>{analysisResult}</Markdown>
                      </div>
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

          {/* Event Photos Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-6 h-6 text-emerald-800" />
                <h3 className="text-xl font-bold text-gray-900">活動經典回顧</h3>
              </div>
              {isAdminMode && (
                <label className="cursor-pointer bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-all flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  上傳照片
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                </label>
              )}
            </div>

            {uploadingPhoto && (
              <div className="flex items-center gap-2 text-emerald-600 font-bold mb-4 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                正在上傳照片...
              </div>
            )}

            {(!event.photos || event.photos.length === 0) ? (
              <div className="bg-gray-50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">目前還沒有活動照片</p>
                {isAdminMode && <p className="text-xs text-gray-400 mt-2">身為發起人，您可以上傳最多 10 張經典照片</p>}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {event.photos.map((photo, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden shadow-sm">
                    <img src={photo} alt={`Event Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    {isAdminMode && (
                      <button 
                        onClick={() => handleDeletePhoto(idx)}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
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
