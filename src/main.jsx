import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updatePassword 
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
  storageBucket: "ogrenci-rehberi-c3f41.firebase.storage.app",
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

// Privacy Policy Content and Version
const PRIVACY_POLICY_TEXT = `
## Gizlilik Sözleşmesi

**Son Güncelleme Tarihi: 14 Haziran 2025**

Bu Gizlilik Sözleşmesi, Akademi Koçu mobil uygulaması ve web sitesi ("Uygulama") aracılığıyla toplanan, kullanılan ve paylaşılan bilgileri açıklamaktadır. Uygulamamızı kullanarak bu sözleşmeyi kabul etmiş olursunuz.

### 1. Topladığımız Bilgiler

Uygulamamız aşağıdaki bilgi türlerini toplayabilir:

* **Kişisel Tanımlayıcı Bilgiler (KTB):** Kayıt sırasında sağladığınız e-posta adresi, adınız, soyadınız, doğum tarihiniz ve sınıf bilginiz.
* **Kullanım Verileri:** Uygulamayı nasıl kullandığınıza dair bilgiler (örneğin, hangi özelliklerin kullanıldığı, ne kadar süreyle kullanıldığı, AI ile etkileşim geçmişi, deneme sonuçları ve ilerleme kayıtları).
* **Teknik Veriler:** Cihazınızın IP adresi, tarayıcı türü, işletim sistemi ve erişim tarihleri/saatleri gibi otomatik olarak toplanan bilgiler.

### 2. Bilgilerinizi Nasıl Kullanıyoruz?

Topladığımız bilgileri aşağıdaki amaçlarla kullanırız:

* **Hizmet Sağlama ve İyileştirme:** Uygulamanın temel işlevlerini sunmak, kullanıcı deneyimini kişiselleştirmek ve yeni özellikler geliştirmek.
* **İletişim:** Hesap yönetimi, güncellemeler ve destek sağlamak.
* **Güvenlik:** Yetkisiz erişim veya dolandırıcılığı önlemek, uygulamamızın güvenliğini sağlamak.
* **Analiz ve Araştırma:** Uygulamanın performansını anlamak ve kullanıcı ihtiyaçlarını daha iyi karşılamak için anonimleştirilmiş veya toplu verileri analiz etmek.
* **Yasal Yükümlülükler:** Geçerli yasalara ve düzenlemelere uymak.

### 3. Bilgi Paylaşımı

Bilgilerinizi aşağıdaki durumlar dışında üçüncü taraflarla paylaşmayız:

* **Hizmet Sağlayıcılar:** Uygulamanın çalışması için gerekli hizmetleri (barındırma, veri analizi, kimlik doğrulama vb.) sağlayan güvenilir üçüncü taraf şirketlerle. Bu sağlayıcılar, bilgileri yalnızca bize hizmet sağlamak için kullanır ve gizlilik politikalarına uymakla yükümlüdürler.
* **Yasal Gereklilikler:** Yasal bir yükümlülük, mahkeme emri veya resmi bir talep durumunda.
* **İş Transferleri:** Birleşme, satın alma veya varlık satışı gibi durumlarda, bilgiler devredilen varlıklar arasında yer alabilir.
* **Rızanızla:** Açık rızanız olması durumunda.

### 4. Veri Saklama ve Güvenlik

Bilgilerinizi hizmetleri sağlamak ve yasal yükümlülükleri yerine getirmek için gerekli olduğu sürece saklarız. Bilgilerinizin güvenliğini sağlamak için teknik ve idari önlemler alıyoruz. Ancak, hiçbir internet tabanlı iletim veya depolama yöntemi %100 güvenli değildir.

### 5. Veri Haklarınız

Geçerli yasalara tabi olarak, kişisel bilgilerinize erişme, düzeltme, silme veya işlemeyi kısıtlama hakkına sahip olabilirsiniz. Bu haklarınızı kullanmak için lütfen aşağıdaki iletişim bilgilerini kullanarak bizimle iletişime geçin.

### 6. Çocukların Gizliliği

Uygulamamız 13 yaşın altındaki çocuklara yönelik değildir. 13 yaşın altındaki çocuklardan bilerek kişisel bilgi toplamayız. Eğer bir çocuğun bize kişisel bilgi sağladığına dair bir ebeveyn veya vasiyseniz ve bu bilgilerin silinmesini istiyorsanız, lütfen bizimle iletişime geçin.

### 7. Bu Gizlilik Sözleşmesinde Yapılan Değişiklikler

Bu Gizlilik Sözleşmesini zaman zaman güncelleyebiliriz. Herhangi bir değişiklik olduğunda, güncellenmiş sözleşmeyi uygulamamızda yayınlayacağız ve "Son Güncelleme Tarihi"ni güncelleyeceğiz. Önemli değişiklikler için sizi bilgilendirebiliriz.

### 8. Bize Ulaşın

Gizlilik Sözleşmemiz hakkında sorularınız veya endişeleriniz varsa, lütfen bizimle iletişime geçin:

**E-posta:** yusuf.akademikkocudestek@gmail.com
**Instagram:** @sirfatihsultanterim
`;
const PRIVACY_POLICY_VERSION = '1.0'; // Current version of the privacy policy


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

// New ClearHistoryModal Component
const ClearHistoryModal = ({ show, onConfirm, onCancel, message }) => {
  const [selectedHistories, setSelectedHistories] = useState([]);
  const [localMessage, setLocalMessage] = useState(message || "Silmek istediğiniz AI geçmiş(lerini) seçin:");

  useEffect(() => {
    setLocalMessage(message || "Silmek istediğiniz AI geçmiş(lerini) seçin:");
  }, [message]);

  if (!show) return null;

  const handleCheckboxChange = (event) => {
    const { value, checked } = event.target;
    if (checked) {
      setSelectedHistories(prev => [...prev, value]);
    } else {
      setSelectedHistories(prev => prev.filter(item => item !== value));
    }
  };

  const handleConfirmClick = () => {
    if (selectedHistories.length === 0) {
      setLocalMessage("Lütfen silmek istediğiniz en az bir geçmiş türü seçin.");
      return;
    }
    // Optionally, add another confirmation here if needed, or pass directly to onConfirm
    onConfirm(selectedHistories);
    setSelectedHistories([]); // Reset after confirming
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full text-center">
        <p className="text-lg font-semibold mb-4">{localMessage}</p>
        <div className="flex flex-col items-start space-y-3 mb-6">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="form-checkbox h-5 w-5 text-blue-600 rounded"
              value="aiChatHistory"
              checked={selectedHistories.includes("aiChatHistory")}
              onChange={handleCheckboxChange}
            />
            <span className="ml-2 text-gray-700">AI Koç Geçmişi</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="form-checkbox h-5 w-5 text-red-600 rounded"
              value="aiTopicHistory"
              checked={selectedHistories.includes("aiTopicHistory")}
              onChange={handleCheckboxChange}
            />
            <span className="ml-2 text-gray-700">AI Konu Anlatımı Geçmişi</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="form-checkbox h-5 w-5 text-orange-600 rounded"
              value="aiSoruCozumuHistory"
              checked={selectedHistories.includes("aiSoruCozumuHistory")}
              onChange={handleCheckboxChange}
            />
            <span className="ml-2 text-gray-700">AI Soru Çözümü Geçmişi</span>
          </label>
        </div>
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleConfirmClick}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
          >
            Seçilenleri Sil
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

// Privacy Policy Modal Component
const PrivacyPolicyModal = ({ show, onClose, onAccept, isRegistrationFlow = false }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-2xl w-full h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h2 className="text-2xl font-bold text-gray-800">Gizlilik Sözleşmesi</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl font-bold">
            &times;
          </button>
        </div>
        <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar">
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY_TEXT.replace(/\n/g, '<br/>') }}></div>
        </div>
        <div className="mt-6 flex justify-end">
          {isRegistrationFlow && (
            <button
              onClick={onAccept}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 mr-4"
            >
              Kabul Ediyorum
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
          >
            Kapat
          </button>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #aab8c2;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #8899a6;
        }
      `}</style>
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
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false); // New state for privacy policy
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false); // New state for privacy policy modal


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

    // Validate privacy policy acceptance for registration
    if (isRegister && !privacyPolicyAccepted) {
      setMessage("Gizlilik Sözleşmesini kabul etmeniz gerekmektedir.");
      return;
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
          privacyPolicyAccepted: true, // Mark as accepted
          privacyPolicyVersion: PRIVACY_POLICY_VERSION, // Store version
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
            privacyPolicyAccepted: false, // Default to false if profile wasn't found (should be accepted on register)
            privacyPolicyVersion: null,
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
              {/* Privacy Policy Acceptance */}
              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  id="privacyPolicy"
                  className="form-checkbox h-5 w-5 text-blue-600 rounded"
                  checked={privacyPolicyAccepted}
                  onChange={(e) => setPrivacyPolicyAccepted(e.target.checked)}
                  required // Make acceptance mandatory
                />
                <label htmlFor="privacyPolicy" className="ml-2 text-gray-700 text-sm">
                  <button type="button" onClick={() => setShowPrivacyPolicyModal(true)} className="text-blue-600 hover:underline font-semibold focus:outline-none">
                    Gizlilik Sözleşmesini
                  </button>
                  {" "}okudum ve kabul ediyorum.
                </label>
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
      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        show={showPrivacyPolicyModal}
        onClose={() => setShowPrivacyPolicyModal(false)}
        onAccept={() => {
          setPrivacyPolicyAccepted(true);
          setShowPrivacyPolicyModal(false);
        }}
        isRegistrationFlow={isRegister}
      />
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
    <div className="p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-64px)] rounded-xl"> {/* Changed to rounded-xl */}
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
  const Profile = React.memo(({ profile, user, pseudoUserId, handleClearAIHistoryRequest }) => { // Added handleClearAIHistoryRequest
    const [name, setName] = useState(profile?.name || '');
    const [selectedClass, setSelectedClass] = useState(profile?.class || '');
    const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth || '');
    const [newPassword, setNewPassword] = useState(''); // New state for password
    const [confirmNewPassword, setConfirmNewPassword] = useState(''); // New state for password confirmation
    const [message, setMessage] = useState('');
    const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false); // State for privacy policy modal


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
          // Privacy policy acceptance status is NOT updated here, only on registration
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

          {/* AI History Clear Button */}
          <div className="flex justify-center mb-6">
            <button
              type="button"
              onClick={handleClearAIHistoryRequest}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 transition duration-300"
            >
              AI Geçmişini Sıfırla
            </button>
          </div>

          {/* View Privacy Policy Button */}
          <div className="flex justify-center mb-6">
            <button
              type="button"
              onClick={() => setShowPrivacyPolicyModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50 transition duration-300"
            >
              Gizlilik Sözleşmesini Görüntüle
            </button>
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
      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        show={showPrivacyPolicyModal}
        onClose={() => setShowPrivacyPolicyModal(false)}
      />
      </div>
    );
  });

  // Progress Entry Component (Redesigned)
  const ProgressEntry = React.memo(({ profile, pseudoUserId, progressData, editingProgressEntry, setEditingProgressEntry, handleDeleteProgress, handleEditProgress }) => {
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
        return updatedInputs;
      });
    }, []); 

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
      <div className="p-6 md:p-8 bg-gradient-to-br from-teal-50 to-cyan-100 min-h-[calc(100vh-64px)] rounded-xl">
        <h2 className="text-3xl font-extrabold text-gray-800 mb-8 text-center">İlerleme Kaydı</h2>

        {/* New Entry / Edit Entry Section */}
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-4xl mx-auto border-t-8 border-teal-600 mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            {editingProgressEntry ? 'Kaydı Düzenle' : 'Yeni İlerleme Kaydı Ekle'}
          </h3>
          <form onSubmit={handleSubmitProgress}>
            {/* Progress Name and Date Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="progressName">
                  İlerleme Adı (Örn: Haftalık Deneme, Matematik Tekrarı)
                </label>
                <input
                  type="text"
                  id="progressName"
                  className="shadow-sm appearance-none border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all duration-300 placeholder-gray-400"
                  value={progressName}
                  onChange={(e) => setProgressName(e.target.value)}
                  placeholder="Bir başlık girin"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="entryDate">
                  Tarih
                </label>
                <input
                  type="date"
                  id="entryDate"
                  className="shadow-sm appearance-none border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all duration-300"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)} // Restrict future dates
                  required
                />
              </div>
            </div>

            {/* Dynamic Subject Entries - Redesigned Section */}
            {!profile?.class ? (
                <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-6 rounded-md" role="alert">
                    <p className="font-bold">Sınıf Bilgisi Eksik!</p>
                    <p>Ders girişlerini görmek için lütfen <span className="font-semibold">Profilim</span> sekmesinden sınıfınızı belirtin.</p>
                </div>
            ) : (
                <>
                  <h4 className="text-xl font-bold text-gray-800 mb-4 text-center border-b pb-2">Derslere Göre Performans Girişi</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[400px] overflow-y-auto pr-2 mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      {memoizedAvailableSubjects.map((subjectName) => (
                          <div key={subjectName} className="bg-white p-6 rounded-xl shadow-lg border-b-4 border-blue-300 hover:border-blue-500 transform hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center">
                              <i className="fas fa-book text-3xl text-blue-600 mb-3"></i> {/* Generic book icon */}
                              <h5 className="font-extrabold text-xl text-gray-800 mb-4 text-center">{subjectName}</h5>
                              <div className="w-full space-y-3">
                                  <div>
                                      <label className="block text-gray-600 text-sm font-medium mb-1" htmlFor={`${subjectName}-correct`}>
                                          Doğru Sayısı
                                      </label>
                                      <input
                                          type="number"
                                          id={`${subjectName}-correct`}
                                          className="shadow-sm appearance-none border-2 border-green-200 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
                                          value={subjectInputs[subjectName]?.correct || ''}
                                          onChange={(e) => handleSubjectInputChange(subjectName, 'correct', e.target.value)}
                                          min="0"
                                          placeholder="Doğru"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-gray-600 text-sm font-medium mb-1" htmlFor={`${subjectName}-incorrect`}>
                                          Yanlış Sayısı
                                      </label>
                                      <input
                                          type="number"
                                          id={`${subjectName}-incorrect`}
                                          className="shadow-sm appearance-none border-2 border-red-200 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500"
                                          value={subjectInputs[subjectName]?.incorrect || ''}
                                          onChange={(e) => handleSubjectInputChange(subjectName, 'incorrect', e.target.value)}
                                          min="0"
                                          placeholder="Yanlış"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-gray-600 text-sm font-medium mb-1" htmlFor={`${subjectName}-blank`}>
                                          Boş Sayısı
                                      </label>
                                      <input
                                          type="number"
                                          id={`${subjectName}-blank`}
                                          className="shadow-sm appearance-none border-2 border-yellow-200 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                          value={subjectInputs[subjectName]?.blank || ''}
                                          onChange={(e) => handleSubjectInputChange(subjectName, 'blank', e.target.value)}
                                          min="0"
                                          placeholder="Boş"
                                      />
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
                </>
            )}

            {/* Submit and Cancel Buttons */}
            <div className="flex justify-center mt-6 space-x-4">
              <button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!profile?.class} // Disable if class is not set
              >
                {editingProgressEntry ? (
                  <><i className="fas fa-save mr-2"></i>Kaydı Güncelle</>
                ) : (
                  <><i className="fas fa-plus-circle mr-2"></i>Yeni Kayıt Ekle</>
                )}
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
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                  <i className="fas fa-times-circle mr-2"></i>İptal
                </button>
              )}
            </div>
            {message && <p className="text-center text-green-500 text-sm mt-4">{message}</p>}
          </form>
        </div>

        {/* All Progress Entries Section */}
        <div className="mt-8 bg-white p-8 rounded-xl shadow-2xl max-w-4xl mx-auto border-t-8 border-blue-600">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Tüm İlerleme Kayıtları</h3>
          {progressData.length === 0 ? (
            <p className="text-gray-600 text-center text-lg italic">Henüz bir ilerleme kaydınız yok. Yukarıdaki formu kullanarak ekleyebilirsiniz.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {progressData.map((entry) => {
                const entryTotalCorrect = entry.entries.reduce((sum, item) => sum + (item.correct || 0), 0);
                const entryTotalIncorrect = entry.entries.reduce((sum, item) => sum + (item.incorrect || 0), 0);
                const entryTotalBlank = entry.entries.reduce((sum, item) => sum + (item.blank || 0), 0);
                const entryTotalQuestions = entryTotalCorrect + entryTotalIncorrect + entryTotalBlank;

                return (
                  <div key={entry.id} className="bg-gray-50 p-6 rounded-xl shadow-md border-t-4 border-cyan-400 flex flex-col justify-between transform hover:scale-[1.02] transition-transform duration-200">
                    <div>
                        <p className="text-sm text-gray-600 font-bold mb-2">
                          <i className="far fa-calendar-alt mr-1"></i> {entry.date}
                        </p>
                        <h4 className="text-xl font-semibold text-gray-800 mb-3">{entry.name || 'İsimsiz İlerleme'}</h4>
                        
                        <div className="grid grid-cols-3 gap-2 text-center text-base font-semibold mb-3">
                            <div className="bg-green-100 text-green-700 p-2 rounded-md">D: {entryTotalCorrect}</div>
                            <div className="bg-red-100 text-red-700 p-2 rounded-md">Y: {entryTotalIncorrect}</div>
                            <div className="bg-yellow-100 text-yellow-700 p-2 rounded-md">B: {entryTotalBlank}</div>
                        </div>
                        <p className="text-md font-bold text-gray-700 text-center mb-4">Toplam Soru: {entryTotalQuestions}</p>

                        <div className="border-t border-gray-200 pt-3 space-y-1">
                          {entry.entries.map((item, idx) => (
                              // Sadece sıfır olmayan değerlere sahip dersleri göster
                              (item.correct > 0 || item.incorrect > 0 || item.blank > 0) && (
                                  <p key={idx} className="text-xs text-gray-700 flex justify-between items-center bg-gray-100 p-2 rounded-md">
                                      <span className="font-medium text-gray-800">{item.subject}:</span> 
                                      <span className="flex items-center space-x-2">
                                          <span className="text-green-600"><i className="fas fa-check-circle"></i> {item.correct}</span>
                                          <span className="text-red-600"><i className="fas fa-times-circle"></i> {item.incorrect}</span>
                                          <span className="text-yellow-600"><i className="fas fa-minus-circle"></i> {item.blank}</span>
                                      </span>
                                  </p>
                              )
                          ))}
                        </div>
                    </div>
                    <div className="flex justify-end mt-5 space-x-2">
                      <button
                        onClick={() => handleEditProgress(entry)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-full text-sm shadow-md transition duration-300 transform hover:scale-105 active:scale-95"
                      >
                        <i className="fas fa-edit mr-1"></i>Düzenle
                      </button>
                      <button
                        onClick={() => handleDeleteProgress(entry.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full text-sm shadow-md transition duration-300 transform hover:scale-105 active:scale-95"
                      >
                        <i className="fas fa-trash-alt mr-1"></i>Sil
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
  }); 

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

  // Helper function to format text with basic markdown (bold, italic, and lists)
  const formatTextWithMarkdown = (text) => {
    let formattedText = text;

    // Bold: **text**
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Unordered lists: - item
    formattedText = formattedText.replace(/^- (.*)$/gm, '<li>$1</li>');
    if (formattedText.includes('<li>')) {
      formattedText = `<ul>${formattedText}</ul>`;
    }
    // Ordered lists: 1. item
    formattedText = formattedText.replace(/^\d+\. (.*)$/gm, '<li>$1</li>');
    if (formattedText.includes('<li>') && !formattedText.startsWith('<ul>')) { // Check if it's not already an unordered list
      formattedText = `<ol>${formattedText}</ol>`;
    }

    return { __html: formattedText };
  };

  // AI Coach Chat Component
  const AICoachChat = React.memo(({ isPopup = false, showPopup, togglePopup, pseudoUserId, aiChatHistory, setAiChatHistory, profile, progressData }) => { // Added profile and progressData prop
    const [inputMessage, setInputMessage] = useState('');
    const chatContainerRef = useRef(null);
    const [isTyping, setIsTyping] = useState(false); // New state for typing indicator
    const [currentTypingMessage, setCurrentTypingMessage] = useState(''); // New state for typing effect
    const [activeChatTab, setActiveChatTab] = useState('chat'); // 'chat' or 'progressRecords'
    const [selectedProgressForAI, setSelectedProgressForAI] = useState(null);


    // Scroll to bottom when messages change
    useEffect(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, [aiChatHistory, currentTypingMessage, activeChatTab]); // Also scroll when typing message updates or tab changes

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

      // Add user's class information to the prompt
      const classInfo = profile?.class ? `Kullanıcının sınıfı: ${profile.class}. Sınıf. ` : '';
      let finalPrompt;

      if (selectedProgressForAI) {
          // Include selected progress data in the prompt
          const progressDetails = `Kullanıcının aşağıdaki ilerleme kaydı bulunuyor:\n\nTarih: ${selectedProgressForAI.date}\nAdı: ${selectedProgressForAI.name}\nDetaylar:\n${selectedProgressForAI.entries.map(e => `${e.subject}: Doğru ${e.correct}, Yanlış ${e.incorrect}, Boş ${e.blank}`).join('\n')}\n\nBu kayıtla ilgili olarak kullanıcının son mesajı: "${inputMessage}".`;
          finalPrompt = `${classInfo}${progressDetails}. Yanıtların kısa ve öz, maksimum 3-4 cümle uzunluğunda olsun. Maddeler halinde veya anahtar noktaları vurgulayarak biçimlendir (örneğin **kalın**, *italik* kullan).`;
      } else {
          // General academic coaching, no specific ders mentioned
          finalPrompt = `${classInfo}Kullanıcının genel akademik ihtiyaçlarına yönelik veya son mesajı: "${inputMessage}". Bu mesaja uygun olarak akademik koçluk yap. Yanıtların kısa ve öz, maksimum 3-4 cümle uzunluğunda olsun. Maddeler halinde veya anahtar noktaları vurgulayarak biçimlendir (örneğin **kalın**, *italik* kullan).`;
      }

      // Filter and map previous messages for API, ensuring 'parts' are not empty
      const chatForAI = aiChatHistory.slice(-9).flatMap(msg => {
        // Only include if msg.text is a non-empty string after trimming whitespace.
        // This addresses the "contents.parts must not be empty" error.
        if (typeof msg.text === 'string' && msg.text.trim().length > 0) { 
          return [{ role: msg.role, parts: [{ text: msg.text }] }];
        }
        return []; // Filter out messages that would have empty parts
      });
      chatForAI.push({ role: "user", parts: [{ text: finalPrompt }] });


      try {
        const apiKey = "AIzaSyC_klt6i2LBaZUo6YRHDg4f0Z1kj7NWKac"; 
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
              const errorMessage = { role: 'model', text: `API Hatası: ${result.error.message || 'Bilinmeyen bir hata oluştu.'}`, timestamp: Date.now() };
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
          const errorMessage = { role: 'model', text: "Üzgünüm, şu an cevap veremiyorum. Lütfen daha sonra tekrar deneyin. (AI boş/geçersiz yanıt verdi)", timestamp: Date.Now() };
          setAiChatHistory(prev => [...prev, errorMessage]);
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiChatHistory'), errorMessage);
        }
      } catch (error) {
        console.error("AI ile iletişimde hata:", error);
        const errorMessage = { role: 'model', text: "Bir hata oluştu, lütfen daha sonra tekrar deneyin. (Bağlantı sorunu olabilir)", timestamp: Date.Now() };
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

    const handleSelectProgressRecord = (record) => {
      setSelectedProgressForAI(record);
      setActiveChatTab('chat'); // Switch back to chat view
      setAiChatHistory(prev => [...prev, { role: 'model', text: `"${record.name}" ilerleme kaydınızı incelemem için bana gönderdiniz. Şimdi bu kayıtla ilgili sorularınızı bekliyorum.`, timestamp: Date.now() }]);
    };

    const commonClasses = "flex flex-col rounded-xl shadow-2xl bg-white border border-gray-200"; // Added border for subtle definition
    // Adjusted popupClasses to increase height
    const popupClasses = "fixed bottom-6 right-6 w-80 md:w-96 h-[550px] z-50 overflow-hidden"; 
    // Changed fullPageClasses to have a fixed height and width
    const fullPageClasses = "p-6 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-[calc(100vh-64px)] max-w-3xl mx-auto rounded-xl flex flex-col h-[700px]"; // Lighter gradient background

    return (
      <div className={`${commonClasses} ${isPopup ? popupClasses : fullPageClasses} flex flex-col transition-all duration-500 ease-in-out`}>
        {/* Header Section */}
        <h3 className={`font-extrabold text-center text-black ${isPopup ? 'text-xl py-4 bg-gradient-to-r from-blue-600 to-blue-800 rounded-t-xl shadow-md' : 'text-4xl text-gray-800 mb-6'}`}>
          Yapay Zeka Koçu
          {isPopup && (
            <button
              onClick={togglePopup}
              className="absolute top-2 right-3 text-white hover:text-blue-200 text-3xl font-bold transition-transform transform hover:rotate-90 duration-300"
            >
              &times;
            </button>
          )}
        </h3>

        {/* Tab Navigation */}
        <div className={`flex w-full ${isPopup ? 'flex-row' : 'flex-col md:flex-row'} p-2 bg-gray-100 rounded-b-xl md:rounded-xl shadow-inner mb-4`}>
            <button
                onClick={() => setActiveChatTab('chat')}
                className={`flex-1 py-3 px-4 rounded-lg text-sm md:text-base font-semibold transition-all duration-300 transform hover:scale-105 ${
                    activeChatTab === 'chat' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:bg-white'
                }`}
            >
                <i className="fas fa-comments mr-2"></i>Sohbet
            </button>
            <button
                onClick={() => setActiveChatTab('progressRecords')}
                className={`flex-1 py-3 px-4 rounded-lg text-sm md:text-base font-semibold transition-all duration-300 transform hover:scale-105 ${
                    activeChatTab === 'progressRecords' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:bg-white'
                }`}
            >
                <i className="fas fa-tasks mr-2"></i>İlerleme Kayıtları
            </button>
        </div>

        {/* Chat / Progress Records Content */}
        <div ref={chatContainerRef} className={`flex-grow overflow-y-auto p-4 bg-white rounded-xl shadow-inner custom-scrollbar ${isPopup ? 'mb-0' : 'mb-6'}`}> 
          {activeChatTab === 'chat' && (
            aiChatHistory.length === 0 && !isTyping ? (
              <div className="text-center text-gray-500 italic p-4">
                <i className="fas fa-robot text-4xl text-blue-300 mb-2"></i>
                <p>Yapay Zeka Koçu'na hoş geldiniz!</p>
                <p className="text-sm">Nasıl yardımcı olabilirim? İlerleme kaydınızı okumamı isterseniz 'İlerleme Kayıtları' sekmesini kullanın.</p>
              </div>
            ) : (
              aiChatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-3xl shadow-md animate-fade-in ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white self-end rounded-br-none'
                        : 'bg-gray-200 text-gray-800 self-start rounded-bl-none'
                    }`}
                  >
                    <p dangerouslySetInnerHTML={formatTextWithMarkdown(msg.text)}></p>
                    <span className="block text-xs text-right text-opacity-75 mt-2">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )
          )}
          {activeChatTab === 'progressRecords' && (
              progressData.length === 0 ? (
                  <div className="text-center text-gray-500 italic p-4">
                      <i className="fas fa-exclamation-circle text-4xl text-gray-300 mb-2"></i>
                      <p>Henüz bir ilerleme kaydınız yok.</p>
                      <p className="text-sm mt-1">Lütfen 'İlerleme Kaydı' sekmesinden yeni bir kayıt ekleyin.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 gap-4">
                      {progressData.map((entry) => (
                          <div
                              key={entry.id}
                              onClick={() => handleSelectProgressRecord(entry)}
                              className="bg-blue-50 p-4 rounded-lg shadow-md border-l-4 border-blue-400 cursor-pointer hover:bg-blue-100 transition-colors duration-200 flex justify-between items-center"
                          >
                              <div>
                                  <p className="text-sm text-gray-600 font-bold">{entry.date}</p>
                                  <p className="text-lg font-semibold text-gray-800">{entry.name || 'İsimsiz İlerleme'}</p>
                              </div>
                              <button
                                  type="button"
                                  className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold hover:bg-blue-700 transition-colors duration-200"
                                  onClick={(e) => { e.stopPropagation(); handleSelectProgressRecord(entry); }} // Prevent parent div click
                              >
                                  <i className="fas fa-check mr-1"></i> Seç
                              </button>
                          </div>
                      ))}
                  </div>
              )
          )}
          {isTyping && currentTypingMessage.length > 0 && activeChatTab === 'chat' && (
            <div className="flex justify-start mb-4">
              <div className="max-w-[80%] p-4 rounded-3xl bg-gray-200 text-gray-800 shadow-md self-start rounded-bl-none animate-pulse-fade">
                <TypingEffect text={currentTypingMessage} />
                <span className="animate-blink">|</span> {/* Typing cursor with blink */}
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className={`p-4 border-t border-gray-200 bg-white ${isPopup ? 'rounded-b-xl' : 'rounded-b-none'}`}>
          <div className="flex space-x-2">
            <input
              type="text"
              className="flex-grow border border-gray-300 rounded-full py-3 px-5 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              placeholder={selectedProgressForAI ? `"${selectedProgressForAI.name}" kaydı hakkında mesaj yazın...` : "Mesajınızı yazın..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isTyping || activeChatTab === 'progressRecords'} // Disable input when on progress records tab
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isTyping || !inputMessage.trim() || activeChatTab === 'progressRecords'} // Disable button when on progress records tab
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </form>
        {/* Custom CSS for scrollbar and animations */}
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #aab8c2; /* Light gray for thumb */
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #8899a6;
          }
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out forwards;
          }
          @keyframes pulse-fade {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
          }
          .animate-pulse-fade {
            animation: pulse-fade 1.5s infinite ease-in-out;
          }
          @keyframes blink {
            0%, 49% { opacity: 1; }
            50%, 100% { opacity: 0; }
          }
          .animate-blink {
            animation: blink 0.7s step-end infinite;
          }
        `}</style>
      </div>
    );
  }); // Wrapped with React.memo

  // AI Mock Exam Component
  const AIMockExam = React.memo(({ profile, pseudoUserId }) => {
    const [examRequest, setExamRequest] = useState({ subject: '', topic: '', numQuestions: 5 });
    const [generatedExam, setGeneratedExam] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // New state for current question
    const [userAnswers, setUserAnswers] = useState({});
    const [examResults, setExamResults] = useState(null);
    const [message, setMessage] = useState('');
    const [examLoading, setExamLoading] = useState(false);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    // Memoize availableSubjects to prevent unnecessary re-renders of this component
    const memoizedAvailableSubjects = useMemo(() => {
        return profile?.class ? getSubjectsForClass(profile.class) : [];
    }, [profile?.class]);

    // Determine number of options based on class
    const getNumOptions = useCallback(() => {
        const studentClass = parseInt(profile?.class);
        if (studentClass >= 1 && studentClass <= 4) {
            return 3; // A, B, C
        }
        return 4; // A, B, C, D (for 5th grade and above, including Mezun)
    }, [profile?.class]);

    const handleGenerateExam = async () => {
      setMessage('');
      setExamLoading(true);
      setGeneratedExam(null);
      setCurrentQuestionIndex(0); // Reset to first question
      setUserAnswers({});
      setExamResults(null);

      if (!profile?.class) {
        setMessage("Deneme oluşturmak için lütfen profilinizden sınıfınızı belirtin.");
        setExamLoading(false);
        return;
      }

      const numOptions = getNumOptions(); // Get dynamic number of options
      const optionLetters = ['A', 'B', 'C', 'D'].slice(0, numOptions); // Get corresponding letters

      // Add class information and desired number of options to the prompt
      const prompt = `Lütfen ${profile.class}. sınıf seviyesine uygun olarak ${examRequest.subject} dersinden, ${examRequest.topic || 'genel'} konusundan, ${examRequest.numQuestions} adet çoktan seçmeli sınav sorusu oluştur. Her soru için ${numOptions} seçenek (${optionLetters.join(', ')}) ve doğru cevabı belirt. Ayrıca her sorunun **ayrıntılı çözümünü** de ekle. Format her zaman geçerli bir JSON array'i olmalı. JSON array'i, her biri "question" (soru metni), "options" (dört elemanlı string array'i), "answer" (A, B, C veya D) ve "explanation" (ayrıntılı çözüm metni) anahtarlarını içeren objelerden oluşmalı. Örnek: [{"question": "Türkiye'nin başkenti neresidir?", "options": ["A) Ankara", "B) İstanbul", "C) İzmir", "D) Bursa"], "answer": "A", "explanation": "Türkiye'nin başkenti Ankara'dır çünkü..."}]`;

      try {
        const apiKey = "AIzaSyC_klt6i2LBaZUo6YRHDg4f0Z1kj7NWKac"; 
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
                            "minItems": numOptions, 
                            "maxItems": numOptions 
                        },
                        "answer": { "type": "STRING", "enum": optionLetters }, 
                        "explanation": { "type": "STRING" } // Added explanation field
                    },
                    "propertyOrdering": ["question", "options", "answer", "explanation"]
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
            if (Array.isArray(examData) && examData.every(q => q.question && Array.isArray(q.options) && q.options.length === numOptions && optionLetters.includes(q.answer) && q.explanation)) {
                setGeneratedExam(examData);
            } else {
                setMessage("AI tarafından oluşturulan deneme formatı geçersiz. Lütfen tekrar deneyin. (Eksik alanlar veya yanlış şık sayısı)");
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
      setUserAnswers(prev => ({ ...prev, [questionIndex]: selectedOption })); 
    };

    const handleClearAnswer = (questionIndex) => {
      setUserAnswers(prev => {
        const newAnswers = { ...prev };
        delete newAnswers[questionIndex]; // Remove the answer for this question
        return newAnswers;
      });
    };

    const handleNextQuestion = () => {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    };

    const handlePreviousQuestion = () => {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
    };

    const handleSubmitExam = async () => {
      if (!generatedExam || !pseudoUserId) return; 

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
        // Save the full exam and user answers for review in analysis
        examQuestions: generatedExam,
        userAnswers: userAnswers
      };

      setExamResults(examResultData);

      // Save exam results to Firestore (in mockExams collection and also update progress)
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'mockExams'), examResultData); 

        // Also add/update total progress in `progress` collection (or an aggregate document)
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'progress'), { 
            name: `${examResultData.subject} (Deneme)`, 
            date: examResultData.date,
            entries: [{ 
                subject: `${examResultData.subject} (Deneme)`, 
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
      <div className="p-6 md:p-8 bg-gradient-to-br from-purple-50 to-pink-100 min-h-[calc(100vh-64px)] rounded-xl"> 
        <h2 className="text-3xl font-extrabold text-gray-800 mb-8 text-center">Yapay Zeka Deneme Sınavı</h2>

        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-4xl mx-auto border-t-8 border-purple-600"> 
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Deneme Oluştur</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="examSubject">
                Ders
              </label>
              <select
                id="examSubject"
                className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
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
                className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
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
                className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
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
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={examLoading || !examRequest.subject || !profile?.class} 
            >
              {examLoading ? (
                <><i className="fas fa-spinner fa-spin mr-2"></i>Deneme Oluşturuluyor...</>
              ) : (
                <><i className="fas fa-magic mr-2"></i>Deneme Oluştur</>
              )}
            </button>
          </div>
          {message && <p className="text-center text-red-500 text-xs mt-4">{message}</p>}
        </div>

        {generatedExam && generatedExam.length > 0 && ( // Ensure exam has questions
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-4xl mx-auto mt-8 border-t-8 border-blue-600"> 
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Deneme Sınavı</h3>
            
            {/* Display current question */}
            <div className="mb-6 p-6 border border-gray-200 rounded-xl bg-gray-50 shadow-sm animate-fade-in">
              <p className="font-semibold text-gray-800 mb-4 text-lg">
                <span className="text-blue-600 mr-2">{currentQuestionIndex + 1}.</span> {generatedExam[currentQuestionIndex].question}
              </p>
              <div className="space-y-3">
                {generatedExam[currentQuestionIndex].options.map((option, oIndex) => (
                  <label key={oIndex} className="flex items-center text-gray-700 cursor-pointer p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200">
                    <input
                      type="radio"
                      name={`question-${currentQuestionIndex}`}
                      value={String.fromCharCode(65 + oIndex)} 
                      checked={userAnswers[currentQuestionIndex] === String.fromCharCode(65 + oIndex)}
                      onChange={() => handleAnswerChange(currentQuestionIndex, String.fromCharCode(65 + oIndex))}
                      className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-3 text-base">{option}</span>
                  </label>
                ))}
              </div>
              {/* Clear Answer Button */}
              {userAnswers[currentQuestionIndex] && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => handleClearAnswer(currentQuestionIndex)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-full text-sm shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
                  >
                    <i className="fas fa-eraser mr-2"></i>Cevabı Temizle
                  </button>
                </div>
              )}
            </div>

            {/* Navigation Buttons and Submit Exam Button */}
            <div className="flex justify-between mt-8">
              <button
                onClick={handlePreviousQuestion}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentQuestionIndex === 0}
              >
                <i className="fas fa-arrow-left mr-2"></i>Önceki Soru
              </button>
              <button
                  onClick={handleSubmitExam}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={analysisLoading}
                >
                  {analysisLoading ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i>Analiz Ediliyor...</>
                  ) : (
                    <><i className="fas fa-clipboard-check mr-2"></i>Denemeyi Bitir ve Analiz Et</>
                  )}
                </button>
              <button
                onClick={handleNextQuestion}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentQuestionIndex === generatedExam.length - 1}
              >
                Sonraki Soru <i className="fas fa-arrow-right ml-2"></i>
              </button>
            </div>
          </div>
        )}

        {examResults && (
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-4xl mx-auto mt-8 border-t-8 border-green-600"> 
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Deneme Sonuçlarınız</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-8">
                <div className="p-4 bg-green-50 rounded-lg shadow-sm border border-green-200">
                    <p className="text-lg text-green-700 font-semibold">Doğru</p>
                    <p className="text-4xl font-bold text-green-600">{examResults.correct}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg shadow-sm border border-red-200">
                    <p className="text-lg text-red-700 font-semibold">Yanlış</p>
                    <p className="text-4xl font-bold text-red-600">{examResults.incorrect}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg shadow-sm border border-yellow-200">
                    <p className="text-lg text-yellow-700 font-semibold">Boş</p>
                    <p className="text-4xl font-bold text-yellow-600">{examResults.blank}</p>
                </div>
            </div>
            <p className="text-xl text-gray-700 mb-6 text-center">Toplam Soru: <span className="font-bold text-gray-800">{examResults.totalQuestions}</span></p>
            
            <h4 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Detaylı Çözümler</h4>
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {generatedExam.map((q, qIndex) => (
                    <div key={qIndex} className={`mb-4 p-4 rounded-lg shadow-sm ${userAnswers[qIndex] === q.answer ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}`}>
                        <p className="font-medium text-gray-800 text-lg mb-2">{qIndex + 1}. {q.question}</p>
                        <p className="text-sm text-gray-600 mb-1">Seçtiğiniz: <span className="font-semibold">{userAnswers[qIndex] || 'Boş'}</span></p>
                        <p className="text-sm text-green-600 font-bold">Doğru Cevap: {q.answer}</p>
                        {userAnswers[qIndex] !== q.answer && userAnswers[qIndex] !== undefined && (
                            <p className="text-sm text-red-600 mt-1">Yanlış Cevapladınız.</p>
                        )}
                        {q.explanation && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <h5 className="font-semibold text-blue-700">Açıklama:</h5>
                                <p className="text-sm text-gray-700" dangerouslySetInnerHTML={formatTextWithMarkdown(q.explanation)}></p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }); // Wrapped with React.memo

  // AI Topic Explanation Component - Now Chat-like
  const AITopicExplanation = React.memo(({ pseudoUserId, aiTopicHistory, setAiTopicHistory, profile }) => { // Added profile prop
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
      
      // Add user's class information to the prompts
      const classLevel = profile?.class ? `${profile.class}. sınıf seviyesine uygun olarak ` : '';

      // Try to extract subject and topic from *every* message to allow dynamic topic changes
      const extractionPrompt = `Kullanıcının bu mesajından akademik ders konusunu ve ilgili başlığını (konuyu) çıkar. Eğer açıkça bir ders ve konu belirtilmişse, JSON formatında yanıtla: {'subject': 'Belirtilen Ders', 'topic': 'Belirtilen Konu'}. Örneğin: {'subject': 'Matematik', 'topic': 'Fonksiyonlar'}. Eğer akademik bir ders ve konu tespit edemezsen, {'subject': null, 'topic': null} olarak yanıtla. Kullanıcının mesajı: "${userMessage.text}"`;
      
      const extractionPayload = {
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

      try {
        const apiKey = "AIzaSyC_klt6i2LBaZUo6YRHDg4f0Z1kj7NWKac"; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        // First, try to extract subject and topic
        const extractionResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extractionPayload)
        });

        const extractionResult = await extractionResponse.json();
        let parsedContext = { subject: null, topic: null };

        if (extractionResult.candidates && extractionResult.candidates.length > 0 &&
            extractionResult.candidates[0].content && extractionResult.candidates[0].content.parts &&
            extractionResult.candidates[0].content.parts.length > 0) {
          try {
            parsedContext = JSON.parse(extractionResult.candidates[0].content.parts[0].text);
          } catch (e) {
            console.warn("Konu/Ders JSON parse hatası, düz metin olarak devam edilecek.");
          }
        }

        // Determine the actual prompt based on parsed context
        if (parsedContext.subject && parsedContext.topic) {
          setCurrentSubject(parsedContext.subject);
          setCurrentTopic(parsedContext.topic);
          aiPrompt = `${classLevel}${parsedContext.subject} dersinden, ${parsedContext.topic} konusu hakkında kısa ve öz, maksimum 3-4 cümle uzunluğunda bir konu anlatımı yap. Maddeler halinde veya anahtar noktaları vurgulayarak biçimlendir (örneğin **kalın**, *italik* kullan). Bu konuya odaklan.`;
        } else {
          // If no specific subject/topic is detected or it's a non-academic query
          aiPrompt = "Bu bölümde sadece akademik konulara ve belirtilen konuya odaklanıyorum. Genel veya akademik olmayan sorularınız için lütfen AI Koç bölümünü kullanın. Hangi dersin hangi konusunu öğrenmek istediğinizi açıkça belirtir misiniz? Örneğin: 'Fizikten Optik' veya 'Kimyadan Periyodik Tablo'.";
          setCurrentSubject(null); // Reset subject/topic if it's not academic or unclear
          setCurrentTopic(null);
        }

        // Filter and map previous messages for API, ensuring 'parts' are not empty
        const chatForAI = aiTopicHistory.slice(-9).flatMap(msg => {
          if (typeof msg.text === 'string' && msg.text.trim().length > 0) {
            return [{ role: msg.role, parts: [{ text: msg.text }] }];
          }
          return [];
        });
        chatForAI.push({ role: "user", parts: [{ text: aiPrompt }] });

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: chatForAI })
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
          setCurrentTypingMessage(aiResponseText);
        } else {
          const errorMessage = { role: 'model', text: "Üzgünüm, şu an cevap veremiyorum. Lütfen daha sonra tekrar deneyin. (AI boş/geçersiz yanıt verdi)", timestamp: Date.Now() };
          setAiTopicHistory(prev => [...prev, errorMessage]);
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiTopicHistory'), errorMessage);
        }
      } catch (error) {
        console.error("Konu anlatımı sohbetinde hata:", error);
        const errorMessage = { role: 'model', text: "Bir hata oluştu, lütfen daha sonra tekrar deneyin. (Bağlantı sorunu olabilir)", timestamp: Date.Now() };
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
      <div className="p-6 md:p-8 bg-gradient-to-br from-red-50 to-orange-100 min-h-[calc(100vh-64px)] rounded-xl"> 
        <h2 className="text-3xl font-extrabold text-gray-800 mb-8 text-center">Yapay Zeka Konu Anlatımı</h2>

        {/* Changed height to 700px for consistency */}
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-4xl mx-auto border-t-8 border-red-600 flex flex-col h-[700px]"> 
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                Konu Anlatımı Sohbeti {currentSubject && currentTopic ? `(${currentSubject} - ${currentTopic})` : ''}
            </h3>
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 border border-gray-200 rounded-xl bg-gray-50 shadow-inner mb-6 custom-scrollbar"> 
                {aiTopicHistory.length === 0 && !isTyping ? (
                    <div className="text-center text-gray-500 italic p-4">
                        <i className="fas fa-book-open text-4xl text-red-300 mb-2"></i>
                        <p>Merhaba! Hangi dersin hangi konusunu öğrenmek istersiniz?</p>
                        <p className="text-sm mt-1">Örneğin: 'Matematikten Üslü Sayılar' veya 'Fizikten Kuvvet ve Hareket'.</p>
                        {profile?.class ? '' : <span className="block mt-2 font-semibold text-red-500">Daha doğru sonuçlar için lütfen profilinizden sınıfınızı belirtin.</span>}
                    </div>
                ) : (
                    aiTopicHistory.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] p-4 rounded-3xl shadow-md animate-fade-in ${
                                    msg.role === 'user'
                                        ? 'bg-blue-500 text-white self-end rounded-br-none'
                                        : 'bg-gray-200 text-gray-800 self-start rounded-bl-none'
                                }`}
                            >
                                <p dangerouslySetInnerHTML={formatTextWithMarkdown(msg.text)}></p>
                                <span className="block text-xs text-right text-opacity-75 mt-2">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))
                )}
                {isTyping && currentTypingMessage.length > 0 && (
                  <div className="flex justify-start mb-4">
                    <div className="max-w-[80%] p-4 rounded-3xl bg-gray-200 text-gray-800 shadow-md self-start rounded-bl-none animate-pulse-fade">
                      <TypingEffect text={currentTypingMessage} />
                      <span className="animate-blink">|</span> {/* Typing cursor with blink */}
                    </div>
                  </div>
                )}
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        className="flex-grow border border-gray-300 rounded-full py-3 px-5 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:focus:ring-red-500 transition-all duration-300"
                        placeholder={currentSubject && currentTopic ? "Konu hakkında soru sorun..." : "Ders ve konuyu belirtin (örnek: Kimyadan Periyodik Tablo)..."}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        disabled={isTyping}
                    />
                    <button
                        type="submit"
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isTyping || !inputMessage.trim()}
                    >
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </div>
                {message && <p className="text-center text-red-500 text-xs mt-2">{message}</p>}
            </form>
            {/* Custom scrollbar style and animations (same as AICoachChat) */}
            <style>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #aab8c2;
                border-radius: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #8899a6;
              }
              @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in {
                animation: fade-in 0.3s ease-out forwards;
              }
              @keyframes pulse-fade {
                0% { opacity: 0.7; }
                50% { opacity: 1; }
                100% { opacity: 0.7; }
              }
              .animate-pulse-fade {
                animation: pulse-fade 1.5s infinite ease-in-out;
              }
              @keyframes blink {
                0%, 49% { opacity: 1; }
                50%, 100% { opacity: 0; }
              }
              .animate-blink {
                animation: blink 0.7s step-end infinite;
              }
            `}</style>
        </div>
      </div>
    );
  }); // Wrapped with React.memo


  // AI Question Solving Component
  const AISoruCozumu = React.memo(({ pseudoUserId, aiSoruCozumuHistory, setAiSoruCozumuHistory, profile }) => {
    const [inputMessage, setInputMessage] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
    const chatContainerRef = useRef(null);
    const [isTyping, setIsTyping] = useState(false);
    const [currentTypingMessage, setCurrentTypingMessage] = useState('');

    useEffect(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, [aiSoruCozumuHistory, currentTypingMessage]);

    // Helper function to convert image to Base64
    const convertImageToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result.split(',')[1]); // Get base64 string
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreviewUrl(URL.createObjectURL(file));
        } else {
            setImageFile(null);
            setImagePreviewUrl(null);
        }
    };

    const handleSendMessage = async (e) => {
      e.preventDefault();
      if ((!inputMessage.trim() && !imageFile) || !pseudoUserId) {
        console.warn("Mesaj gönderilemedi: Giriş boş (metin veya resim) veya kullanıcı kimliği yok.");
        return;
      }

      const userMessage = { 
        role: 'user', 
        text: inputMessage, 
        timestamp: Date.now(),
        imageUrl: imagePreviewUrl // Save image URL for display
      };
      setAiSoruCozumuHistory(prev => [...prev, userMessage]);
      setInputMessage('');
      setImageFile(null); // Clear image input after sending
      setImagePreviewUrl(null); // Clear image preview after sending
      setIsTyping(true);
      setCurrentTypingMessage('');

      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiSoruCozumuHistory'), userMessage);
      } catch (error) {
        console.error("Kullanıcı mesajı kaydedilirken hata:", error);
        setAiSoruCozumuHistory(prev => [...prev, { role: 'model', text: "Mesajınız kaydedilemedi. Bir hata oluştu.", timestamp: Date.now() }]);
      }

      const classInfo = profile?.class ? `Kullanıcının sınıfı: ${profile.class}. Sınıf. ` : '';
      
      const parts = [];
      if (inputMessage.trim()) {
        parts.push({ text: `${classInfo} Kullanıcının sorusu: "${inputMessage}". Bu soruyu adım adım açıklayarak çöz. Yanıtın kısa ve öz, maksimum 3-4 cümle uzunluğunda olsun. Maddeler halinde veya anahtar noktaları vurgulayarak biçimlendir (örneğin **kalın**, *italik* kullan).` });
      } else if (classInfo) { // If only image, still include class info
          parts.push({ text: `${classInfo} Bu resimdeki soruyu adım adım açıklayarak çöz. Yanıtın kısa ve öz, maksimum 3-4 cümle uzunluğunda olsun. Maddeler halinde veya anahtar noktaları vurgulayarak biçimlendir (örneğin **kalın**, *italik* kullan).` });
      } else { // No text, no class info, just image. Default prompt.
          parts.push({ text: `Bu resimdeki soruyu adım adım açıklayarak çöz. Yanıtın kısa ve öz, maksimum 3-4 cümle uzunluğunda olsun. Maddeler halinde veya anahtar noktaları vurgulayarak biçimlendir (örneğin **kalın**, *italik* kullan).` });
      }


      if (imageFile) {
          const base64ImageData = await convertImageToBase64(imageFile);
          parts.push({
              inlineData: {
                  mimeType: imageFile.type,
                  data: base64ImageData
              }
          });
      }
      
      // Filter and map previous messages for API, ensuring 'parts' are not empty.
      // For AISoruCozumu, historical image messages are not re-sent as inlineData to API.
      // Only their text content (if any) is included in history sent to API.
      const chatForAI = aiSoruCozumuHistory.slice(-9).flatMap(msg => {
          const chatParts = [];
          // Only include if msg.text is a non-empty string after trimming whitespace.
          if (typeof msg.text === 'string' && msg.text.trim().length > 0) {
              chatParts.push({ text: msg.text });
          }
          // No else if for msg.imageUrl here, as historical images are not re-sent as inlineData to the API.
          // The imageUrl is primarily for display in the chat UI.

          if (chatParts.length > 0) {
              return [{ role: msg.role, parts: chatParts }];
          }
          return []; // Filter out messages that would have empty parts
      });
      // Add the current message (text + image if any)
      chatForAI.push({ role: "user", parts: parts });

      try {
        const apiKey = "AIzaSyC_klt6i2LBaZUo6YRHDg4f0Z1kj7NWKac"; 
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
              setAiSoruCozumuHistory(prev => [...prev, errorMessage]);
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiSoruCozumuHistory'), errorMessage);
              return;
        }

        const result = await response.json();
        if (result.error) {
              const errorMessage = { role: 'model', text: `API Hatası: ${result.error.message || 'Bilinmeyen bir hata oluştu.'}`, timestamp: Date.now() };
              setAiSoruCozumuHistory(prev => [...prev, errorMessage]);
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiSoruCozumuHistory'), errorMessage);
              return;
        }

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
          const aiResponseText = result.candidates[0].content.parts[0].text;
          setCurrentTypingMessage(aiResponseText);
        } else {
          const errorMessage = { role: 'model', text: "Üzgünüm, şu an cevap veremiyorum. Lütfen daha sonra tekrar deneyin. (AI boş/geçersiz yanıt verdi)", timestamp: Date.now() };
          setAiSoruCozumuHistory(prev => [...prev, errorMessage]);
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiSoruCozumuHistory'), errorMessage);
        }
      } catch (error) {
        console.error("AI ile iletişimde hata:", error);
        const errorMessage = { role: 'model', text: "Bir hata oluştu, lütfen daha sonra tekrar deneyin. (Bağlantı sorunu olabilir)", timestamp: Date.now() };
        setAiSoruCozumuHistory(prev => [...prev, errorMessage]);
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiSoruCozumuHistory'), errorMessage);
      } finally {
        // Typing effect will handle setting setIsTyping to false
      }
    };

    // Effect to handle typing animation and final message addition for question solving
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
            setAiSoruCozumuHistory(prev => [...prev, aiMessage]); 
            addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiSoruCozumuHistory'), aiMessage)
              .catch(error => console.error("AI yanıtı kaydedilirken hata:", error));
            setIsTyping(false);
            setCurrentTypingMessage('');
          }
        }, 30); // Typing speed
      }

      return () => clearInterval(timer);
    }, [isTyping, currentTypingMessage, pseudoUserId, setAiSoruCozumuHistory]);

    return (
      <div className="p-6 md:p-8 bg-gradient-to-br from-yellow-50 to-orange-100 min-h-[calc(100vh-64px)] rounded-xl"> 
        <h2 className="text-3xl font-extrabold text-gray-800 mb-8 text-center">Yapay Zeka Soru Çözümü</h2>

        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-4xl mx-auto border-t-8 border-orange-600 flex flex-col h-[700px]"> 
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                Soru Çözümü Sohbeti
            </h3>
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 border border-gray-200 rounded-xl bg-gray-50 shadow-inner mb-6 custom-scrollbar"> 
                {aiSoruCozumuHistory.length === 0 && !isTyping ? (
                    <div className="text-center text-gray-500 italic p-4">
                        <i className="fas fa-question-circle text-4xl text-orange-300 mb-2"></i>
                        <p>Merhaba! Çözmek istediğiniz soruyu bana yazın veya resmini yükleyin. Adım adım açıklayarak size yardımcı olacağım.</p>
                        <p className="text-sm mt-1">Örneğin: 'Matematik sorusu: $3x + 5 = 14$ denklemini çöz.' veya bir resim yükleyerek.</p>
                    </div>
                ) : (
                    aiSoruCozumuHistory.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] p-4 rounded-3xl shadow-md animate-fade-in ${
                                    msg.role === 'user'
                                        ? 'bg-blue-500 text-white self-end rounded-br-none'
                                        : 'bg-gray-200 text-gray-800 self-start rounded-bl-none'
                                }`}
                            >
                                {msg.imageUrl && (
                                    <img src={msg.imageUrl} alt="Uploaded problem" className="max-w-full h-auto rounded-lg mb-2" />
                                )}
                                {msg.text && <p dangerouslySetInnerHTML={formatTextWithMarkdown(msg.text)}></p>}
                                <span className="block text-xs text-right text-opacity-75 mt-2">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))
                )}
                {isTyping && currentTypingMessage.length > 0 && (
                  <div className="flex justify-start mb-4">
                    <div className="max-w-[80%] p-4 rounded-3xl bg-gray-200 text-gray-800 shadow-md self-start rounded-bl-none animate-pulse-fade">
                      <TypingEffect text={currentTypingMessage} />
                      <span className="animate-blink">|</span> {/* Typing cursor with blink */}
                    </div>
                  </div>
                )}
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
                {imagePreviewUrl && (
                    <div className="mb-4">
                        <img src={imagePreviewUrl} alt="Image Preview" className="max-w-[150px] h-auto rounded-lg mx-auto mb-2 border border-gray-300" />
                    </div>
                )}
                <div className="flex flex-col space-y-3">
                    <input
                        type="file"
                        id="image-upload-soru-cozumu"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-orange-50 file:text-orange-700
                        hover:file:bg-orange-100"
                        disabled={isTyping}
                    />
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            className="flex-grow border border-gray-300 rounded-full py-3 px-5 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-300"
                            placeholder="Sorunuzu yazın veya çözüm hakkında soru sorun..."
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            disabled={isTyping}
                        />
                        <button
                            type="submit"
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isTyping || (!inputMessage.trim() && !imageFile)}
                        >
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </form>
            <style>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #aab8c2;
                border-radius: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #8899a6;
              }
              @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in {
                animation: fade-in 0.3s ease-out forwards;
              }
              @keyframes pulse-fade {
                0% { opacity: 0.7; }
                50% { opacity: 1; }
                100% { opacity: 0.7; }
              }
              .animate-pulse-fade {
                animation: pulse-fade 1.5s infinite ease-in-out;
              }
              @keyframes blink {
                0%, 49% { opacity: 1; }
                50%, 100% { opacity: 0; }
              }
              .animate-blink {
                animation: blink 0.7s step-end infinite;
              }
            `}</style>
        </div>
      </div>
    );
  });


  function App() {
    const [user, setUser] = useState(null); 
    const [pseudoUserId, setPseudoUserId] = useState(null); 
    const [isAuthReady, setIsAuthReady] = useState(false); // Auth state initialized
    const [profile, setProfile] = useState(null); 
    const [isProfileLoaded, setIsProfileLoaded] = useState(false); // New: Has profile data been fetched at least once?

    const [progressData, setProgressData] = useState([]); 
    const [aiChatHistory, setAiChatHistory] = useState([]); 
    const [aiTopicHistory, setAiTopicHistory] = useState([]); // New state for AI Topic Chat History
    const [aiSoruCozumuHistory, setAiSoruCozumuHistory] = useState([]); // New state for AI Soru Çözümü Chat History
    const [aiRecommendations, setAiRecommendations] = useState(""); 
    const [showAiCoachPopup, setShowAiCoachPopup] = useState(false); 
    const [activeTab, setActiveTab] = useState('dashboard'); 
    const [editingProgressEntry, setEditingProgressEntry] = useState(null); 

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [modalAction, setModalAction] = useState(null); 
    const [modalMessage, setModalMessage] = useState('');
    const [appError, setAppError] = useState(null); 

    // State for the AI History Clear Modal
    const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
    const [clearHistoryMessage, setClearHistoryMessage] = useState('');

    // State for mobile menu
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


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
        const apiKey = "AIzaSyC_klt6i2LBaZUo6YRHDg4f0Z1kj7NWKac"; // Corrected API Key
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
    }, []); // Removed setEditingProgressEntry and setActiveTab from dependencies, as they are state setters and stable

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

    // Function to trigger the AI History Clear Modal
    const handleClearAIHistoryRequest = useCallback(() => {
      setShowClearHistoryModal(true);
      setClearHistoryMessage("Silmek istediğiniz AI geçmiş(lerini) seçin:");
    }, []);

    // Function to handle the actual deletion of AI history
    const handleClearAIHistoryConfirm = useCallback(async (selectedHistories) => {
        if (!pseudoUserId) {
            setAppError("Kullanıcı kimliği bulunamadı, AI geçmişi silinemedi.");
            setShowClearHistoryModal(false);
            return;
        }
        if (selectedHistories.length === 0) {
            setAppError("Silmek için hiçbir geçmiş türü seçilmedi.");
            setShowClearHistoryModal(false);
            return;
        }

        const historyMap = {
            aiChatHistory: setAiChatHistory,
            aiTopicHistory: setAiTopicHistory,
            aiSoruCozumuHistory: setAiSoruCozumuHistory
        };

        let successMessages = [];
        let errorMessages = [];

        for (const historyType of selectedHistories) {
            try {
                const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, historyType);
                const q = query(collectionRef); // No orderBy for deletion to avoid index issues
                const querySnapshot = await getDocs(q);

                const deletePromises = [];
                querySnapshot.forEach((doc) => {
                    deletePromises.push(deleteDoc(doc.ref));
                });
                await Promise.all(deletePromises);

                historyMap[historyType]([]); // Clear the local state
                successMessages.push(`${historyType} geçmişi başarıyla silindi.`);
            } catch (error) {
                console.error(`Error deleting ${historyType} history:`, error);
                errorMessages.push(`${historyType} geçmişi silinirken hata oluştu: ${error.message}`);
            }
        }

        if (errorMessages.length > 0) {
            setAppError(errorMessages.join('\n'));
        } else {
            // No direct alert, so maybe update a temporary message in the UI or console log.
            console.log("Tüm seçili AI geçmişleri başarıyla silindi.");
            // Or, if there's a dedicated success message display for App:
            // setAppSuccessMessage("Seçili AI geçmişleri başarıyla silindi.");
        }
        setShowClearHistoryModal(false);
    }, [pseudoUserId, setAppError, setAiChatHistory, setAiTopicHistory, setAiSoruCozumuHistory]);


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
            setAiSoruCozumuHistory([]); // Clear AI Soru Çözümü history
            setAiRecommendations('');
          }
        });

        return () => unsubscribeAuth();
      } catch (error) {
        console.error("Firebase başlatılırken hata oluştu:", error);
        setAppError(`Uygulama başlatılırken kritik hata: ${error.message}`);
        setIsAuthReady(true); // Still mark as ready to prevent infinite loading state
        setIsProfileLoaded(true); // Allow rendering of login page even if Firebase init fails
      }
    }, []); 

    // 2. Firestore dinleyicilerini kurma (db ve pseudoUserId'ye bağlı)
    useEffect(() => {
        let unsubscribeProfile, unsubscribeProgress, unsubscribeChat, unsubscribeTopicChat, unsubscribeSoruCozumu;

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

            // AI Soru Çözümü Geçmişi Dinleyicisi
            const soruCozumuCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'users', pseudoUserId, 'aiSoruCozumuHistory');
            unsubscribeSoruCozumu = onSnapshot(query(soruCozumuCollectionRef, orderBy('timestamp')), (snapshot) => {
                const newHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAiSoruCozumuHistory(newHistory);
            }, (error) => {
                console.error("AI soru çözümü geçmişi çekilirken hata oluştu:", error);
                setAppError(`AI soru çözümü geçmişi yüklenirken hata: ${error.message}`);
            });

        } else {
          // pseudoUserId null ise dinleyicileri temizle ve verileri sıfırla (eğer zaten sıfırlanmamışsa)
          setProfile(null); // Profil null
          setIsProfileLoaded(false); // Profilin yüklü olmadığını işaretle
          setProgressData([]);
          setAiChatHistory([]);
          setAiTopicHistory([]);
          setAiSoruCozumuHistory([]); // Clear AI Soru Çözümü history
        }
        
        return () => {
          // pseudoUserId veya db değiştiğinde eski dinleyicileri temizle
          if (unsubscribeProfile) unsubscribeProfile();
          if (unsubscribeProgress) unsubscribeProgress();
          if (unsubscribeChat) unsubscribeChat();
          if (unsubscribeTopicChat) unsubscribeTopicChat(); 
          if (unsubscribeSoruCozumu) unsubscribeSoruCozumu();
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
            {/* Desktop Navigation */}
            <div className="hidden md:flex flex-wrap justify-center md:space-x-6 space-x-2">
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
                <i className="fas fa-robot mr-2"></i>AI Koç
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
                onClick={() => setActiveTab('aiSoruCozumu')}
                className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 ${
                  activeTab === 'aiSoruCozumu' ? 'bg-blue-500 text-white shadow-md' : 'text-blue-200 hover:text-white'
                }`}
              >
                <i className="fas fa-lightbulb mr-2"></i>AI Soru Çözümü
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
            {/* Hamburger Icon for Mobile */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white focus:outline-none text-2xl">
                <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-blue-900 bg-opacity-95 z-50 flex flex-col items-center justify-center space-y-8 animate-slide-in-right">
            {/* Close Button */}
            <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-4 right-4 text-white text-3xl focus:outline-none">
              <i className="fas fa-times"></i>
            </button>
            {/* Menu Items */}
            <button
              onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
              className="text-white text-2xl font-semibold hover:text-blue-200 transition-colors duration-300"
            >
              <i className="fas fa-home mr-3"></i>Kontrol Paneli
            </button>
            <button
              onClick={() => { setActiveTab('progress'); setIsMobileMenuOpen(false); }}
              className="text-white text-2xl font-semibold hover:text-blue-200 transition-colors duration-300"
            >
              <i className="fas fa-chart-line mr-3"></i>İlerleme Kaydı
            </button>
            <button
              onClick={() => { setActiveTab('aiCoach'); setIsMobileMenuOpen(false); }}
              className="text-white text-2xl font-semibold hover:text-blue-200 transition-colors duration-300"
            >
              <i className="fas fa-robot mr-3"></i>AI Koç
            </button>
            <button
              onClick={() => { setActiveTab('aiMock'); setIsMobileMenuOpen(false); }}
              className="text-white text-2xl font-semibold hover:text-blue-200 transition-colors duration-300"
            >
              <i className="fas fa-clipboard-list mr-3"></i>AI Deneme
            </button>
            <button
              onClick={() => { setActiveTab('aiTopic'); setIsMobileMenuOpen(false); }}
              className="text-white text-2xl font-semibold hover:text-blue-200 transition-colors duration-300"
            >
              <i className="fas fa-book-open mr-3"></i>AI Konu Anlatımı
            </button>
            <button
              onClick={() => { setActiveTab('aiSoruCozumu'); setIsMobileMenuOpen(false); }}
              className="text-white text-2xl font-semibold hover:text-blue-200 transition-colors duration-300"
            >
              <i className="fas fa-lightbulb mr-3"></i>AI Soru Çözümü
            </button>
            <button
              onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }}
              className="text-white text-2xl font-semibold hover:text-blue-200 transition-colors duration-300"
            >
              <i className="fas fa-user-circle mr-3"></i>Profilim
            </button>
            <button
              onClick={async () => {
                try {
                  await signOut(auth);
                  setActiveTab('dashboard');
                  setIsMobileMenuOpen(false);
                } catch (error) {
                  console.error("Çıkış yaparken hata:", error);
                  setAppError(`Çıkış sırasında hata: ${error.message}`);
                }
              }}
              className="text-red-300 text-2xl font-semibold hover:text-red-100 transition-colors duration-300"
            >
              <i className="fas fa-sign-out-alt mr-3"></i>Çıkış Yap
            </button>
          </div>
        )}

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
            {activeTab === 'profile' && <Profile key="profile-component" profile={profile} user={user} pseudoUserId={pseudoUserId} handleClearAIHistoryRequest={handleClearAIHistoryRequest} />}
            {activeTab === 'progress' && <ProgressEntry key="progress-component" profile={profile} pseudoUserId={pseudoUserId} progressData={progressData} editingProgressEntry={editingProgressEntry} setEditingProgressEntry={setEditingProgressEntry} handleDeleteProgress={handleDeleteProgress} handleEditProgress={handleEditProgress} />}
            {activeTab === 'aiCoach' && <AICoachChat key="main-ai-coach" pseudoUserId={pseudoUserId} aiChatHistory={aiChatHistory} setAiChatHistory={setAiChatHistory} profile={profile} progressData={progressData} />} {/* Pass profile and progressData */}
            {activeTab === 'aiMock' && <AIMockExam key="ai-mock-component" profile={profile} pseudoUserId={pseudoUserId} />}
            {activeTab === 'aiTopic' && <AITopicExplanation key="ai-topic-component" pseudoUserId={pseudoUserId} aiTopicHistory={aiTopicHistory} setAiTopicHistory={setAiTopicHistory} profile={profile} />} {/* Pass profile */}
            {activeTab === 'aiSoruCozumu' && <AISoruCozumu key="ai-soru-cozumu-component" pseudoUserId={pseudoUserId} aiSoruCozumuHistory={aiSoruCozumuHistory} setAiSoruCozumuHistory={setAiSoruCozumuHistory} profile={profile} />}
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
            profile={profile} // Pass profile to popup too
            progressData={progressData} // Pass progressData to popup too
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
          <p className="text-xs text-gray-400 mt-2">&copy; {new Date().getFullYear()} Akademi Koçu Tüm hakları saklıdır.</p>
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

        {/* AI History Clear Modal */}
        <ClearHistoryModal
          show={showClearHistoryModal}
          message={clearHistoryMessage}
          onConfirm={handleClearAIHistoryConfirm}
          onCancel={() => setShowClearHistoryModal(false)}
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
            @keyframes slide-in-right {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
            .animate-slide-in-right {
                animation: slide-in-right 0.3s ease-out forwards;
            }
          `}
        </style>
      </div>
    );
  }

export default App;
