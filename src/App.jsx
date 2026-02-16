import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import {
  Menu, X as TwitterIcon, Search, User, ShieldCheck, Edit3, Trash2,
  Plus, Image as ImageIcon, Layout, Save,
  Share2, Download, LogOut, ChevronRight, AlertTriangle, Link as LinkIcon, Upload,
  Facebook, Youtube
} from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyAIw0NeSi-0Vb9hUwyGlhx4dA3r0dbTSYo",
  authDomain: "shajgoj-ea28b.firebaseapp.com",
  projectId: "shajgoj-ea28b",
  storageBucket: "shajgoj-ea28b.firebasestorage.app",
  messagingSenderId: "1050845378650",
  appId: "1:1050845378650:web:656c247cdf22e954294063"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const appId = 'diganta-news-pwa-v2';

const getBanglaDate = () => {
  const date = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('bn-BD', options);
};

const resizeImage = (file, maxWidth = 800) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const updateMetaTags = (title) => {
  document.title = title;
  let meta = document.querySelector('meta[property="og:title"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', 'og:title');
    document.head.appendChild(meta);
  }
  meta.content = title;
};

const RichTextEditor = memo(({ value, onChange }) => {
  const insertTag = useCallback((tag) => {
    const textarea = document.getElementById('news-content');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);
    let newText = '';
    if (tag === 'b') newText = `${text.slice(0, start)}<b>${selection || 'বোল্ড'}</b>${text.slice(end)}`;
    else if (tag === 'i') newText = `${text.slice(0, start)}<i>${selection || 'ইটালিক'}</i>${text.slice(end)}`;
    else if (tag === 'br') newText = `${text.slice(0, start)}<br/>${text.slice(end)}`;
    else if (tag === 'h3') newText = `${text.slice(0, start)}<h3>${selection || 'হেডিং'}</h3>${text.slice(end)}`;
    else if (tag === 'p') newText = `${text.slice(0, start)}<p>${selection || 'প্যারাগ্রাফ'}</p>${text.slice(end)}`;

    onChange(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
    }, 0);
  }, [onChange]);

  return (
    <div className="border rounded-md overflow-hidden border-gray-300">
      <div className="bg-gray-100 p-2 flex gap-2 border-b flex-wrap">
        <button type="button" onClick={() => insertTag('b')} className="px-3 py-1 bg-white border rounded font-bold hover:bg-red-50 text-sm">B</button>
        <button type="button" onClick={() => insertTag('i')} className="px-3 py-1 bg-white border rounded italic hover:bg-red-50 text-sm">I</button>
        <button type="button" onClick={() => insertTag('h3')} className="px-3 py-1 bg-white border rounded font-bold hover:bg-red-50 text-sm">H3</button>
        <button type="button" onClick={() => insertTag('p')} className="px-3 py-1 bg-white border rounded hover:bg-red-50 text-sm">P</button>
        <button type="button" onClick={() => insertTag('br')} className="px-3 py-1 bg-white border rounded hover:bg-red-50 text-sm">New Line</button>
      </div>
      <textarea
        id="news-content"
        className="w-full h-64 p-4 focus:outline-none resize-none font-serif text-lg leading-relaxed"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="এখানে সংবাদ লিখুন..."
      />
    </div>
  );
});

const Navbar = memo(({ categories, activeCategory, setActiveCategory, setView }) => (
  <nav className="sticky top-0 bg-white z-40 border-b shadow-sm">
    <div className="container mx-auto">
      <div className="flex items-center overflow-x-auto whitespace-nowrap scrollbar-hide px-4 py-3 gap-6 md:justify-center">
        <button
          onClick={() => { setActiveCategory('সব খবর'); setView('home'); window.scrollTo(0, 0); }}
          className={`text-sm font-bold uppercase tracking-wider ${activeCategory === 'সব খবর' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-700 hover:text-red-600'}`}
        >
          সব খবর
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat.name); setView('home'); window.scrollTo(0, 0); }}
            className={`text-sm font-bold uppercase tracking-wider ${activeCategory === cat.name ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-700 hover:text-red-600'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  </nav>
));

const AdDisplay = memo(({ adData, className }) => {
  if (!adData || !adData.image) return null;
  const Content = () => (
    <img src={adData.image} alt="Advertisement" loading="lazy" className={`w-full h-auto object-cover ${className}`} />
  );
  if (adData.link) {
    return (
      <a href={adData.link} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition">
        <Content />
      </a>
    );
  }
  return <Content />;
});

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState('home');
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [permissionError, setPermissionError] = useState(false);
  const [siteSettings, setSiteSettings] = useState({
    siteName: 'দিগন্ত',
    logo: '',
    editorName: 'মঞ্জুরুল হক',
    footerText: 'স্বত্ব © ২০২৬ দিগন্ত মিডিয়া',
    breakingNews: { text: '', link: '' },
    socialLinks: { facebook: '', twitter: '', youtube: '' },
    ads: { header: { image: '', link: '' }, sidebar: { image: '', link: '' }, inArticle: { image: '', link: '' } }
  });
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [editArticle, setEditArticle] = useState(null);
  const [activeCategory, setActiveCategory] = useState('সব খবর');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    title: '', content: '', category: 'বাংলাদেশ', image: '', isLead: false
  });

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  }, [deferredPrompt]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAdmin(currentUser?.email === 'eco452@gmail.com');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleError = (err) => {
      console.error(err);
      if (err.code === 'permission-denied') setPermissionError(true);
    };

    const unsubArticles = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'articles')), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setArticles(data);
      setPermissionError(false);
    }, handleError);

    const unsubCats = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'categories'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (data.length === 0 && isAdmin) {
        ['বাংলাদেশ', 'রাজনীতি', 'অর্থনীতি', 'আন্তর্জাতিক', 'খেলা', 'বিনোদন', 'প্রযুক্তি', 'মতামত'].forEach(name =>
          addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'categories'), { name })
        );
      } else {
        setCategories(data);
      }
    }, handleError);

    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSiteSettings(prev => ({
          ...prev,
          ...data,
          ads: { ...prev.ads, ...(data.ads || {}) },
          socialLinks: { ...prev.socialLinks, ...(data.socialLinks || {}) },
          breakingNews: { ...prev.breakingNews, ...(data.breakingNews || {}) }
        }));
      }
    }, handleError);

    return () => { unsubArticles(); unsubCats(); unsubSettings(); };
  }, [isAdmin]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setView('home');
    } catch (error) {
      alert("লগইন সমস্যা: " + error.message);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    setIsAdmin(false);
    setView('home');
  }, []);

  const handleSaveArticle = useCallback(async () => {
    if (!isAdmin) return alert("পারমিশন নেই");
    if (!formData.title) return alert('শিরোনাম দিন');

    const payload = {
      ...formData,
      timestamp: serverTimestamp(),
      author: siteSettings.editorName
    };

    try {
      if (editArticle) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'articles', editArticle.id), payload);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'articles'), payload);
      }
      setEditArticle(null);
      setFormData({ title: '', content: '', category: 'বাংলাদেশ', image: '', isLead: false });
      alert('সফলভাবে সংরক্ষিত হয়েছে');
    } catch (e) {
      alert('ত্রুটি: ' + e.message);
    }
  }, [isAdmin, formData, editArticle, siteSettings.editorName]);

  const handleDelete = useCallback(async (id) => {
    if (!isAdmin) return;
    if (confirm('মুছে ফেলতে চান?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'articles', id));
    }
  }, [isAdmin]);

  const handleImageUpload = useCallback(async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await resizeImage(file, 800);
    if (field === 'article') {
      setFormData(prev => ({ ...prev, image: base64 }));
    } else if (field === 'logo') {
      handleSettingUpdate('logo', base64);
    } else if (field.startsWith('ad_')) {
      const adType = field.split('_')[1];
      const newAds = { ...siteSettings.ads, [adType]: { ...siteSettings.ads[adType], image: base64 } };
      handleSettingUpdate('ads', newAds);
    }
  }, [siteSettings.ads]);

  const handleSettingUpdate = useCallback(async (key, value) => {
    const newSettings = { ...siteSettings, [key]: value };
    setSiteSettings(newSettings);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), newSettings);
    } catch (e) {
      console.error(e);
    }
  }, [siteSettings]);

  const handleAdLinkUpdate = useCallback((adType, link) => {
    const newAds = { ...siteSettings.ads, [adType]: { ...siteSettings.ads[adType], link } };
    handleSettingUpdate('ads', newAds);
  }, [siteSettings.ads, handleSettingUpdate]);

  const handleSocialUpdate = useCallback((platform, value) => {
    const newSocial = { ...siteSettings.socialLinks, [platform]: value };
    handleSettingUpdate('socialLinks', newSocial);
  }, [siteSettings.socialLinks, handleSettingUpdate]);

  const handleBreakingUpdate = useCallback((field, value) => {
    const newBreaking = { ...siteSettings.breakingNews, [field]: value };
    handleSettingUpdate('breakingNews', newBreaking);
  }, [siteSettings.breakingNews, handleSettingUpdate]);

  const HomeView = memo(() => {
    const filtered = useMemo(() =>
      activeCategory === 'সব খবর' ? articles : articles.filter(a => a.category === activeCategory),
      [articles, activeCategory]
    );

    const lead = useMemo(() => filtered.find(a => a.isLead) || filtered[0], [filtered]);
    const others = useMemo(() => filtered.filter(a => a.id !== lead?.id), [filtered, lead]);
    const topRead = useMemo(() => articles.slice(0, 5), [articles]);

    return (
      <div className="pb-10">
        {permissionError && (
          <div className="bg-red-600 text-white p-2 text-center text-sm">
            ডাটাবেজ পারমিশন সমস্যা। ফায়ারবেস রুলস চেক করুন।
          </div>
        )}

        {siteSettings.breakingNews?.text && (
          <div className="bg-red-600 text-white py-2 text-center text-sm font-bold">
            <div className="container mx-auto px-4">
              <span className="mr-2">ব্রেকিং:</span>
              {siteSettings.breakingNews.link ? (
                <a href={siteSettings.breakingNews.link} target="_blank" rel="noopener noreferrer" className="underline">
                  {siteSettings.breakingNews.text}
                </a>
              ) : siteSettings.breakingNews.text}
            </div>
          </div>
        )}

        <div className="bg-white pt-4 pb-2 border-b">
          <div className="container mx-auto px-4 flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>{getBanglaDate()}</span>
            <div className="flex items-center gap-3">
              {isAdmin ? (
                <div className="flex gap-2">
                  <button onClick={() => setView('admin')} className="flex items-center gap-1 text-red-600 font-bold hover:underline">
                    <ShieldCheck size={14} /> ড্যাশবোর্ড
                  </button>
                  <button onClick={handleLogout} className="text-gray-500 hover:text-black">লগ আউট</button>
                </div>
              ) : (
                <button onClick={() => setView('login')} className="flex items-center gap-1 hover:text-red-600 font-bold">
                  <User size={14} /> এডমিন লগইন
                </button>
              )}
            </div>
          </div>

          <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="cursor-pointer" onClick={() => setView('home')}>
              {siteSettings.logo ? (
                <img src={siteSettings.logo} alt="Logo" loading="lazy" className="h-16 md:h-20 object-contain" />
              ) : (
                <h1 className="text-5xl font-extrabold text-black font-serif tracking-tight">{siteSettings.siteName}</h1>
              )}
            </div>
            {siteSettings.ads?.header?.image && (
              <div className="w-full md:w-auto max-w-[728px]">
                <AdDisplay adData={siteSettings.ads.header} className="h-auto max-h-24 w-auto mx-auto rounded" />
              </div>
            )}
          </div>
        </div>

        <Navbar categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} setView={setView} />

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-9">
              {lead && (
                <div onClick={() => { setSelectedArticle(lead); setView('article'); updateMetaTags(lead.title); }} className="mb-8 cursor-pointer group">
                  <div className="grid md:grid-cols-2 gap-6 items-start">
                    <div className="order-2 md:order-1">
                      <span className="text-red-600 font-bold text-sm mb-2 inline-block">{lead.category}</span>
                      <h2 className="text-3xl md:text-4xl font-bold font-serif leading-tight group-hover:text-red-600 transition-colors">
                        {lead.title}
                      </h2>
                      <p className="text-gray-600 mt-3 text-lg line-clamp-3 leading-relaxed">
                        {lead.content.replace(/<[^>]+>/g, '')}
                      </p>
                    </div>
                    <div className="order-1 md:order-2">
                      <div className="overflow-hidden rounded-lg aspect-video bg-gray-100">
                        {lead.image ? (
                          <img src={lead.image} alt={lead.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">ছবি নেই</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 my-6"></div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {others.map(news => (
                  <div key={news.id} onClick={() => { setSelectedArticle(news); setView('article'); updateMetaTags(news.title); }} className="cursor-pointer group flex flex-col h-full">
                    <div className="overflow-hidden rounded-lg mb-3 aspect-video bg-gray-100">
                      {news.image && <img src={news.image} alt={news.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />}
                    </div>
                    <h3 className="font-serif font-bold text-lg leading-snug group-hover:text-red-600 mb-2">
                      {news.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-auto">
                      {news.content.replace(/<[^>]+>/g, '')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 space-y-8 border-l border-gray-100 pl-0 lg:pl-6">
              {siteSettings.ads?.sidebar?.image && (
                <div className="bg-gray-50 rounded border overflow-hidden">
                  <AdDisplay adData={siteSettings.ads.sidebar} />
                  <p className="text-[10px] text-center text-gray-400">বিজ্ঞাপন</p>
                </div>
              )}

              <div>
                <h4 className="font-bold text-xl border-b-2 border-red-600 inline-block mb-4 pr-4">সর্বাধিক পঠিত</h4>
                <div className="space-y-4">
                  {topRead.map((news, i) => (
                    <div key={news.id} onClick={() => { setSelectedArticle(news); setView('article'); }} className="flex gap-3 cursor-pointer group border-b border-gray-100 pb-2">
                      <span className="text-3xl font-extrabold text-gray-200">{i + 1}</span>
                      <h5 className="font-medium text-sm group-hover:text-red-600 leading-snug">{news.title}</h5>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="bg-gray-900 text-white mt-12 py-12">
          <div className="container mx-auto px-4 text-center">
            {siteSettings.logo ? (
              <img src={siteSettings.logo} loading="lazy" className="h-16 mx-auto mb-4 filter brightness-0 invert" alt="logo" />
            ) : (
              <h2 className="text-2xl font-bold mb-4">{siteSettings.siteName}</h2>
            )}
            <p className="text-gray-400 mb-2">সম্পাদক: {siteSettings.editorName}</p>
            <div className="flex justify-center gap-6 mb-6">
              {siteSettings.socialLinks?.facebook && <a href={siteSettings.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-red-500"><Facebook size={28} /></a>}
              {siteSettings.socialLinks?.twitter && <a href={siteSettings.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-red-500"><TwitterIcon size={28} /></a>}
              {siteSettings.socialLinks?.youtube && <a href={siteSettings.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-red-500"><Youtube size={28} /></a>}
            </div>
            <div className="border-t border-gray-800 pt-6">
              <p className="text-sm text-gray-500">{siteSettings.footerText}</p>
            </div>
          </div>
        </footer>
      </div>
    );
  });

  const ArticleView = memo(() => {
    const handleShare = useCallback(async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: selectedArticle.title, url: window.location.href });
        } catch { }
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert('লিংক কপি করা হয়েছে');
      }
    }, [selectedArticle]);

    return (
      <div className="bg-white min-h-screen pb-10">
        <Navbar categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} setView={setView} />
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex gap-2 text-sm text-gray-500 mb-4">
            <span className="text-red-600 font-bold cursor-pointer" onClick={() => setView('home')}>হোম</span>
            <span>/</span>
            <span>{selectedArticle.category}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold font-serif mb-4 leading-tight">
            {selectedArticle.title}
          </h1>
          <div className="flex justify-between items-center border-t border-b py-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                {selectedArticle.author?.[0] || 'A'}
              </div>
              <div className="text-xs">
                <p className="font-bold text-gray-800">{selectedArticle.author}</p>
                <p className="text-gray-500">{getBanglaDate()}</p>
              </div>
            </div>
            <button onClick={handleShare} className="text-gray-400 hover:text-blue-600"><Share2 size={20} /></button>
          </div>

          {selectedArticle.image && (
            <div className="mb-8">
              <img src={selectedArticle.image} loading="lazy" className="w-full h-auto rounded-lg" alt={selectedArticle.title} />
              <p className="text-xs text-center text-gray-500 mt-2">ছবি: সংগৃহীত</p>
            </div>
          )}

          {siteSettings.ads?.inArticle?.image && (
            <div className="my-8 flex justify-center bg-gray-50 py-4 border-y">
              <div className="max-w-[80%]">
                <AdDisplay adData={siteSettings.ads.inArticle} />
                <p className="text-[10px] text-center text-gray-400 mt-1">বিজ্ঞাপন</p>
              </div>
            </div>
          )}

          <div
            className="prose prose-lg max-w-none font-serif text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
          />
        </div>

        <footer className="bg-gray-900 text-white mt-12 py-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-gray-500">{siteSettings.footerText}</p>
          </div>
        </footer>
      </div>
    );
  });

  const filteredArticles = useMemo(() => articles.filter(news =>
    news.title.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    news.content.replace(/<[^>]+>/g, '').toLowerCase().includes(adminSearchTerm.toLowerCase())
  ), [articles, adminSearchTerm]);

  const AdminView = memo(() => (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-white shadow p-4 sticky top-0 z-30">
        <div className="container mx-auto flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2 text-red-600"><ShieldCheck /> এডমিন প্যানেল</h2>
          <div className="flex gap-3">
            <span className="hidden md:block text-sm py-2 px-3 bg-red-50 text-red-600 rounded">{user?.email}</span>
            <button onClick={() => setView('home')} className="bg-gray-100 px-4 py-2 rounded hover:bg-gray-200 text-sm">প্রিভিউ</button>
            <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm">লগ আউট</button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded shadow">
            <h3 className="font-bold border-b pb-2 mb-4">{editArticle ? 'সংবাদ ইডিট করুন' : 'নতুন সংবাদ যুক্ত করুন'}</h3>
            <div className="space-y-4">
              <input className="w-full p-2 border rounded font-bold text-lg focus:ring-2 focus:ring-red-200 outline-none" placeholder="শিরোনাম লিখুন..." value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              <div className="flex gap-4">
                <select className="p-2 border rounded bg-white flex-1" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <div className="flex items-center gap-2 border px-3 rounded bg-gray-50 cursor-pointer relative overflow-hidden flex-1 justify-center">
                  <ImageIcon size={18} className="text-gray-500" />
                  <span className="text-sm text-gray-600">{formData.image ? 'ছবি যুক্ত' : 'ছবি'}</span>
                  <input type="file" onChange={(e) => handleImageUpload(e, 'article')} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                </div>
              </div>
              <div className="flex items-center gap-2 my-2">
                <input type="checkbox" id="leadCheck" checked={formData.isLead} onChange={e => setFormData({ ...formData, isLead: e.target.checked })} className="w-4 h-4 text-red-600" />
                <label htmlFor="leadCheck" className="text-sm font-bold text-red-600">লিড নিউজ</label>
              </div>
              <RichTextEditor value={formData.content} onChange={(val) => setFormData({ ...formData, content: val })} />
              <div className="flex justify-end gap-3 pt-2">
                {editArticle && <button onClick={() => { setEditArticle(null); setFormData({ title: '', content: '', category: 'বাংলাদেশ', image: '', isLead: false }); }} className="px-4 py-2 bg-gray-200 rounded">বাতিল</button>}
                <button onClick={handleSaveArticle} className="px-6 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 flex items-center gap-2"><Save size={16} /> সংরক্ষণ করুন</button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded shadow">
            <h3 className="font-bold border-b pb-2 mb-4">সকল সংবাদ ({articles.length})</h3>
            <input
              type="text"
              placeholder="শিরোনাম বা কন্টেন্ট দিয়ে খুঁজুন..."
              value={adminSearchTerm}
              onChange={e => setAdminSearchTerm(e.target.value)}
              className="w-full p-2 border rounded mb-4"
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredArticles.map(news => (
                <div key={news.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border rounded">
                  <div className="flex gap-2 items-center overflow-hidden">
                    {news.image && <img src={news.image} loading="lazy" className="w-10 h-10 object-cover rounded" alt={news.title} />}
                    <span className="truncate font-medium text-sm">{news.title}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setEditArticle(news); setFormData(news); window.scrollTo(0, 0); }} className="text-blue-600 p-1 hover:bg-blue-50 rounded"><Edit3 size={16} /></button>
                    <button onClick={() => handleDelete(news.id)} className="text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded shadow">
            <h3 className="font-bold border-b pb-2 mb-4">সাইট সেটিংস</h3>
            <div class className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">সাইটের নাম</label>
                <input value={siteSettings.siteName} onChange={e => handleSettingUpdate('siteName', e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">সম্পাদকের নাম</label>
                <input value={siteSettings.editorName} onChange={e => handleSettingUpdate('editorName', e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">লোগো আপলোড</label>
                <div className="border border-dashed p-4 rounded flex items-center justify-center relative bg-gray-50 cursor-pointer">
                  {siteSettings.logo ? <img src={siteSettings.logo} loading="lazy" className="max-h-20" alt="logo preview" /> : <span className="text-sm text-gray-400">লোগো আপলোড করুন</span>}
                  <input type="file" onChange={(e) => handleImageUpload(e, 'logo')} className="absolute inset-0 opacity-0" accept="image/*" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">ফুটার টেক্সট</label>
                <input value={siteSettings.footerText} onChange={e => handleSettingUpdate('footerText', e.target.value)} className="w-full p-2 border rounded" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded shadow">
            <h3 className="font-bold border-b pb-2 mb-4">ব্রেকিং নিউজ</h3>
            <div className="space-y-3">
              <input value={siteSettings.breakingNews?.text || ''} onChange={e => handleBreakingUpdate('text', e.target.value)} placeholder="ব্রেকিং নিউজ টেক্সট" className="w-full p-2 border rounded" />
              <input value={siteSettings.breakingNews?.link || ''} onChange={e => handleBreakingUpdate('link', e.target.value)} placeholder="লিংক (ঐচ্ছিক)" className="w-full p-2 border rounded" />
            </div>
          </div>

          <div className="bg-white p-6 rounded shadow">
            <h3 className="font-bold border-b pb-2 mb-4">সোশ্যাল মিডিয়া লিংক</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Facebook</label>
                <input value={siteSettings.socialLinks?.facebook || ''} onChange={e => handleSocialUpdate('facebook', e.target.value)} placeholder="https://facebook.com/..." className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Twitter / X</label>
                <input value={siteSettings.socialLinks?.twitter || ''} onChange={e => handleSocialUpdate('twitter', e.target.value)} placeholder="https://twitter.com/..." className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Youtube</label>
                <input value={siteSettings.socialLinks?.youtube || ''} onChange={e => handleSocialUpdate('youtube', e.target.value)} placeholder="https://youtube.com/..." className="w-full p-2 border rounded" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded shadow">
            <h3 className="font-bold border-b pb-2 mb-4 flex items-center gap-2"><Layout size={18} /> বিজ্ঞাপন ম্যানেজ করুন</h3>

            <div className="mb-6 border-b pb-6">
              <label className="text-sm font-bold text-red-600 block mb-2">১. হেডার বিজ্ঞাপন</label>
              <div className="flex gap-3 mb-3">
                <div className="relative border p-3 w-24 h-16 bg-gray-50 rounded flex items-center justify-center cursor-pointer">
                  <ImageIcon size={20} className="text-gray-400" />
                  <input type="file" onChange={(e) => handleImageUpload(e, 'ad_header')} className="absolute inset-0 opacity-0" accept="image/*" />
                </div>
                <input value={siteSettings.ads?.header?.link || ''} onChange={e => handleAdLinkUpdate('header', e.target.value)} placeholder="বিজ্ঞাপনের লিংক" className="flex-1 p-2 border rounded text-sm" />
              </div>
              {siteSettings.ads?.header?.image && <img src={siteSettings.ads.header.image} loading="lazy" className="w-full max-h-32 object-contain border rounded" alt="header ad preview" />}
            </div>

            <div className="mb-6 border-b pb-6">
              <label className="text-sm font-bold text-red-600 block mb-2">২. সাইডবার বিজ্ঞাপন</label>
              <div className="flex gap-3 mb-3">
                <div className="relative border p-3 w-24 h-16 bg-gray-50 rounded flex items-center justify-center cursor-pointer">
                  <ImageIcon size={20} className="text-gray-400" />
                  <input type="file" onChange={(e) => handleImageUpload(e, 'ad_sidebar')} className="absolute inset-0 opacity-0" accept="image/*" />
                </div>
                <input value={siteSettings.ads?.sidebar?.link || ''} onChange={e => handleAdLinkUpdate('sidebar', e.target.value)} placeholder="বিজ্ঞাপনের লিংক" className="flex-1 p-2 border rounded text-sm" />
              </div>
              {siteSettings.ads?.sidebar?.image && <img src={siteSettings.ads.sidebar.image} loading="lazy" className="w-full max-h-32 object-contain border rounded" alt="sidebar ad preview" />}
            </div>

            <div>
              <label className="text-sm font-bold text-red-600 block mb-2">৩. আর্টিকেলের ভেতরের বিজ্ঞাপন</label>
              <div className="flex gap-3 mb-3">
                <div className="relative border p-3 w-24 h-16 bg-gray-50 rounded flex items-center justify-center cursor-pointer">
                  <ImageIcon size={20} className="text-gray-400" />
                  <input type="file" onChange={(e) => handleImageUpload(e, 'ad_inArticle')} className="absolute inset-0 opacity-0" accept="image/*" />
                </div>
                <input value={siteSettings.ads?.inArticle?.link || ''} onChange={e => handleAdLinkUpdate('inArticle', e.target.value)} placeholder="বিজ্ঞাপনের লিংক" className="flex-1 p-2 border rounded text-sm" />
              </div>
              {siteSettings.ads?.inArticle?.image && <img src={siteSettings.ads.inArticle.image} loading="lazy" className="w-full max-h-32 object-contain border rounded" alt="in-article ad preview" />}
            </div>
          </div>

          <div className="bg-white p-6 rounded shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">ক্যাটাগরি</h3>
              <button onClick={() => { const n = prompt('নতুন ক্যাটাগরির নাম:'); if (n) addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'categories'), { name: n }); }} className="bg-red-100 text-red-600 p-1 rounded"><Plus size={16} /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <span key={c.id} className="bg-gray-100 px-3 py-1 rounded text-sm flex items-center gap-1">
                  {c.name}
                  <X size={14} className="cursor-pointer hover:text-red-600" onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'categories', c.id))} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  ));

  const LoginModal = () => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-lg shadow-2xl p-8 relative">
        <button onClick={() => setView('home')} className="absolute top-4 right-4 text-gray-400 hover:text-red-600"><X /></button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold">এডমিন লগইন</h2>
        </div>
        <button onClick={handleGoogleLogin} className="w-full py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded hover:bg-gray-50 shadow flex items-center justify-center gap-2">
          Google দিয়ে লগইন করুন
        </button>
        <p className="text-xs text-center text-red-500 mt-3">শুধুমাত্র eco452@gmail.com অনুমোদিত</p>
      </div>
    </div>
  );

  const InstallButton = () => (
    showInstallBtn && (
      <div className="fixed top-20 right-4 z-50">
        <div className="bg-red-600 text-white p-4 rounded-lg shadow-xl flex items-center gap-3 max-w-xs">
          <button onClick={() => setShowInstallBtn(false)} className="absolute -top-2 -right-2 bg-white text-red-600 rounded-full p-1"><X size={16} /></button>
          <Download size={24} />
          <div>
            <p className="font-bold text-sm">অ্যাপটি ইন্সটল করুন</p>
          </div>
          <button onClick={handleInstallClick} className="bg-white text-red-600 px-4 py-2 rounded text-sm font-bold">
            Install
          </button>
        </div>
      </div>
    )
  );

  return (
    <div className="font-sans text-gray-900 selection:bg-red-100 selection:text-red-900">
      <InstallButton />
      {view === 'home' && <HomeView />}
      {view === 'article' && selectedArticle && <ArticleView />}
      {view === 'login' && <LoginModal />}
      {view === 'admin' && isAdmin && <AdminView />}
    </div>
  );
}