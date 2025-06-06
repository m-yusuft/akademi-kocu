import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updatePassword // Import updatePassword
} from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, orderBy, addDoc, getDoc, getDocs } from 'firebase/firestore'; 
import { getAnalytics } from "firebase/analytics"; 

// Global variables provided by the Canvas environment (but we will override appId for consistency)
// Kullanıcının belirttiği Firebase App ID'si doğrudan buraya sabitlendi
const appId = "1:888851418003:web:93af30523686bb68703666"; // Kullanıcının sağladığı ID

// Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyB-RFU2T1dyDmc_1nII-J0wsxsEm9gYz_U",
  authDomain: "ogrenci-rehberi-c3f41.firebaseapp.com",
  projectId: "ogrenci-rehberi-c3f41",
  storageBucket: "ogrenci-rehberi-c3f41.firebasestorage.app",
  messagingSenderId: "888851418003",
  appId: "1:888851418003:web:93af30523686bb68703666",
  measurementId: "G-XRGP4RK0CP"
};

// Firebase app, db, auth instances
let app, db, auth, analytics;

// Calculate date limits for birth year validation
const currentYear = new Date().getFullYear();
const minBirthYear = currentYear - 100; // Allow users up to 100 years old
const maxBirthYear = currentYear;       // Disallow future years

const minDateString = `${minBirthYear}-01-01`;
const maxDateString = `${maxBirthYear}-12-31`;

// Utility function to get subjects based on class
function getSubjectsForClass(studentClass) {
  const subjects = {
    '1': ['Türkçe', 'Matematik', 'Hayat Bilgisi', 'İngilizce'],
    '2': ['Türkçe', 'Matematik', 'Hayat Bilgisi', 'İngilizce'],
    '3': ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Hayat Bilgisi', 'İngilizce'],
    '4': ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce'],
    '5': ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce'],
    '6': ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce'],
    '7': ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce'],
    '8': ['Türkçe', 'Matematik', 'Fen Bilimleri', 'T.C. İnkılap Tarihi ve Atatürkçülük', 'Din Kültürü ve Ahlak Bilgisi', 'İngilizce'], // LGS subjects
    '9': ['Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Din Kültürü ve Ahlak Bilgisi', 'İngilizce'],
    '10': ['Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Din Kültürü ve Ahlak Bilgisi', 'İngilizce'],
    '11': ['Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü ve Ahlak Bilgisi', 'İngilizce'],
    '12': ['Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü ve Ahlak Bilgisi', 'İngilizce'], // TYT/AYT subjects
    'Mezun': ['Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü ve Ahlak Bilgisi', 'İngilizce'], // TYT/AYT subjects
  };
  return subjects[studentClass] || [];
}

// Confirmation Modal Component (renders nothing if not shown)
const ConfirmationModal = ({ show, message, onConfirm, onCancel }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full text-center">
        <p className="text-lg font-semibold mb-4">{message}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
          >
            Evet, Sil
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
};

// Login / Register component
const LoginRegister = React.memo(({ setAppError }) => { 
  const [isRegister, setIsRegister] = useState(false); // Varsayılan olarak giriş sayfasını aç
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [message, setMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('');
    setAppError(null); 

    // Validate date of birth for registration
    if (isRegister && dateOfBirth) {
      const birthYear = new Date(dateOfBirth).getFullYear();
      if (birthYear < minBirthYear || birthYear > maxBirthYear) {
        setMessage(`Doğum yılı ${minBirthYear} ile ${maxBirthYear} arasında olmalıdır.`);
        return;
      }
    }

    try {
      if (isRegister) {
        // Firebase Auth ile yeni kullanıcı oluştur
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // Firestore'a kullanıcının profil bilgilerini kaydet (sadece ilk kez)
        const newProfileData = {
          id: firebaseUser.uid, 
          name,
          class: selectedClass,
          email: firebaseUser.email, 
          dateOfBirth,
        };
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'registeredUsers', firebaseUser.uid), newProfileData);
        setMessage("Kayıt başarılı! Giriş yapılıyor...");
        // Do NOT setPseudoUserId or setProfile here. Let onAuthStateChanged handle it.
      } else {
        // Firebase Auth ile giriş yap
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // Kullanıcının Firestore'daki profilini kontrol et ve yoksa temel bir profil oluştur
        const publicProfileRef = doc(db, 'artifacts', appId, 'public', 'data', 'registeredUsers', firebaseUser.uid);
        const publicProfileSnap = await getDoc(publicProfileRef);

        if (!publicProfileSnap.exists()) {
          // Profil Firestore'da bulunamadı - temel bir profille kaydet
          const basicProfileData = {
            id: firebaseUser.uid,
            name: "", // Varsayılan isim boş olabilir
            class: "",             // Varsayılan sınıf
            email: firebaseUser.email,
            dateOfBirth: "",       // Varsayılan doğum tarihi
          };
          // { merge: true } zaten yoksa oluşturur, varsa birleştirir.
          await setDoc(publicProfileRef, basicProfileData, { merge: true }); 
          setMessage("Giriş başarılı! Profil bilgileriniz bulunamadı, lütfen profilinizi güncelleyiniz.");
        } else {
          setMessage("Giriş başarılı!");
        }
        // Do NOT setPseudoUserId or setProfile here. Let onAuthStateChanged handle it.
      }
    } catch (error) {
      console.error("Kimlik doğrulama hatası:", error);
      let userFacingMessage = "Bir hata oluştu. Lütfen bilgilerinizi kontrol edin.";

      switch (error.code) {
        case 'auth/email-already-in-use':
          userFacingMessage = "Bu e-posta adresi zaten kullanımda.";
          break;
        case 'auth/invalid-email':
          userFacingMessage = "Geçersiz e-posta adresi.";
          break;
        case 'auth/weak-password':
          userFacingMessage = "Parola en az 6 karakter olmalıdır.";
          break;
        case 'auth/user-not-found':
            userFacingMessage = "Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı. Lütfen kayıt olun.";
            setIsRegister(true); // Kullanıcı bulunamazsa kayıt moduna geç
            break;
        case 'auth/wrong-password':
          userFacingMessage = "Geçersiz e-posta veya parola.";
          break;
        case 'auth/network-request-failed':
          userFacingMessage = "Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.";
          break;
        default:
          userFacingMessage = `Kimlik doğrulama hatası: ${error.message}`;
          break;
      }
      setMessage(userFacingMessage);
    }
  };

  const handleForgotPassword = () => {
      setMessage("Şifre sıfırlama özelliği bu demo ortamında aktif değildir. Lütfen yöneticinizle iletişime geçin.");
      console.warn("Şifre sıfırlama işlevi simüle edilmiştir.");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-700 to-indigo-900 p-4 font-inter animate-fade-in">
      <div className="bg-white p-10 rounded-3xl shadow-2xl border-t-8 border-blue-600 w-full max-w-md transform transition-transform duration-500 hover:scale-[1.01]">
        <h2 className="text-4xl font-extrabold text-center text-gray-800 mb-8 drop-shadow-sm">
          {isRegister ? 'Yeni Hesap Oluştur' : 'Giriş Yap'}
        </h2>
        {message && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 transition-all duration-300 transform animate-pulse-once" role="alert">
            <span className="block sm:inline">{message}</span>
          </div>
        )}
        <form onSubmit={handleAuth} className="space-y-6">
          <div className="relative">
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="email">
              E-posta Adresi
            </label>
            <input
              type="email"
              id="email"
              className="shadow-sm appearance-none border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 placeholder-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@mail.com"
              required
            />
          </div>
          <div className="relative">
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">
              Parola
            </label>
            <input
              type="password"
              id="password"
              className="shadow-sm appearance-none border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 placeholder-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 karakter"
              required
            />
          </div>

          {isRegister && (
            <>
              <div className="relative">
                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="name">
                  Adınız Soyadınız
                </label>
                <input
                  type="text"
                  id="name"
                  className="shadow-sm appearance-none border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 placeholder-gray-400"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Adınız ve soyadınız"
                  required
                />
              </div>
              <div className="relative">
                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="dateOfBirth">
                  Doğum Tarihi
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  className="shadow-sm appearance-none border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  min={minDateString} 
                  max={maxDateString} 
                  required
                />
              </div>
              <div className="relative">
                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="class">
                  Sınıfınız
                </label>
                <select
                  id="class"
                  className="shadow-sm appearance-none border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  required
                >
                  <option value="">Sınıf Seçiniz</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>{num}. Sınıf</option>
                  ))}
                  <option value="Mezun">Mezun</option>
                </select>
              </div>
            </>
          )}
          <div className="flex flex-col space-y-4">
            {/* Conditional rendering for Login vs. Register button */}
            {!isRegister ? ( // If not registering, then it's logging in
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>Giriş Yap
              </button>
            ) : ( // If isRegister is true, then it's registering
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                <i className="fas fa-user-plus mr-2"></i>Kaydol
              </button>
            )}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setMessage(''); }} // Clear message on toggle
              className="inline-block align-baseline font-bold text-sm text-blue-600 hover:text-blue-800"
            >
              {isRegister ? 'Zaten hesabınız var mı? Giriş Yap' : 'Hesabınız yok mu? Kaydol'}
            </button>
          </div>
          {/* İletişim Bilgileri */}
          <div className="text-center text-sm text-gray-600 mt-4">
            <p>Destek için:</p>
            <p className="font-semibold">Instagram: <a href="https://www.instagram.com/sirfatihsultanterim" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">@sirfatihsultanterim</a></p>
            <p className="font-semibold">E-posta: <a href="mailto:yusuf.akademikkocudestek@gmail.com" className="text-blue-600 hover:underline">yusuf.akademikkocudestek@gmail.com</a></p>
          </div>
        </form>
      </div>
      {/* Custom CSS for fade-in animation */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.7s ease-out forwards;
        }
        @keyframes pulse-once {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        .animate-pulse-once {
          animation: pulse-once 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
});

// Dashboard Component
const Dashboard = React.memo(({ profile, progressData, pseudoUserId, aiRecommendations, fetchAiRecommendations, handleEditProgress, handleDeleteProgress }) => {
  // Calculate overall totals from all entries and all subjects within each entry
  const totalCorrect = progressData.reduce((acc, entry) => acc + (entry.entries ? entry.entries.reduce((sum, item) => sum + (item.correct || 0), 0) : 0), 0);
  const totalIncorrect = progressData.reduce((acc, entry) => acc + (entry.entries ? entry.entries.reduce((sum, item) => sum + (item.incorrect || 0), 0) : 0), 0);
  const totalBlank = progressData.reduce((acc, entry) => acc + (entry.entries ? entry.entries.reduce((sum, item) => sum + (item.blank || 0), 0) : 0), 0);
  const totalQuestions = totalCorrect + totalIncorrect + totalBlank;

  // Helper function to get countdown string
  const getCountdown = (targetDate) => {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance < 0) return "Sınav geçti!";

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Add a non-breaking space after digits and before units for consistent width
    const formatNumber = (num) => String(num).padStart(2, '0');

    // Return a plain string, not a JSX element
    return `${formatNumber(days)} gün ${formatNumber(hours)} saat ${formatNumber(minutes)} dakika ${formatNumber(seconds)} saniye`;
  };

  // Updated target dates for 2025
  const tytTarget = new Date('2025-06-21T10:00:00').getTime(); 
  const aytTarget = new Date('2025-06-22T10:00:00').getTime(); 
  const lgsTarget = new Date('2025-06-14T09:00:00').getTime(); // Adjusted to Saturday June 14, 2025

  const [tytCountdown, setTytCountdown] = useState('');
  const [aytCountdown, setAytCountdown] = useState('');
  const [lgsCountdown, setLgsCountdown] = useState('');

  useEffect(() => {
    let tytInterval, aytInterval, lgsInterval;

    // Only set intervals if profile class matches
    if (profile && (profile.class === '12' || profile.class === 'Mezun')) {
      setTytCountdown(getCountdown(tytTarget)); // Initial call
      setAytCountdown(getCountdown(aytTarget)); // Initial call
      tytInterval = setInterval(() => {
        setTytCountdown(getCountdown(tytTarget));
      }, 1000);
      aytInterval = setInterval(() => {
        setAytCountdown(getCountdown(aytTarget));
      }, 1000);
    } else { // Clear if class doesn't match
      setTytCountdown('');
      setAytCountdown('');
    }

    if (profile && profile.class === '8') {
      setLgsCountdown(getCountdown(lgsTarget)); // Initial call
      lgsInterval = setInterval(() => {
        setLgsCountdown(getCountdown(lgsTarget));
      }, 1000);
    } else { // Clear if class doesn't match
      setLgsCountdown('');
    }

    return () => {
      if (tytInterval) clearInterval(tytInterval);
      if (aytInterval) clearInterval(aytInterval);
      if (lgsInterval) clearInterval(lgsInterval);
    };
  }, [profile, tytTarget, aytTarget, lgsTarget]); // Add target dates to dependencies for clarity if they were dynamic

  // Subject categories for estimated score calculation
  const subjectCategories = {
      'Sayısal': ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'],
      'Sözel': ['Türk Dili ve Edebiyatı', 'Tarih', 'Coğrafya', 'Din Kültürü ve Ahlak Bilgisi'],
      'Eşit Ağırlık': ['Türk Dili ve Edebiyatı', 'Matematik', 'Tarih', 'Coğrafya', 'Felsefe']
  };

  // Calculate total nets for specific areas from all progress entries
  const calculateAreaNets = (areaSubjects) => {
      return progressData.reduce((acc, entry) => {
          if (entry.entries) {
              return acc + entry.entries
                  .filter(item => areaSubjects.includes(item.subject))
                  .reduce((sum, item) => sum + (item.correct || 0) - (item.incorrect || 0) / 4, 0);
          }
          return acc;
      }, 0);
  };

  const calculateEstimatedScoreAndRank = (nets, type) => {
    let estimatedPoints = 0;
    let estimatedRank = 'Bilinmiyor';

    // Example weighting and ranking logic (simplified)
    if (type === 'TYT/AYT') {
      estimatedPoints = nets * 2.5;
      if (nets >= 180) estimatedRank = 'İlk 5K';
      else if (nets >= 150) estimatedRank = 'İlk 20K';
      else if (nets >= 120) estimatedRank = 'İlk 50K';
      else if (nets >= 80) estimatedRank = 'İlk 100K';
      else if (nets >= 50) estimatedRank = 'İlk 200K';
      else if (nets > 0) estimatedRank = '200K+';
      else estimatedRank = 'Çok Düşük'; // Even for 0 net, provide a category
    } else if (type === 'LGS') {
      estimatedPoints = nets * 5;
      if (nets >= 90) estimatedRank = 'İlk 5K';
      else if (nets >= 80) estimatedRank = 'İlk 10K';
      else if (nets >= 60) estimatedRank = 'İlk 20K';
      else if (nets >= 40) estimatedRank = 'İlk 50K';
      else if (nets > 0) estimatedRank = '50K+';
      else estimatedRank = 'Çok Düşük'; // Even for 0 net, provide a category
    }
    return `Tahmini Puan: ${estimatedPoints.toFixed(2)}, Tahmini Sıralama: ${estimatedRank}`;
  };

  const numericalNets = calculateAreaNets(subjectCategories['Sayısal']);
  const verbalNets = calculateAreaNets(subjectCategories['Sözel']);
  const equalWeightNets = calculateAreaNets(subjectCategories['Eşit Ağırlık']);
  const overallLGSNets = calculateAreaNets([
      'Türkçe', 'Matematik', 'Fen Bilimleri', 'T.C. İnkılap Tarihi ve Atatürkçülük',
      'Din Kültürü ve Ahlak Bilgisi', 'İngilizce'
  ]);


  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-64px)] rounded-lg">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Kontrol Paneli</h1>

      {/* User ID display for multi-user apps */}
      <p className="text-sm text-gray-600 mb-4 text-center">Kullanıcı Kimliği: <span className="font-semibold text-blue-700 break-words">{pseudoUserId || 'Yükleniyor...'}</span></p>

      {/* Overall Total Questions and Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
          <h3 className="text-xl font-semibold mb-2">Toplam Çözülen Soru</h3>
          <p className="text-4xl font-bold">{totalQuestions}</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
          <h3 className="text-xl font-semibold mb-2">Toplam Doğru Sayısı</h3>
          <p className="text-4xl font-bold">{totalCorrect}</p>
        </div>
        <div className="bg-gradient-to-r from-red-500 to-orange-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
          <h3 className="text-xl font-semibold mb-2">Toplam Yanlış Sayısı</h3>
          <p className="text-4xl font-bold">{totalIncorrect}</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-110 transition-transform duration-300">
          <h3 className="text-xl font-semibold mb-2">Toplam Boş Sayısı</h3>
          <p className="text-4xl font-bold">{totalBlank}</p>
        </div>
      </div>

      {/* Countdown Timers - Conditional visibility */}
      {profile && (profile.class === '12' || profile.class === 'Mezun' || profile.class === '8') ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {profile.class === '12' || profile.class === 'Mezun' ? (
                  <>
                      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-xl shadow-lg text-center transform hover:scale-105 transition-transform duration-300">
                          <h3 className="text-xl font-semibold mb-2">TYT Sınavına Kalan Süre</h3>
                          <p className="text-3xl font-bold">{tytCountdown}</p>
                      </div>
                      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-xl shadow-lg text-center transform hover:scale-105 transition-transform duration-300">
                          <h3 className="text-xl font-semibold mb-2">AYT Sınavına Kalan Süre</h3>
                          <p className="text-3xl font-bold">{aytCountdown}</p>
                      </div>
                  </>
              ) : profile.class === '8' ? (
                  <div className="bg-gradient-to-r from-lime-500 to-emerald-600 text-white p-6 rounded-xl shadow-lg text-center col-span-full">
                      <h3 className="text-xl font-semibold mb-2">LGS Sınavına Kalan Süre</h3>
                      <p className="text-3xl font-bold">{lgsCountdown}</p>
                  </div>
              ) : null /* Should not happen due to outer condition, but for safety */}
          </div>
      ) : null} {/* If class is not 8, 12, or Mezun, this entire section is hidden */}

      {/* Estimated Score/Ranking by Type Column - Conditional visibility */}
      {profile && (profile.class === '12' || profile.class === 'Mezun' || profile.class === '8') ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-lg text-center border-l-4 border-cyan-500">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Sayısal Netleri</h3>
                <p className="text-2xl font-bold text-cyan-600">{numericalNets.toFixed(2)}</p>
                <p className="text-sm text-gray-700">{calculateEstimatedScoreAndRank(numericalNets, (profile.class === '8' ? 'LGS' : 'TYT/AYT'))}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg text-center border-l-4 border-fuchsia-500">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Sözel Netleri</h3>
                <p className="text-2xl font-bold text-fuchsia-600">{verbalNets.toFixed(2)}</p>
                <p className="text-sm text-gray-700">{calculateEstimatedScoreAndRank(verbalNets, (profile.class === '8' ? 'LGS' : 'TYT/AYT'))}</p>
                </div>
                { (profile.class === '12' || profile.class === 'Mezun') &&
                  <div className="bg-white p-6 rounded-xl shadow-lg text-center border-l-4 border-amber-500">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Eşit Ağırlık Netleri</h3>
                    <p className="text-2xl font-bold text-amber-600">{equalWeightNets.toFixed(2)}</p>
                    <p className="text-sm text-gray-700">{calculateEstimatedScoreAndRank(equalWeightNets, 'TYT/AYT')}</p>
                  </div>
                }
                { profile.class === '8' &&
                  <div className="bg-white p-6 rounded-xl shadow-lg text-center border-l-4 border-amber-500">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Genel LGS Netleri</h3>
                    <p className="text-2xl font-bold text-amber-600">{overallLGSNets.toFixed(2)}</p>
                    <p className="text-sm text-gray-700">{calculateEstimatedScoreAndRank(overallLGSNets, 'LGS')}</p>
                  </div>
                }
            </div>
        ) : null} {/* If class is not 8, 12, or Mezun, this entire section is hidden */}

        {/* AI Recommendations */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border-l-4 border-yellow-500">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">Yapay Zeka Önerileri</h3>
          <p className="text-gray-700 italic">{aiRecommendations || "Öneriler yükleniyor..."}</p>
        </div>

        {/* Latest Progress Entries as boxes */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">Son İlerleme Kayıtları</h3>
          {progressData.length === 0 ? (
            <p className="text-gray-600">Henüz bir ilerleme kaydınız yok. 'İlerleme Kaydı' sekmesinden ekleyebilirsiniz.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {progressData.map((entry) => {
                const entryTotalCorrect = entry.entries.reduce((sum, item) => sum + (item.correct || 0), 0);
                const entryTotalIncorrect = entry.entries.reduce((sum, item) => sum + (item.incorrect || 0), 0);
                const entryTotalBlank = entry.entries.reduce((sum, item) => sum + (item.blank || 0), 0);
                const entryTotalQuestions = entryTotalCorrect + entryTotalIncorrect + entryTotalBlank;

                return (
                  <div key={entry.id} className="bg-gray-50 p-4 rounded-lg shadow-md border-t-4 border-blue-400 flex flex-col justify-between">
                    <div>
                        <p className="text-sm text-gray-600 font-bold mb-2">{entry.date} - {entry.name || 'İsimsiz İlerleme'}</p> {/* Display the progress name */}
                        <p className="text-lg font-semibold text-gray-800 mb-2">Toplam Soru: {entryTotalQuestions}</p>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm font-semibold">
                            <div className="bg-green-100 text-green-700 p-2 rounded-md">D: {entryTotalCorrect}</div>
                            <div className="bg-red-100 text-red-700 p-2 rounded-md">Y: {entryTotalIncorrect}</div>
                            {/* Corrected: Use entryTotalBlank instead of item.blank */}
                            <div className="bg-yellow-100 text-yellow-700 p-2 rounded-md">B: {entryTotalBlank}</div>
                        </div>
                        {entry.entries.map((item, idx) => (
                            // Sadece sıfır olmayan değerlere sahip dersleri göster
                            (item.correct > 0 || item.incorrect > 0 || item.blank > 0) && (
                                <div key={idx} className="mt-2 text-xs text-gray-700">
                                    <span className="font-medium">{item.subject}:</span> D:{item.correct} Y:{item.incorrect} B:{item.blank}
                                </div>
                            )
                        ))}
                    </div>
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() => handleEditProgress(entry)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-lg text-xs mr-2 transition duration-300"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDeleteProgress(entry.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg text-xs transition duration-300"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }); // Wrapped with React.memo

  // Profile Component
  const Profile = React.memo(({ profile, user, pseudoUserId }) => {
    const [name, setName] = useState(profile?.name || '');
    const [selectedClass, setSelectedClass] = useState(profile?.class || '');
    const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth || '');
    const [newPassword, setNewPassword] = useState(''); // New state for password
    const [confirmNewPassword, setConfirmNewPassword] = useState(''); // New state for password confirmation
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Update local state when profile prop changes
        if (profile) {
            setName(profile.name || '');
            setSelectedClass(profile.class || '');
            setDateOfBirth(profile.dateOfBirth || '');
        }
    }, [profile]); // Only re-run when profile prop changes

    const handleUpdateProfile = async (e) => {
      e.preventDefault();
      setMessage('');
      // pseudoUserId artık user.uid olduğu için kontrol daha basit
      if (!user || !user.uid) { 
        setMessage("Kullanıcı kimliği bulunamadı.");
        return;
      }

      // Validate date of birth
      const birthYear = new Date(dateOfBirth).getFullYear();
      if (dateOfBirth && (birthYear < minBirthYear || birthYear > maxBirthYear)) { // Corrected to maxBirthYear
        setMessage(`Doğum yılı ${minBirthYear} ile ${maxBirthYear} arasında olmalıdır.`);
        return;
      }

      try {
        // Update profile data in Firestore
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'registeredUsers', user.uid), { 
          name,
          class: selectedClass,
          dateOfBirth,
          email: profile?.email || user.email || '', // Firebase Auth'tan gelen e-postayı kullan
        }, { merge: true });

        // Handle password update if newPassword is provided
        if (newPassword) {
          if (newPassword.length < 6) {
            setMessage("Yeni parola en az 6 karakter olmalıdır.");
            return;
          }
          if (newPassword !== confirmNewPassword) {
            setMessage("Yeni parolalar eşleşmiyor.");
            return;
          }
          
          try {
            await updatePassword(user, newPassword); // Use the user object from Firebase Auth
            setMessage("Profil ve parola başarıyla güncellendi!");
            setNewPassword(''); // Clear password fields on success
            setConfirmNewPassword('');
          } catch (passwordError) {
            console.error("Parola güncellenirken hata:", passwordError);
            let passwordErrorMessage = "Parola güncellenirken bir hata oluştu.";
            if (passwordError.code === 'auth/requires-recent-login') {
              passwordErrorMessage = "Parolanızı değiştirmek için lütfen tekrar giriş yapın. (Güvenlik nedeniyle)";
            }
            setMessage(passwordErrorMessage);
            return; // Stop further execution if password update fails
          }
        } else {
          setMessage("Profil başarıyla güncellendi!");
        }
      } catch (error) {
        setMessage(`Profil güncellenirken hata: ${error.message}`);
        console.error("Profil güncelleme hatası:", error);
      }
    };

    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md border-t-4 border-blue-500">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Profilim</h2>
          <form onSubmit={handleUpdateProfile}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="profileName">
                Adınız
              </label>
              <input
                type="text"
                id="profileName"
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="profileDateOfBirth">
                Doğum Tarihi
              </label>
            <input
              type="date"
              id="profileDateOfBirth"
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              min={minDateString} // Set minimum selectable date
              max={maxDateString} // Set maximum selectable date (current year)
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="profileClass">
              Sınıfınız
            </label>
            <select
              id="profileClass"
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              required
            >
              <option value="">Sınıf Seçiniz</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>{num}. Sınıf</option>
              ))}
              <option value="Mezun">Mezun</option>
            </select>
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="profileEmail">
              E-posta Adresi
            </label>
            <input
              type="email"
              id="profileEmail"
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 bg-gray-100 leading-tight"
              value={profile?.email || ''} // Profilden veya user objesinden gelen e-postayı kullan
              readOnly // Make email non-editable
            />
            <p className="text-xs text-gray-500 mt-1">Mail için site yöneticisi ile iletişime geçin.</p>
          </div>

          {/* New Password Fields */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newPassword">
              Yeni Parola (Değiştirmek istemiyorsanız boş bırakın)
            </label>
            <input
              type="password"
              id="newPassword"
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 karakter"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmNewPassword">
              Yeni Parolayı Onayla
            </label>
            <input
              type="password"
              id="confirmNewPassword"
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Parolanızı tekrar girin"
            />
          </div>

          {/* İletişim Bilgileri */}
          <div className="text-center text-sm text-gray-600 mb-6">
            <p>Destek için:</p>
            <p className="font-semibold">Instagram: <a href="https://www.instagram.com/sirfatihsultanterim" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">@sirfatihsultanterim</a></p>
            <p className="font-semibold">E-posta: <a href="mailto:yusuf.akademikkocudestek@gmail.com" className="text-blue-600 hover:underline">yusuf.akademikkocudestek@gmail.com</a></p>
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-300"
            >
              Profili Güncelle
            </button>
          </div>
          {message && <p className="text-center text-green-500 text-xs mt-4">{message}</p>}
        </form>
      </div>
    </div>
  );
});

// Progress Entry Component
const ProgressEntry = React.memo(({ profile, pseudoUserId, progressData, editingProgressEntry, setEditingProgressEntry, handleDeleteProgress }) => {
  const [progressName, setProgressName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState('');
  
  // Memoize availableSubjects to prevent unnecessary re-renders of this component
  const memoizedAvailableSubjects = useMemo(() => {
    return profile?.class ? getSubjectsForClass(profile.class) : [];
  }, [profile?.class]); // Recompute only when profile.class changes

  // State to hold inputs for each subject, dynamically initialized
  const [subjectInputs, setSubjectInputs] = useState(() => {
      const initial = {};
      memoizedAvailableSubjects.forEach(subject => { // Use memoized here
          initial[subject] = { correct: '', incorrect: '', blank: '' };
      });
      return initial;
  });

  // Effect to reset form or populate for editing
  useEffect(() => {
      if (editingProgressEntry) { // If an entry is being edited
          setProgressName(editingProgressEntry.name || '');
          setSelectedDate(editingProgressEntry.date || new Date().toISOString().slice(0, 10));

          const newSubjectInputs = {};
          memoizedAvailableSubjects.forEach(subject => {
              newSubjectInputs[subject] = { correct: '', incorrect: '', blank: '' }; // Initialize with defaults
              const existingItem = editingProgressEntry.entries.find(item => item.subject === subject);
              if (existingItem) { // Populate with existing data if found for this subject
                  newSubjectInputs[subject] = {
                      correct: existingItem.correct,
                      incorrect: existingItem.incorrect,
                      blank: existingItem.blank
                  };
              }
          });
          setSubjectInputs(newSubjectInputs);
          setMessage(''); // Clear any previous messages
      } else { // If not editing (new entry)
          setProgressName('');
          setSelectedDate(new Date().toISOString().slice(0, 10)); // Default to today
          const initial = {};
          memoizedAvailableSubjects.forEach(subject => {
              initial[subject] = { correct: '', incorrect: '', blank: '' };
          });
          setSubjectInputs(initial); // Reset subject inputs
          setMessage(''); // Clear any previous messages
      }
  }, [editingProgressEntry, memoizedAvailableSubjects]); // Dependencies are now stable: editingProgressEntry object and memoized list of subjects

  // Function to update individual subject entry fields within subjectInputs state
  const handleSubjectInputChange = useCallback((subjectName, field, value) => {
    setSubjectInputs(prevInputs => {
      const updatedInputs = {
        ...prevInputs,
        [subjectName]: {
          ...prevInputs[subjectName],
          [field]: value
        }
      };
      // console.log(`Updating ${subjectName} ${field} to ${value}, new state:`, updatedInputs); // For debugging
      return updatedInputs;
    });
  }, []); // No dependencies for this useCallback, as it only refers to setSubjectInputs

  const handleSubmitProgress = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!pseudoUserId) {
      setMessage("Kullanıcı kimliği bulunamadı.");
      return;
    }
    if (!progressName.trim()) {
      setMessage("Lütfen ilerleme için bir ad girin.");
      return;
    }
    if (!profile?.class) {
      setMessage("Lütfen ilerleme kaydı girmek için profilinizden sınıfınızı belirtin.");
      return;
    }

    // Convert subjectInputs object back to entries array format for Firestore
    const entriesToSave = memoizedAvailableSubjects.map(subject => ({ // Use memoized here
      subject: subject,
      correct: parseInt(subjectInputs[subject]?.correct) || 0,
      incorrect: parseInt(subjectInputs[subject]?.incorrect) || 0,
      blank: parseInt(subjectInputs[subject]?.blank) || 0,
    }));

    // Validate that at least one subject has data entered
    const anySubjectHasData = entriesToSave.some(
      entry => entry.correct > 0 || entry.incorrect > 0 || entry.blank > 0
    );

    if (!anySubjectHasData) {
      setMessage("Lütfen en az bir ders için doğru, yanlış veya boş bilgi girin.");
      return;
    }

    const overallEntryData = {
      name: progressName.trim(),
      date: selectedDate,
      entries: entriesToSave,
      timestamp: Date.now() // For sorting
    };

    try {
      if (editingProgressEntry) { // Use the prop directly
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'progress', editingProgressEntry.id);
        await updateDoc(docRef, overallEntryData);
        setMessage("İlerleme kaydı başarıyla güncellendi!");
        setEditingProgressEntry(null); // Clear editing state
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'progress'), overallEntryData);
        setMessage("İlerleme kaydı başarıyla eklendi!");
      }
      // Clear form for new entry
      setProgressName('');
      setSelectedDate(new Date().toISOString().slice(0, 10));
      const initial = {}; // Reset subjectInputs based on the current memoizedAvailableSubjects
      memoizedAvailableSubjects.forEach(subject => {
          initial[subject] = { correct: '', incorrect: '', blank: '' };
      });
      setSubjectInputs(initial);
    } catch (error) {
      setMessage(`Hata: ${error.message}`);
      console.error("İlerleme kaydetme hatası:", error);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-64px)]">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">İlerleme Kaydı</h2>

      <div className="bg-white p-8 rounded-lg shadow-lg max-w-3xl mx-auto border-t-4 border-green-500">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {editingProgressEntry ? 'Kaydı Düzenle' : 'Yeni İlerleme Kaydı Ekle'}
        </h3>
        <form onSubmit={handleSubmitProgress}>
          {/* Progress Name Input */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="progressName">
              İlerleme Adı (Örn: Haftalık Genel Deneme, Matematik Tekrarı)
            </label>
            <input
              type="text"
              id="progressName"
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
              value={progressName}
              onChange={(e) => setProgressName(e.target.value)}
              placeholder="Bir başlık girin"
              required
            />
          </div>

          {/* Date Input */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="entryDate">
              Tarih
            </label>
            <input
              type="date"
              id="entryDate"
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)} // Restrict future dates
              required
            />
          </div>

          {/* Dynamic Subject Entries - made scrollable */}
          {!profile?.class ? (
              <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-6 rounded-md" role="alert">
                  <p className="font-bold">Sınıf Bilgisi Eksik!</p>
                  <p>Ders girişlerini görmek için lütfen <span className="font-semibold">Profilim</span> sekmesinden sınıfınızı belirtin.</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[400px] overflow-y-auto pr-2 mb-6"> {/* Added max-h and overflow */}
                  {memoizedAvailableSubjects.map((subjectName) => (
                      <div key={subjectName} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50 relative">
                          <h4 className="text-lg font-bold text-gray-800 mb-4 text-center">{subjectName}</h4>
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={`${subjectName}-correct`}>
                                      Doğru Sayısı
                                  </label>
                                  <input
                                      type="number"
                                      id={`${subjectName}-correct`}
                                      className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500 border-green-300"
                                      value={subjectInputs[subjectName]?.correct || ''} // Use optional chaining and default to empty string
                                      onChange={(e) => handleSubjectInputChange(subjectName, 'correct', e.target.value)}
                                      min="0"
                                  />
                              </div>
                              <div>
                                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={`${subjectName}-incorrect`}>
                                      Yanlış Sayısı
                                  </label>
                                  <input
                                      type="number"
                                      id={`${subjectName}-incorrect`}
                                      className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500 border-red-300"
                                      value={subjectInputs[subjectName]?.incorrect || ''} // Use optional chaining and default to empty string
                                      onChange={(e) => handleSubjectInputChange(subjectName, 'incorrect', e.target.value)}
                                      min="0"
                                  />
                              </div>
                              <div>
                                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={`${subjectName}-blank`}>
                                      Boş Sayısı
                                  </label>
                                  <input
                                      type="number"
                                      id={`${subjectName}-blank`}
                                      className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 border-yellow-300"
                                      value={subjectInputs[subjectName]?.blank || ''} // Use optional chaining and default to empty string
                                      onChange={(e) => handleSubjectInputChange(subjectName, 'blank', e.target.value)}
                                      min="0"
                                  />
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
          
          {/* Submit and Cancel Buttons */}
          <div className="flex justify-center mt-6">
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition duration-300"
              disabled={!profile?.class} // Disable if class is not set
            >
              {editingProgressEntry ? 'Kaydı Güncelle' : 'Kaydet'}
            </button>
            {editingProgressEntry && (
              <button
                type="button"
                onClick={() => {
                  setEditingProgressEntry(null); // Clear editing state
                  setProgressName('');
                  setSelectedDate(new Date().toISOString().slice(0, 10));
                  const initial = {}; // Reset subjectInputs based on the current memoizedAvailableSubjects
                  memoizedAvailableSubjects.forEach(subject => {
                      initial[subject] = { correct: '', incorrect: '', blank: '' };
                  });
                  setSubjectInputs(initial);
                }}
                className="ml-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition duration-300"
              >
                İptal
              </button>
            )}
          </div>
          {message && <p className="text-center text-green-500 text-xs mt-4">{message}</p>}
        </form>
      </div>

      <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-500">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Tüm İlerleme Kayıtları</h3>
        {progressData.length === 0 ? (
          <p className="text-gray-600">Henüz bir ilerleme kaydınız yok.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {progressData.map((entry) => {
              const entryTotalCorrect = entry.entries.reduce((sum, item) => sum + (item.correct || 0), 0);
              const entryTotalIncorrect = entry.entries.reduce((sum, item) => sum + (item.incorrect || 0), 0);
              const entryTotalBlank = entry.entries.reduce((sum, item) => sum + (item.blank || 0), 0);
              const entryTotalQuestions = entryTotalCorrect + entryTotalIncorrect + entryTotalBlank;

              return (
                <div key={entry.id} className="bg-gray-50 p-4 rounded-lg shadow-md border-t-4 border-blue-400 flex flex-col justify-between">
                  <div>
                        <p className="text-sm text-gray-600 font-bold mb-2">{entry.date} - {entry.name || 'İsimsiz İlerleme'}</p> {/* Display the progress name */}
                        <p className="text-lg font-semibold text-gray-800 mb-2">Toplam Soru: {entryTotalQuestions}</p>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm font-semibold">
                            <div className="bg-green-100 text-green-700 p-2 rounded-md">D: {entryTotalCorrect}</div>
                            <div className="bg-red-100 text-red-700 p-2 rounded-md">Y: {entryTotalIncorrect}</div>
                            {/* Corrected: Use entryTotalBlank instead of item.blank */}
                            <div className="bg-yellow-100 text-yellow-700 p-2 rounded-md">B: {entryTotalBlank}</div>
                        </div>
                        {entry.entries.map((item, idx) => (
                            // Sadece sıfır olmayan değerlere sahip dersleri göster
                            (item.correct > 0 || item.incorrect > 0 || item.blank > 0) && (
                                <div key={idx} className="mt-2 text-xs text-gray-700">
                                    <span className="font-medium">{item.subject}:</span> D:{item.correct} Y:{item.incorrect} B:{item.blank}
                                </div>
                            )
                        ))}
                    </div>
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() => handleSubmitProgress(entry)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-lg text-xs mr-2 transition duration-300"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDeleteProgress(entry.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg text-xs transition duration-300"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }); // Wrapped with React.memo

  // Typing Effect Component
  const TypingEffect = React.memo(({ text }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [index, setIndex] = useState(0);

    useEffect(() => {
      if (index < text.length) {
        const timeoutId = setTimeout(() => {
          setDisplayedText(prev => prev + text.charAt(index));
          setIndex(prev => prev + 1);
        }, 30); // Adjust typing speed here (milliseconds per character)
        return () => clearTimeout(timeoutId);
      }
    }, [text, index]);

    return <span>{displayedText}</span>;
  });

  // AI Coach Chat Component
  const AICoachChat = React.memo(({ isPopup = false, showPopup, togglePopup, pseudoUserId, aiChatHistory, setAiChatHistory }) => {
    const [inputMessage, setInputMessage] = useState('');
    const chatContainerRef = useRef(null);
    const [isTyping, setIsTyping] = useState(false); // New state for typing indicator
    const [currentTypingMessage, setCurrentTypingMessage] = useState(''); // New state for typing effect

    // Scroll to bottom when messages change
    useEffect(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, [aiChatHistory, currentTypingMessage]); // Also scroll when typing message updates

    const handleSendMessage = async (e) => {
      e.preventDefault();
      if (!inputMessage.trim() || !pseudoUserId) {
        console.warn("Mesaj gönderilemedi: Giriş boş veya kullanıcı kimliği yok.");
        return;
      }

      const userMessage = { role: 'user', text: inputMessage, timestamp: Date.now() };
      setAiChatHistory(prev => [...prev, userMessage]);
      setInputMessage('');
      setIsTyping(true); // Start typing indicator
      setCurrentTypingMessage(''); // Clear previous typing message

      // Save user message to Firestore (this should happen immediately)
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiChatHistory'), userMessage);
      } catch (error) {
        console.error("Kullanıcı mesajı kaydedilirken hata:", error);
        // Optionally add a message to the chat about the save failure
        setAiChatHistory(prev => [...prev, { role: 'model', text: "Mesajınız kaydedilemedi. Bir hata oluştu.", timestamp: Date.now() }]);
      }

      // Limit chat history sent to AI to last N messages (e.g., last 10, which is 5 user+5 model turns)
      const chatForAI = [...aiChatHistory.slice(-9), userMessage].map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      try {
        const apiKey = "AIzaSyC_klt6i2LBaZUo6YRHDg4f0Z1kj7NWKac"; // AI API key for Gemini calls
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const payload = {
          contents: chatForAI,
        };
        

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
              const errorText = await response.text();
              const errorMessage = { role: 'model', text: `API Hatası: ${response.status} - ${errorText || 'Bilinmeyen bir hata oluştu.'}`, timestamp: Date.now() };
              setAiChatHistory(prev => [...prev, errorMessage]); // Add error to chat
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiChatHistory'), errorMessage); // Save error
              return;
        }

        const result = await response.json();
        if (result.error) {
              const errorMessage = { role: 'model', text: `API Hatası: ${result.error.message || 'Bilinmeyen bir hata oluştu.'}`, timestamp: Date.Now() };
              setAiChatHistory(prev => [...prev, errorMessage]); // Add error to chat
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiChatHistory'), errorMessage); // Save error
              return;
        }

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
          const aiResponseText = result.candidates[0].content.parts[0].text;
          setCurrentTypingMessage(aiResponseText); // Set the full message to be typed
          // Do NOT add to aiChatHistory here immediately. It will be added after typing.
        } else {
          const errorMessage = { role: 'model', text: "Üzgünüm, şu an cevap veremiyorum. Lütfen daha sonra tekrar deneyin. (AI boş/geçersiz yanıt verdi)", timestamp: Date.now() };
          setAiChatHistory(prev => [...prev, errorMessage]);
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiChatHistory'), errorMessage);
        }
      } catch (error) {
        console.error("AI ile iletişimde hata:", error);
        const errorMessage = { role: 'model', text: "Bir hata oluştu, lütfen daha sonra tekrar deneyin. (Bağlantı sorunu olabilir)", timestamp: Date.now() };
        setAiChatHistory(prev => [...prev, errorMessage]);
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiChatHistory'), errorMessage);
      } finally {
        // Typing effect will handle setting isTyping to false
      }
    };

    // Effect to handle typing animation and final message addition
    useEffect(() => {
      let timer;
      if (isTyping && currentTypingMessage.length > 0) {
        let charIndex = 0;
        timer = setInterval(() => {
          if (charIndex < currentTypingMessage.length) {
            // This is just to simulate typing, it's not actually updating the message in real-time in chatHistory
            // The final message is added once typing is complete.
            charIndex++;
          } else {
            clearInterval(timer);
            const aiMessage = { role: 'model', text: currentTypingMessage, timestamp: Date.now() };
            setAiChatHistory(prev => [...prev, aiMessage]); // Add complete message to history
            // Save AI response to Firestore (only when typing is complete)
            addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiChatHistory'), aiMessage)
              .catch(error => console.error("AI yanıtı kaydedilirken hata:", error));
            setIsTyping(false); // Stop typing indicator
            setCurrentTypingMessage(''); // Clear typing message
          }
        }, 30); // Typing speed
      }

      return () => clearInterval(timer);
    }, [isTyping, currentTypingMessage, pseudoUserId, setAiChatHistory]);

    const commonClasses = "flex flex-col rounded-lg shadow-xl bg-white";
    const popupClasses = "fixed bottom-4 right-4 w-80 md:w-96 h-[400px] z-50 overflow-hidden";
    const fullPageClasses = "p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-64px)] max-w-3xl mx-auto";

    return (
      <div className={`${commonClasses} ${isPopup ? popupClasses : fullPageClasses}`}>
        <h3 className={`font-bold text-center text-gray-800 ${isPopup ? 'text-lg py-3 bg-blue-600 text-white rounded-t-lg' : 'text-3xl mb-6'}`}>
          Yapay Zeka Koçu
          {isPopup && (
            <button
              onClick={togglePopup}
              className="absolute top-2 right-2 text-white hover:text-gray-200 text-2xl font-bold"
            >
              &times;
            </button>
          )}
        </h3>

        <div ref={chatContainerRef} className={`flex-grow overflow-y-auto p-4 ${isPopup ? '' : 'border rounded-lg bg-white mb-4'}`}>
          {aiChatHistory.length === 0 && !isTyping ? (
            <p className="text-center text-gray-500 italic">Yapay Zeka Koçu'na hoş geldiniz! Nasıl yardımcı olabilirim?</p>
          ) : (
            aiChatHistory.map((msg, index) => (
              <div
                key={index}
                className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] p-3 rounded-lg shadow-md ${
                    msg.role === 'user'
                      ? 'bg-blue-100 text-blue-800 self-end rounded-br-none'
                      : 'bg-gray-200 text-gray-800 self-start rounded-bl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className="block text-xs text-right text-gray-500 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
          {isTyping && currentTypingMessage.length > 0 && (
            <div className="flex justify-start">
              <div className="max-w-[75%] p-3 rounded-lg bg-gray-200 text-gray-800 shadow-md self-start rounded-bl-none">
                <TypingEffect text={currentTypingMessage} />
                <span className="animate-pulse">|</span> {/* Typing cursor */}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className={`p-4 border-t ${isPopup ? 'rounded-b-lg' : ''}`}>
          <div className="flex">
            <input
              type="text"
              className="flex-grow border rounded-l-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mesajınızı yazın..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isTyping}
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-300"
              disabled={isTyping || !inputMessage.trim()}
            >
              Gönder
            </button>
          </div>
        </form>
      </div>
    );
  }); // Wrapped with React.memo

  // AI Mock Exam Component
  const AIMockExam = React.memo(({ profile, pseudoUserId }) => {
    const [examRequest, setExamRequest] = useState({ subject: '', topic: '', numQuestions: 5 });
    const [generatedExam, setGeneratedExam] = useState(null);
    const [userAnswers, setUserAnswers] = useState({});
    const [examResults, setExamResults] = useState(null);
    const [message, setMessage] = useState('');
    const [examLoading, setExamLoading] = useState(false);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    // Memoize availableSubjects to prevent unnecessary re-renders of this component
    const memoizedAvailableSubjects = useMemo(() => {
        return profile?.class ? getSubjectsForClass(profile.class) : [];
    }, [profile?.class]);

    const handleGenerateExam = async () => {
      setMessage('');
      setExamLoading(true);
      setGeneratedExam(null);
      setUserAnswers({});
      setExamResults(null);

      // Daha kesin bir JSON formatı istemek için prompt güncellendi
      const prompt = `Lütfen ${examRequest.subject} dersinden, ${examRequest.topic || 'genel'} konusundan, ${examRequest.numQuestions} adet çoktan seçmeli sınav sorusu oluştur. Her soru için 4 seçenek (A, B, C, D) ve doğru cevabı belirt. Format her zaman geçerli bir JSON array'i olmalı. JSON array'i, her biri "question" (soru metni), "options" (dört elemanlı string array'i) ve "answer" (A, B, C veya D) anahtarlarını içeren objelerden oluşmalı. Örnek: [{"question": "Türkiye'nin başkenti neresidir?", "options": ["A) Ankara", "B) İstanbul", "C) İzmir", "D) Bursa"], "answer": "A"}, {"question": "...", "options": ["...", "...", "...", "..."], "answer": "..."}]`;

      try {
        const apiKey = "AIzaSyC_klt6i2LBaZUo6YRHDg4f0Z1kj7NWKac"; // AI API key for Gemini calls
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const payload = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        "question": { "type": "STRING" },
                        "options": {
                            "type": "ARRAY",
                            "items": { "type": "STRING" },
                            "minItems": 4, // Ensure 4 options
                            "maxItems": 4
                        },
                        "answer": { "type": "STRING", "enum": ["A", "B", "C", "D"] } // Ensure answer is A, B, C, or D
                    },
                    "propertyOrdering": ["question", "options", "answer"]
                }
              }
          }
        };
        

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
              const errorText = await response.text();
              setMessage(`API Hatası: ${response.status} - ${errorText || 'Bilinmeyen bir hata oluştu.'}`);
              console.error("AI Mock Exam API Error:", response.status, errorText);
              return;
        }

        const result = await response.json();
        // Check for common error structure from API
        if (result.error) {
              setMessage(`API Hatası: ${result.error.message || 'Bilinmeyen bir hata oluştu.'}`);
              console.error("API Error:", result.error);
              return;
        }

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
          const rawResponseText = result.candidates[0].content.parts[0].text;
          try {
            const examData = JSON.parse(rawResponseText);
            // Basic validation for the parsed data structure
            if (Array.isArray(examData) && examData.every(q => q.question && Array.isArray(q.options) && q.options.length === 4 && q.answer)) {
                setGeneratedExam(examData);
            } else {
                setMessage("AI tarafından oluşturulan deneme formatı geçersiz. Lütfen tekrar deneyin.");
                console.error("Invalid exam data format from AI:", examData);
            }
          } catch (jsonError) {
            setMessage(`AI'dan gelen yanıt işlenirken hata oluştu. Lütfen tekrar deneyin. (Detay: ${jsonError.message})`);
            console.error("JSON parse hatası:", jsonError, "Raw response:", rawResponseText);
          }
        } else {
          setMessage("Deneme soruları oluşturulamadı. AI boş veya geçersiz yanıt verdi.");
          console.warn("AI returned no candidates or empty content:", result);
        }
      } catch (error) {
        console.error("Deneme oluşturulurken fetch veya genel hata:", error);
        setMessage("Deneme oluşturulurken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin veya daha sonra deneyin.");
      } finally {
        setExamLoading(false);
      }
    };

    const handleAnswerChange = (questionIndex, selectedOption) => {
      setUserAnswers(prev => ({ ...prev, [questionIndex]: selectedOption })); // Corrected: Use assignment within the object update
    };

    const handleSubmitExam = async () => {
      if (!generatedExam || !pseudoUserId) return; // Use pseudoUserId

      setAnalysisLoading(true);
      let correctCount = 0;
      let incorrectCount = 0;
      let blankCount = 0;

      generatedExam.forEach((question, index) => {
        if (userAnswers[index] === question.answer) {
          correctCount++;
        } else if (userAnswers[index]) {
          incorrectCount++;
        } else {
          blankCount++;
        }
      });

      const examResultData = {
        date: new Date().toISOString().slice(0, 10),
        subject: examRequest.subject,
        topic: examRequest.topic,
        correct: correctCount,
        incorrect: incorrectCount,
        blank: blankCount,
        totalQuestions: generatedExam.length,
        timestamp: Date.now(),
        // Optionally save the full exam and user answers for review
        examQuestions: generatedExam,
        userAnswers: userAnswers
      };

      setExamResults(examResultData);

      // Save exam results to Firestore (in mockExams collection and also update progress)
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'mockExams'), examResultData); // Uses pseudoUserId

        // Also add/update total progress in `progress` collection (or an aggregate document)
        // For simplicity, let's just add it as a regular progress entry for now.
        // In a real app, you might have a separate aggregate document or calculate on the fly.
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'progress'), { // Uses pseudoUserId
            name: `${examResultData.subject} (Deneme)`, // Auto-generate name for mock exam progress
            date: examResultData.date,
            entries: [{ // Store as an array of entries, even for a single mock exam subject
                subject: `${examResultData.subject} (Deneme)`, // Mark as mock exam
                correct: examResultData.correct,
                incorrect: examResultData.incorrect,
                blank: examResultData.blank,
            }],
            timestamp: Date.now()
        });
        setMessage("Deneme analizi tamamlandı ve sonuçlar kaydedildi!");
      } catch (error) {
        console.error("Deneme sonuçları kaydedilirken hata:", error);
        setMessage("Deneme sonuçları kaydedilirken bir hata oluştu.");
      } finally {
        setAnalysisLoading(false);
      }
    };

    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-64px)]">
        <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Yapay Zeka Deneme Sınavı</h2>

        <div className="bg-white p-8 rounded-lg shadow-lg max-w-3xl mx-auto border-t-4 border-purple-500">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Deneme Oluştur</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="examSubject">
                Ders
              </label>
              <select
                id="examSubject"
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={examRequest.subject}
                onChange={(e) => setExamRequest({ ...examRequest, subject: e.target.value })}
                required
                disabled={!profile?.class}
              >
                <option value="">Ders Seçiniz</option>
                {memoizedAvailableSubjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
              {!profile?.class && (
                <p className="text-red-500 text-xs italic mt-2">Dersleri görmek için lütfen 'Profilim' sekmesinden sınıfınızı seçiniz.</p>
              )}
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="examTopic">
                Konu (Opsiyonel)
              </label>
              <input
                type="text"
                id="examTopic"
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={examRequest.topic}
                onChange={(e) => setExamRequest({ ...examRequest, topic: e.target.value })}
                placeholder="Örn: Kareköklü Sayılar"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="numQuestions">
                Soru Sayısı
              </label>
              <input
                type="number"
                id="numQuestions"
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={examRequest.numQuestions}
                onChange={(e) => setExamRequest({ ...examRequest, numQuestions: parseInt(e.target.value) || 1 })}
                min="1"
                max="20" // Limit for practical reasons
                required
              />
            </div>
          </div>
          <div className="flex justify-center">
            <button
              onClick={handleGenerateExam}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition duration-300"
              disabled={examLoading || !examRequest.subject}
            >
              {examLoading ? 'Deneme Oluşturuluyor...' : 'Deneme Oluştur'}
            </button>
          </div>
          {message && <p className="text-center text-red-500 text-xs mt-4">{message}</p>}
        </div>

        {generatedExam && (
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-3xl mx-auto mt-8 border-t-4 border-blue-500">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Deneme Sınavı</h3>
            {generatedExam.map((q, qIndex) => (
              <div key={qIndex} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="font-semibold text-gray-800 mb-3 text-lg">
                  {qIndex + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((option, oIndex) => (
                    <label key={oIndex} className="flex items-center text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${qIndex}`}
                        value={String.fromCharCode(65 + oIndex)} // A, B, C, D
                        checked={userAnswers[qIndex] === String.fromCharCode(65 + oIndex)}
                        onChange={() => handleAnswerChange(qIndex, String.fromCharCode(65 + oIndex))}
                        className="form-radio h-4 w-4 text-blue-600 focus:ring-blue-500 rounded-full"
                      />
                      <span className="ml-2">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-center mt-6">
              <button
                onClick={handleSubmitExam}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-300"
                disabled={analysisLoading}
              >
                {analysisLoading ? 'Analiz Ediliyor...' : 'Denemeyi Bitir ve Analiz Et'}
              </button>
            </div>
          </div>
        )}

        {examResults && (
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-3xl mx-auto mt-8 border-t-4 border-green-500">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Deneme Sonuçlarınız</h3>
            <p className="text-xl text-gray-700 mb-2">Doğru: <span className="font-bold text-green-600">{examResults.correct}</span></p>
            <p className="text-xl text-gray-700 mb-2">Yanlış: <span className="font-bold text-red-600">{examResults.incorrect}</span></p>
            <p className="text-xl text-gray-700 mb-2">Boş: <span className="font-bold text-gray-600">{examResults.blank}</span></p>
            <p className="text-xl text-gray-700 mb-4">Toplam Soru: <span className="font-bold">{examResults.totalQuestions}</span></p>
            {/* Optional: Display per-question review comparing user answer to correct answer */}
            <h4 className="text-xl font-semibold text-gray-800 mb-4">Detaylı Çözümler</h4>
            {generatedExam.map((q, qIndex) => (
                <div key={qIndex} className="mb-4 p-3 border border-gray-100 rounded-lg bg-gray-50">
                    <p className="font-medium text-gray-800">{qIndex + 1}. {q.question}</p>
                    <p className="text-sm text-gray-600">Seçtiğiniz: {userAnswers[qIndex] || 'Boş'}</p>
                    <p className="text-sm text-green-600 font-bold">Doğru Cevap: {q.answer}</p>
                    {userAnswers[qIndex] !== q.answer && userAnswers[qIndex] !== undefined && (
                        <p className="text-sm text-red-600">Yanlış Cevapladınız.</p>
                    )}
                </div>
            ))}
          </div>
        )}
      </div>
    );
  }); // Wrapped with React.memo

  // AI Topic Explanation Component - Now Chat-like
  const AITopicExplanation = React.memo(({ pseudoUserId, aiTopicHistory, setAiTopicHistory }) => {
    const [inputMessage, setInputMessage] = useState('');
    const chatContainerRef = useRef(null);
    const [isTyping, setLoadingExplanation] = useState(false);
    const [currentSubject, setCurrentSubject] = useState(null);
    const [currentTopic, setCurrentTopic] = useState(null);
    const [message, setMessage] = useState(''); // General messages for this component
    const [currentTypingMessage, setCurrentTypingMessage] = useState(''); // New state for typing effect for topic explanation

    // Scroll to bottom when messages change
    useEffect(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, [aiTopicHistory, currentTypingMessage]);

    // Initialize/reset subject and topic when component mounts or topic history is cleared externally
    useEffect(() => {
      if (aiTopicHistory.length === 0) {
        setCurrentSubject(null);
        setCurrentTopic(null);
      }
    }, [aiTopicHistory]);

    const handleSendMessage = async (e) => {
      e.preventDefault();
      if (!inputMessage.trim() || !pseudoUserId) {
        console.warn("Mesaj gönderilemedi: Giriş boş veya kullanıcı kimliği yok.");
        return;
      }

      const userMessage = { role: 'user', text: inputMessage, timestamp: Date.now() };
      setAiTopicHistory(prev => [...prev, userMessage]);
      setInputMessage('');
      setLoadingExplanation(true); // Start typing indicator
      setCurrentTypingMessage(''); // Clear previous typing message

      // Save user message to Firestore
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiTopicHistory'), userMessage);
      } catch (error) {
        console.error("Kullanıcı mesajı kaydedilirken hata:", error);
        setAiTopicHistory(prev => [...prev, { role: 'model', text: "Mesajınız kaydedilemedi. Bir hata oluştu.", timestamp: Date.now() }]);
      }

      let aiPrompt;
      let aiPayload;
      let isInitialTopicRequest = false;

      if (!currentSubject || !currentTopic) {
        isInitialTopicRequest = true;
        // First message or topic reset: try to extract subject and topic
        const extractionPrompt = `Kullanıcının bu mesajından akademik ders konusunu ve ilgili başlığını (konuyu) çıkar. Eğer açıkça bir ders ve konu belirtilmişse, JSON formatında yanıtla: {'subject': 'Belirtilen Ders', 'topic': 'Belirtilen Konu'}. Örneğin: {'subject': 'Matematik', 'topic': 'Fonksiyonlar'}. Eğer akademik bir ders ve konu tespit edemezsen, {'subject': null, 'topic': null} olarak yanıtla. Kullanıcının mesajı: "${userMessage.text}"`;
        
        aiPayload = {
          contents: [{ role: "user", parts: [{ text: extractionPrompt }] }],
          generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: "OBJECT",
                  properties: {
                      "subject": { "type": "STRING", "nullable": true },
                      "topic": { "type": "STRING", "nullable": true }
                  },
                  "propertyOrdering": ["subject", "topic"]
              }
          }
        };

      } else {
        // Subject and topic already set: stay on topic or redirect
        aiPrompt = `Mevcut konuşma ${currentSubject} dersindeki ${currentTopic} konusu hakkındadır. Kullanıcının son mesajı: "${userMessage.text}". Bu konuyla veya çok yakından ilişkili akademik alt konularla ilgili cevaplar ver. Eğer kullanıcının sorusu akademik değilse veya ${currentSubject} dersinin ${currentTopic} konusuyla ilgili değilse, sadece şu mesajı yanıtla: 'Bu konu hakkında sadece ${currentSubject} dersindeki ${currentTopic} konusuna odaklanıyorum. Genel sorularınız için lütfen AI Koç bölümünü kullanın.'`;
        aiPayload = {
          contents: [...aiTopicHistory.slice(-9), { role: "user", parts: [{ text: aiPrompt }] }].map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
          })),
        };
      }

      try {
        const apiKey = "AIzaSyC_klt6i2LBaZUo6YRHDg4f0Z1kj7NWKac"; // AI API key for Gemini calls
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aiPayload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          const errorMessage = { role: 'model', text: `API Hatası: ${response.status} - ${errorText || 'Bilinmeyen bir hata oluştu.'}`, timestamp: Date.now() };
          setAiTopicHistory(prev => [...prev, errorMessage]);
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiTopicHistory'), errorMessage);
          setLoadingExplanation(false); // Stop typing indicator
          return;
        }

        const result = await response.json();
        if (result.error) {
          const errorMessage = { role: 'model', text: `API Hatası: ${result.error.message || 'Bilinmeyen bir hata oluştu.'}`, timestamp: Date.Now() };
          setAiTopicHistory(prev => [...prev, errorMessage]);
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiTopicHistory'), errorMessage);
          setLoadingExplanation(false); // Stop typing indicator
          return;
        }

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
          let aiResponseText = result.candidates[0].content.parts[0].text;

          if (isInitialTopicRequest) {
            // Attempt to parse subject/topic from AI's initial response
            try {
              const parsedContext = JSON.parse(aiResponseText);
              if (parsedContext.subject && parsedContext.topic) {
                setCurrentSubject(parsedContext.subject);
                setCurrentTopic(parsedContext.topic);
                // Now, get the actual explanation based on parsed subject/topic
                const explanationPrompt = `${parsedContext.subject} dersinden, ${parsedContext.topic} konusu hakkında detaylı ve anlaşılır bir konu anlatımı yap. Açıklama en az 200 kelime olsun. Bu konuya odaklan.`;
                const explanationPayload = { contents: [{ role: "user", parts: [{ text: explanationPrompt }] }] };
                const explanationResponse = await fetch(apiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(explanationPayload)
                });
                const explanationResult = await explanationResponse.json();
                if (explanationResult.candidates && explanationResult.candidates.length > 0) {
                  aiResponseText = explanationResult.candidates[0].content.parts[0].text;
                } else {
                  aiResponseText = "Konu anlatımı oluşturulamadı. Lütfen tekrar deneyin.";
                }
              } else {
                aiResponseText = "Hangi dersin hangi konusunu öğrenmek istediğinizi açıkça belirtir misiniz? Örneğin: 'Fizikten Optik' veya 'Kimyadan Periyodik Tablo'.";
              }
            } catch (parseError) {
              console.error("Konu/Ders JSON parsing hatası:", parseError);
              aiResponseText = "Hangi dersin hangi konusunu öğrenmek istediğinizi açıkça belirtir misiniz? Örneğin: 'Fizikten Optik' veya 'Kimyadan Periyodik Tablo'.";
            }
          }
          
          setCurrentTypingMessage(aiResponseText); // Set the full message to be typed
          // Do NOT add to aiTopicHistory here immediately. It will be added after typing.
        } else {
          const errorMessage = { role: 'model', text: "Üzgünüm, şu an cevap veremiyorum. Lütfen daha sonra tekrar deneyin. (AI boş/geçersiz yanıt verdi)", timestamp: Date.now() };
          setAiTopicHistory(prev => [...prev, errorMessage]);
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiTopicHistory'), errorMessage);
          setLoadingExplanation(false); // Stop typing indicator
        }
      } catch (error) {
        console.error("Konu anlatımı sohbetinde hata:", error);
        const errorMessage = { role: 'model', text: "Bir hata oluştu, lütfen daha sonra tekrar deneyin. (Bağlantı sorunu olabilir)", timestamp: Date.now() };
        setAiTopicHistory(prev => [...prev, errorMessage]);
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiTopicHistory'), errorMessage);
      } finally {
        // Typing effect will handle setting setLoadingExplanation to false
      }
    };

    // Effect to handle typing animation and final message addition for topic explanation
    useEffect(() => {
      let timer;
      if (isTyping && currentTypingMessage.length > 0) {
        let charIndex = 0;
        timer = setInterval(() => {
          if (charIndex < currentTypingMessage.length) {
            charIndex++;
          } else {
            clearInterval(timer);
            const aiMessage = { role: 'model', text: currentTypingMessage, timestamp: Date.now() };
            setAiTopicHistory(prev => [...prev, aiMessage]); // Add complete message to history
            addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiTopicHistory'), aiMessage)
              .catch(error => console.error("AI yanıtı kaydedilirken hata:", error));
            setLoadingExplanation(false); // Stop typing indicator
            setCurrentTypingMessage(''); // Clear typing message
          }
        }, 30); // Typing speed
      }

      return () => clearInterval(timer);
    }, [isTyping, currentTypingMessage, pseudoUserId, setAiTopicHistory]);

    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-64px)]">
        <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Yapay Zeka Konu Anlatımı</h2>

        <div className="bg-white p-8 rounded-lg shadow-lg max-w-3xl mx-auto border-t-4 border-red-500 flex flex-col h-[600px]">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                Konu Anlatımı Sohbeti {currentSubject && currentTopic ? `(${currentSubject} - ${currentTopic})` : ''}
            </h3>
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 border rounded-lg bg-gray-50 mb-4">
                {aiTopicHistory.length === 0 && !isTyping ? (
                    <p className="text-center text-gray-500 italic">
                        Merhaba! Hangi dersin hangi konusunu öğrenmek istersiniz? Örneğin: 'Matematikten Üslü Sayılar' veya 'Fizikten Kuvvet ve Hareket'.
                    </p>
                ) : (
                    aiTopicHistory.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[75%] p-3 rounded-lg shadow-md ${
                                    msg.role === 'user'
                                        ? 'bg-blue-100 text-blue-800 self-end rounded-br-none'
                                        : 'bg-gray-200 text-gray-800 self-start rounded-bl-none'
                                }`}
                            >
                                <p>{msg.text}</p>
                                <span className="block text-xs text-right text-gray-500 mt-1">
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    ))
                )}
                {isTyping && currentTypingMessage.length > 0 && (
                  <div className="flex justify-start">
                    <div className="max-w-[75%] p-3 rounded-lg bg-gray-200 text-gray-800 shadow-md self-start rounded-bl-none">
                      <TypingEffect text={currentTypingMessage} />
                      <span className="animate-pulse">|</span> {/* Typing cursor */}
                    </div>
                  </div>
                )}
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t rounded-b-lg">
                <div className="flex">
                    <input
                        type="text"
                        className="flex-grow border rounded-l-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={currentSubject && currentTopic ? "Konu hakkında soru sorun..." : "Ders ve konuyu belirtin (örnek: Kimyadan Periyodik Tablo)..."}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        disabled={isTyping}
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-300"
                        disabled={isTyping || !inputMessage.trim()}
                    >
                        Gönder
                    </button>
                </div>
                {message && <p className="text-center text-red-500 text-xs mt-2">{message}</p>}
            </form>
        </div>
      </div>
    );
  }); // Wrapped with React.memo


  function App() {
    const [user, setUser] = useState(null); 
    const [pseudoUserId, setPseudoUserId] = useState(null); 
    const [isAuthReady, setIsAuthReady] = useState(false); // Auth state initialized
    const [profile, setProfile] = useState(null); 
    const [isProfileLoaded, setIsProfileLoaded] = useState(false); // New: Has profile data been fetched at least once?

    const [progressData, setProgressData] = useState([]); 
    const [aiChatHistory, setAiChatHistory] = useState([]); 
    const [aiTopicHistory, setAiTopicHistory] = useState([]); // New state for AI Topic Chat History
    const [aiRecommendations, setAiRecommendations] = useState(""); 
    const [showAiCoachPopup, setShowAiCoachPopup] = useState(false); 
    const [activeTab, setActiveTab] = useState('dashboard'); 
    const [editingProgressEntry, setEditingProgressEntry] = useState(null); 

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [modalAction, setModalAction] = useState(null); 
    const [modalMessage, setModalMessage] = useState('');
    const [appError, setAppError] = useState(null); 

    const toggleAiCoachPopup = useCallback(() => {
      setShowAiCoachPopup(prev => !prev);
    }, []);

    const fetchAiRecommendations = useCallback(async (currentProgressData, currentPseudoUserId) => {
      if (!currentPseudoUserId || currentProgressData.length === 0) {
        setAiRecommendations("Çalışma önerileri almak için ilerleme kaydı giriniz.");
        return;
      }
      const prompt = `Kullanıcının şu ana kadar kaydettiği ilerleme: ${JSON.stringify(currentProgressData)}. Bu verilere dayanarak kullanıcıya özel, 2-3 cümle uzunluğunda, doğrudan kullanıcıya hitap eden akademik çalışma önerileri oluştur. Örneğin, "Daha fazla pratik yapmanız gereken konuları belirleyin" veya "Haftalık çalışma programı oluşturun".`;

      try {
        const apiKey = "AIzaSyC_klt6i2LBaZUo6YRHDg4f0Z1kj7NWKac"; // AI API key for Gemini calls
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const payload = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        };
        

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            setAiRecommendations(`API Hatası: ${response.status} - ${errorText || 'Bilinmeyen bir hata oluştu.'}`);
            console.error("AI Recommendation API Error:", response.status, errorText);
            return;
        }

        const result = await response.json();
        if (result.error) {
            setAiRecommendations(`API Hatası: ${result.error.message || 'Bilinmeyen bir hata oluştu.'}`);
            console.error("AI Recommendation API Error:", result.error);
            return;
        }
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
          setAiRecommendations(result.candidates[0].content.parts[0].text);
        } else {
          setAiRecommendations("Şu an için öneri alınamıyor. Lütfen daha sonra tekrar deneyin.");
        }
      } catch (error) {
        console.error("AI önerileri alınırken hata:", error);
        setAiRecommendations("Şu an için öneri alınamıyor. İnternet bağlantınızı kontrol edin veya daha sonra deneyin.");
      }
    }, []); 

    const handleEditProgress = useCallback((entry) => {
      setEditingProgressEntry(entry); 
      setActiveTab('progress'); 
    }, [setEditingProgressEntry, setActiveTab]); 

    const handleDeleteProgress = useCallback((idToDelete) => {
      if (!pseudoUserId) { 
        setModalMessage("Kullanıcı kimliği bulunamadı.");
        setShowConfirmModal(true);
        return;
      }
      setModalMessage("Bu kaydı silmek istediğinizden emin misiniz?");
      setModalAction(() => async () => { 
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'progress', idToDelete));
          console.log("Kayıt başarıyla silindi!");
        } catch (error) {
          console.error("Kayıt silme hatası:", error);
        } finally {
          setShowConfirmModal(false); 
          setModalAction(null); 
        }
      });
      setShowConfirmModal(true); 
    }, [pseudoUserId, setModalAction, setShowConfirmModal, setModalMessage]); 

    // 1. Firebase başlatma ve Auth State dinleyicisi
    useEffect(() => {
      try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        analytics = getAnalytics(app); 

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser); 
          setIsAuthReady(true); 
          // Auth state değiştiğinde profilin yüklenmiş durumunu sıfırla, yeniden kontrol edilmesini sağla
          setIsProfileLoaded(false); 
          setProfile(null); // Clear previous profile on auth state change
          if (currentUser) {
            setPseudoUserId(currentUser.uid);
          } else {
            // When logged out, clear all user-specific data
            setPseudoUserId(null); // Ensure pseudoUserId is null
            setProgressData([]);
            setAiChatHistory([]);
            setAiTopicHistory([]); 
            setAiRecommendations('');
          }
        });

        return () => unsubscribeAuth();
      } catch (error) {
        console.error("Firebase başlatılırken hata oluştu:", error);
        setAppError(`Uygulama başlatılırken kritik hata: ${error.message}. Lütfen Firebase yapılandırmanızı kontrol edin.`);
        setIsAuthReady(true); // Still mark as ready to prevent infinite loading state
        setIsProfileLoaded(true); // Allow rendering of login page even if Firebase init fails
      }
    }, []); 

    // 2. Firestore dinleyicilerini kurma (db ve pseudoUserId'ye bağlı)
    useEffect(() => {
        let unsubscribeProfile, unsubscribeProgress, unsubscribeChat, unsubscribeTopicChat;

        if (db && pseudoUserId) {
            // Kullanıcı Profili Dinleyicisi
            const userProfileRef = doc(db, 'artifacts', appId, 'public', 'data', 'registeredUsers', pseudoUserId); 
            unsubscribeProfile = onSnapshot(userProfileRef, (docSnap) => {
                const newProfileData = docSnap.exists() ? docSnap.data() : null;
                setProfile(newProfileData);
                setIsProfileLoaded(true); // Profil verisi çekildi (var olsun ya da olmasın)
            }, (error) => {
                console.error("Profil verisi çekilirken hata oluştu:", error);
                setAppError(`Profil verisi yüklenirken hata: ${error.message}`);
                setIsProfileLoaded(true); // Hata durumunda da yüklenmiş olarak işaretle
            });

            // İlerleme Verileri Dinleyicisi
            const progressCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'progress');
            unsubscribeProgress = onSnapshot(query(progressCollectionRef, orderBy('timestamp', 'desc')), (snapshot) => {
                const newData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProgressData(newData);
            }, (error) => {
                console.error("İlerleme verisi çekilirken hata oluştu:", error);
                setAppError(`İlerleme verileri yüklenirken hata: ${error.message}`);
            });

            // AI Sohbet Geçmişi Dinleyicisi
            const chatHistoryCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiChatHistory');
            unsubscribeChat = onSnapshot(query(chatHistoryCollectionRef, orderBy('timestamp')), (snapshot) => {
                const newHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAiChatHistory(newHistory);
            }, (error) => {
                console.error("AI sohbet geçmişi çekilirken hata oluştu:", error);
                setAppError(`AI sohbet geçmişi yüklenirken hata: ${error.message}`);
            });

            // AI Konu Anlatımı Geçmişi Dinleyicisi
            const topicHistoryCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiTopicHistory');
            unsubscribeTopicChat = onSnapshot(query(topicHistoryCollectionRef, orderBy('timestamp')), (snapshot) => {
                const newHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAiTopicHistory(newHistory);
            }, (error) => {
                console.error("AI konu anlatımı geçmişi çekilirken hata oluştu:", error);
                setAppError(`AI konu anlatımı geçmişi yüklenirken hata: ${error.message}`);
            });

        } else {
          // pseudoUserId null ise dinleyicileri temizle ve verileri sıfırla (eğer zaten sıfırlanmamışsa)
          setProfile(null); // Profil null
          setIsProfileLoaded(false); // Profilin yüklü olmadığını işaretle
          setProgressData([]);
          setAiChatHistory([]);
          setAiTopicHistory([]);
        }
        
        return () => {
          // pseudoUserId veya db değiştiğinde eski dinleyicileri temizle
          if (unsubscribeProfile) unsubscribeProfile();
          if (unsubscribeProgress) unsubscribeProgress();
          if (unsubscribeChat) unsubscribeChat();
          if (unsubscribeTopicChat) unsubscribeTopicChat(); 
        };
    }, [db, pseudoUserId]); // Dependencies are important!

    // 3. AI Önerilerini Çekme (profil ve ilerleme verileri hazır olduğunda)
    useEffect(() => {
      if (profile && pseudoUserId) { // Yalnızca profil varsa ve kullanıcı kimliği biliniyorsa çek
        fetchAiRecommendations(progressData, pseudoUserId); 
      } else {
        setAiRecommendations("Profil ve ilerleme bilgileri yüklendikten sonra öneriler sunulacaktır.");
      }
    }, [profile, progressData, pseudoUserId, fetchAiRecommendations]); 


    return (
      <div className="min-h-screen bg-gray-100 font-inter antialiased flex flex-col">
        {/* Navbar */}
        <nav className="bg-gradient-to-r from-blue-700 to-blue-900 p-4 shadow-lg sticky top-0 z-40">
          <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
            <div className="text-white text-3xl font-extrabold mb-4 md:mb-0">
              <a href="#" onClick={() => setActiveTab('dashboard')} className="hover:text-blue-200 transition-colors duration-300">
                Akademi Koçu
              </a>
            </div>
            <div className="flex flex-wrap justify-center md:space-x-6 space-x-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 ${
                  activeTab === 'dashboard' ? 'bg-blue-500 text-white shadow-md' : 'text-blue-200 hover:text-white'
                }`}
              >
                <i className="fas fa-home mr-2"></i>Kontrol Paneli
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 ${
                  activeTab === 'progress' ? 'bg-blue-500 text-white shadow-md' : 'text-blue-200 hover:text-white'
                }`}
              >
                <i className="fas fa-chart-line mr-2"></i>İlerleme Kaydı
              </button>
              <button
                onClick={() => setActiveTab('aiCoach')}
                className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 ${
                  activeTab === 'aiCoach' ? 'bg-blue-500 text-white shadow-md' : 'text-blue-200 hover:text-white'
                }`}
              >
                {/* Modern AI / Robot Icon */}
                <i className="fas fa-robot mr-2"></i>
                AI Koç
              </button>
              <button
                onClick={() => setActiveTab('aiMock')}
                className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 ${
                  activeTab === 'aiMock' ? 'bg-blue-500 text-white shadow-md' : 'text-blue-200 hover:text-white'
                }`}
              >
                <i className="fas fa-clipboard-list mr-2"></i>AI Deneme
              </button>
              <button
                onClick={() => setActiveTab('aiTopic')}
                className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 ${
                  activeTab === 'aiTopic' ? 'bg-blue-500 text-white shadow-md' : 'text-blue-200 hover:text-white'
                }`}
              >
                <i className="fas fa-book-open mr-2"></i>AI Konu Anlatımı
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 ${
                  activeTab === 'profile' ? 'bg-blue-500 text-white shadow-md' : 'text-blue-200 hover:text-white'
                }`}
              >
                <i className="fas fa-user-circle mr-2"></i>Profilim
              </button>
              <button
                onClick={async () => {
                  try {
                    await signOut(auth); 
                    setActiveTab('dashboard'); // Ana sayfaya yönlendir
                  } catch (error) {
                    console.error("Çıkış yaparken hata:", error);
                    setAppError(`Çıkış sırasında hata: ${error.message}`);
                  }
                }}
                className="py-2 px-4 rounded-lg font-semibold text-blue-200 hover:text-white transition-colors duration-300 bg-red-600 hover:bg-red-700"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>Çıkış Yap
              </button>
            </div>
          </div>
        </nav>

        {/* Display application-wide errors */}
        {appError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative m-4 shadow-md">
            <strong className="font-bold">Hata!</strong>
            <span className="block sm:inline ml-2">{appError}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onClick={() => setAppError(null)}>
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Kapat</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.414l-2.651 2.651a1.2 1.2 0 1 1-1.697-1.697L8.586 10 5.935 7.349a1.2 1.2 0 0 1 1.697-1.697L10 8.586l2.651-2.651a1.2 1.2 0 0 1 1.697 1.697L11.414 10l2.651 2.651a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </span>
          </div>
        )}

        {/* Conditional rendering for loading, login/register, or main app */}
        {(!isAuthReady || (user && !isProfileLoaded)) ? ( 
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center text-gray-700 text-lg font-semibold">
              { !isAuthReady ? "Uygulama Başlatılıyor..." : "Profil Yükleniyor..." }
            </div>
          </div>
        ) : !user ? ( // User is not authenticated at all
          <LoginRegister setAppError={setAppError} />
        ) : ( // User is authenticated and profile is loaded (even if it's an empty initial profile)
          <main className="flex-grow container mx-auto py-8">
            {activeTab === 'dashboard' && <Dashboard key="dashboard-component" profile={profile} progressData={progressData} pseudoUserId={pseudoUserId} aiRecommendations={aiRecommendations} fetchAiRecommendations={fetchAiRecommendations} handleEditProgress={handleEditProgress} handleDeleteProgress={handleDeleteProgress} />}
            {activeTab === 'profile' && <Profile key="profile-component" profile={profile} user={user} pseudoUserId={pseudoUserId} />}
            {activeTab === 'progress' && <ProgressEntry key="progress-component" profile={profile} pseudoUserId={pseudoUserId} progressData={progressData} editingProgressEntry={editingProgressEntry} setEditingProgressEntry={setEditingProgressEntry} handleDeleteProgress={handleDeleteProgress} />}
            {activeTab === 'aiCoach' && <AICoachChat key="main-ai-coach" pseudoUserId={pseudoUserId} aiChatHistory={aiChatHistory} setAiChatHistory={setAiChatHistory} />}
            {activeTab === 'aiMock' && <AIMockExam key="ai-mock-component" profile={profile} pseudoUserId={pseudoUserId} />}
            {activeTab === 'aiTopic' && <AITopicExplanation key="ai-topic-component" pseudoUserId={pseudoUserId} aiTopicHistory={aiTopicHistory} setAiTopicHistory={setAiTopicHistory} />} {/* Pass topic history */}
          </main>
        )}

        {/* AI Coach Popup Button - Updated with a modern AI/bulb icon SVG */}
        {profile && ( // Only show popup button if profile is loaded
          <button
            onClick={toggleAiCoachPopup}
            className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg text-2xl z-50 transform hover:scale-110 transition-transform duration-300"
            title="AI Koç ile Sohbet Et"
          >
            {/* Modern AI / Robot Icon (same as navbar) */}
            <i className="fas fa-robot"></i>
          </button>
        )}

        {/* AI Coach Chat Popup */}
        {profile && showAiCoachPopup && ( // Only show popup if profile is loaded
          <AICoachChat
            key="popup-ai-coach"
            isPopup={true}
            showPopup={showAiCoachPopup}
            togglePopup={toggleAiCoachPopup} // Fixed: Correct prop name for toggle function
            pseudoUserId={pseudoUserId}
            aiChatHistory={aiChatHistory}
            setAiChatHistory={setAiChatHistory}
          />
        )}

        {/* Footer for GitHub attribution */}
        <footer className="bg-gray-800 text-white p-4 text-center mt-auto">
          {/* Removed "Akademi Koçu'ndan Ek Öneriler" section */}
          <div className="mt-4 text-sm">
            <p className="font-semibold">Destek için:</p>
            <p>Instagram: <a href="https://www.instagram.com/sirfatihsultanterim" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">@sirfatihsultanterim</a></p>
            <p>E-posta: <a href="mailto:yusuf.akademikkocudestek@gmail.com" className="text-blue-300 hover:underline">yusuf.akademikkocudestek@gmail.com</a></p>
          </div>
          {/* GitHub Attribution */}
          <p className="text-xs text-gray-400 mt-2 flex items-center justify-center">
            <i className="fab fa-github mr-2"></i> GitHub'ın gücüyle Yusuf tarafından yapıldı.
          </p>
          <p className="text-xs text-gray-400 mt-2">&copy; {new Date().getFullYear()} Akademi Koçu. Tüm hakları saklıdır.</p>
        </footer>

        {/* Confirmation Modal */}
        <ConfirmationModal
          show={showConfirmModal}
          message={modalMessage}
          onConfirm={modalAction}
          onCancel={() => {
            setShowConfirmModal(false);
            setModalAction(null);
          }}
        />

        {/* FontAwesome for Icons */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
        {/* Inter Font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>
          {`
            body {
              font-family: 'Inter', sans-serif;
            }
            .prose {
              color: #333;
              line-height: 1.6;
            }
            .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
              color: #1a202c;
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              line-height: 1.2;
            }
            .prose p {
              margin-bottom: 1em;
            }
            /* Custom styles for better aesthetics */
            button {
              transition: all 0.3s ease;
            }
            button:hover {
              transform: translateY(-2px);
            }
            input, select {
              box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            }
            input:focus, select:focus {
              outline: none;
              box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5); /* blue-500 with opacity */
            }
            .shadow-lg {
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }
            .rounded-xl {
              border-radius: 1rem;
            }
          `}
        </style>
      </div>
    );
  }

export default App;
