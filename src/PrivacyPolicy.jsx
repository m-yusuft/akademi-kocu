import React from 'react';

const PrivacyPolicy = () => {
  return (
    // Tailwind CSS'in 'prose' eklentisi, uzun metinler için otomatik olarak güzel stil sağlar.
    // max-w-none: İçeriğin genişliğini sınırlamaz, tam genişlik kullanır.
    // p-6 md:p-8: İç ve dış boşluklar.
    // bg-white rounded-xl shadow-lg: Beyaz arka plan, yuvarlak köşeler ve gölge.
    // mx-auto my-8: Sayfayı ortalar ve dikey boşluk verir.
    <div className="prose max-w-none p-6 md:p-8 bg-white rounded-xl shadow-lg mx-auto my-8">
      {/* Markdown içeriği JSX olarak buraya dönüştürüldü */}
      <h1>Akademi Koçu Gizlilik Politikası ve Veri İşleme Bilgilendirmesi</h1>

      <p><strong>Son Güncelleme Tarihi:</strong> 14 Haziran 2025</p>

      <p>Akademi Koçu ("Uygulama", "Biz", "bizim"), kullanıcılarımızın gizliliğine büyük önem vermektedir. Bu gizlilik politikası, Uygulamayı kullandığınızda hangi kişisel verileri topladığımızı, bu verileri nasıl kullandığımızı, sakladığımızı ve paylaştığımızı açıklamaktadır. Uygulamayı kullanarak, bu politikada açıklanan uygulamaları kabul etmiş olursunuz.</p>

      <h2>1. Topladığımız Bilgiler</h2>
      <p>Uygulama üzerinden toplanan kişisel veriler, doğrudan sizin tarafınızdan sağlanan bilgiler ve Uygulamayı kullanımınız sırasında otomatik olarak toplanan veriler olmak üzere iki ana kategoriye ayrılır:</p>

      <h3>A. Doğrudan Sağladığınız Bilgiler</h3>
      <ul>
        <li><strong>Kayıt ve Profil Bilgileri:</strong>
          <ul>
            <li><strong>E-posta Adresi:</strong> Hesap oluşturmak ve giriş yapmak için kullanılır.</li>
            <li><strong>Parola:</strong> Hesabınızın güvenliğini sağlamak için şifrelenmiş olarak saklanır.</li>
            <li><strong>Adınız Soyadınız:</strong> Uygulama içinde sizi tanımak ve kişiselleştirilmiş bir deneyim sunmak için kullanılır.</li>
            <li><strong>Sınıfınız:</strong> Akademik koçluk, ders önerileri ve deneme sınavlarının seviyesini belirlemek için kullanılır.</li>
            <li><strong>Doğum Tarihi:</strong> Yaş doğrulaması ve demografik analizler için kullanılır.</li>
          </ul>
        </li>
        <li><strong>İlerleme ve Performans Verileri:</strong>
          <ul>
            <li><strong>Ders Çalışma Kayıtları:</strong> Hangi dersten kaç doğru, yanlış, boş yaptığınız gibi girdiğiniz tüm ilerleme verileri. Bu veriler, kişiselleştirilmiş analizler ve öneriler sunmak için kullanılır.</li>
            <li><strong>Deneme Sınavı Sonuçları:</strong> Yapay zeka tarafından oluşturulan denemelerde verdiğiniz cevaplar, doğru/yanlış/boş sayıları ve tahmini puan/sıralama bilgileri.</li>
          </ul>
        </li>
      </ul>

      <h3>B. Uygulamayı Kullanırken Otomatik Olarak Toplanan Bilgiler</h3>
      <ul>
        <li><strong>Yapay Zeka Etkileşim Geçmişi:</strong>
          <ul>
            <li><strong>AI Koç Sohbetleri:</strong> AI Koçu ile yaptığınız yazılı sohbetlerin içeriği.</li>
            <li><strong>AI Konu Anlatımı Sohbetleri:</strong> AI Konu Anlatımı bölümündeki sorularınız ve AI'ın verdiği yanıtlar.</li>
            <li><strong>AI Soru Çözümü Sohbetleri:</strong> AI Soru Çözümü bölümünde yüklediğiniz görseller ve yazdığınız metinler ile AI'ın çözümleri.</li>
          </ul>
          <p>Bu geçmişler, AI'ın size daha iyi hizmet vermesini, önceki konuşmaları hatırlamasını ve etkileşimleri analiz etmemizi sağlar.</p>
        </li>
        <li><strong>Kullanım Verileri:</strong> Uygulama içinde hangi özelliklere eriştiğiniz, ne kadar süre kullandığınız gibi anonimleştirilmiş veya toplu veriler. Bu veriler Uygulamanın performansını iyileştirmek için kullanılır.</li>
        <li><strong>Cihaz Bilgileri:</strong> Uygulamaya eriştiğiniz cihazın türü, işletim sistemi gibi teknik bilgiler.</li>
      </ul>

      <h2>2. Bilgilerinizi Nasıl Kullanıyoruz?</h2>
      <p>Topladığımız bilgileri aşağıdaki amaçlarla kullanırız:</p>
      <ul>
        <li><strong>Hesabınızı Yönetmek ve Hizmet Sunmak:</strong> Kayıt olmanızı, giriş yapmanızı ve Uygulamanın temel işlevlerini (profil, ilerleme takibi) kullanmanızı sağlamak.</li>
        <li><strong>Kişiselleştirilmiş Koçluk ve Destek Sağlamak:</strong> Sınıfınıza, ilerleme kayıtlarınıza ve AI etkileşimlerinize göre size özel çalışma önerileri, konu anlatımları ve soru çözümleri sunmak.</li>
        <li><strong>Uygulamayı İyileştirmek:</strong> Kullanım eğilimlerini analiz ederek Uygulamanın performansını, kullanılabilirliğini ve yeni özelliklerini geliştirmek.</li>
        <li><strong>Güvenlik ve Dolandırıcılığı Önleme:</strong> Hesap güvenliğini sağlamak ve olası kötüye kullanımları tespit etmek.</li>
        <li><strong>İletişim Kurmak:</strong> Hesabınızla ilgili önemli bildirimler yapmak veya destek sağlamak.</li>
      </ul>

      <h2>3. Bilgilerinizi Kimlerle Paylaşıyoruz?</h2>
      <p>Kişisel verileriniz aşağıdaki durumlar dışında üçüncü taraflarla paylaşılmaz veya satılmaz:</p>
      <ul>
        <li><strong>Firebase Hizmet Sağlayıcıları:</strong> Hesap kimlik doğrulaması (<code>firebase/auth</code>) ve veritabanı (<code>firebase/firestore</code>) hizmetleri Firebase tarafından sağlanır. Verileriniz Firebase sunucularında saklanır ve onların güvenlik standartlarına tabidir.</li>
        <li><strong>Google Gemini API:</strong> Yapay zeka sohbetleri, konu anlatımları ve soru çözümleri için metin ve görseller (soru çözümü için) Google'ın Gemini API'sine gönderilir. Bu etkileşimler, AI yanıtlarını üretmek amacıyla işlenir. Google'ın veri kullanımı politikaları geçerlidir.</li>
        <li><strong>Yasal Yükümlülükler:</strong> Yasal bir yükümlülük gereği veya yasal süreçlere uymak amacıyla bilgileriniz ilgili makamlarla paylaşılabilir.</li>
        <li><strong>Rızanızla:</strong> Açık rızanız olması durumunda, verileriniz üçüncü taraflarla paylaşılabilir.</li>
      </ul>
      <p><strong>Önemli Not:</strong> Uygulamanızda diğer kullanıcılarla veri paylaşımı (örneğin "public" Firestore koleksiyonları aracılığıyla) yapıldığını belirtmiştiniz. Eğer bu özellik aktifse, bu bölümde bunun açıkça belirtilmesi GEREKİR. Örneğin: "İlerleme kayıtlarınız ve profil bilgileriniz (kullanıcı kimliğiniz dahil) diğer Uygulama kullanıcıları tarafından görülebilir ve ortak analizler için kullanılabilir."</p>

      <h2>4. Verilerinizi Ne Kadar Süreyle Saklıyoruz?</h2>
      <p>Kişisel verilerinizi, Uygulamayı aktif olarak kullandığınız süre boyunca ve yasal yükümlülüklerimizin gerektirdiği süre boyunca saklarız. Hesabınızı sildiğinizde veya talep ettiğinizde, yasal saklama süreleri hariç verileriniz silinecektir.</p>

      <h2>5. Veri Güvenliği</h2>
      <p>Verilerinizin güvenliğini sağlamak için uygun teknik ve organizasyonel önlemleri alıyoruz. Ancak internet üzerinden hiçbir veri aktarımının %100 güvenli olmadığını unutmayınız.</p>

      <h2>6. Haklarınız</h2>
      <p>Kişisel verilerinizle ilgili olarak aşağıdaki haklara sahipsiniz:</p>
      <ul>
        <li><strong>Erişim Hakkı:</strong> Hangi verilerizi işlediğimiz hakkında bilgi talep etme hakkı.</li>
        <li><strong>Düzeltme Hakkı:</strong> Eksik veya yanlış verilerinizin düzeltilmesini talep etme hakkı (örneğin profil bilgilerinizi güncelleyerek).</li>
        <li><strong>Silme Hakkı (Unutulma Hakkı):</strong> Verilerinizin silinmesini talep etme hakkı. Uygulama içindeki "AI Geçmişini Sıfırla" butonu ile AI sohbet geçmişlerinizi silebilirsiniz. Ayrıca ilerleme kayıtlarınızı da silebilirsiniz.</li>
        <li><strong>Veri Taşınabilirliği Hakkı:</strong> Verilerinizin size veya üçüncü bir tarafa yapılandırılmış, yaygın olarak kullanılan ve makine tarafından okunabilir bir formatta aktarılmasını talep etme hakkı.</li>
      </ul>
      <p>Bu haklarınızı kullanmak için lütfen aşağıdaki iletişim bilgilerini kullanarak bizimle iletişime geçin.</p>

      <h2>7. İletişim Bilgileri</h2>
      <p>Gizlilik politikamız veya veri işleme uygulamalarımız hakkında herhangi bir sorunuz varsa, lütfen aşağıdaki yollarla bizimle iletişime geçin:</p>
      <ul>
        <li><strong>E-posta:</strong> yusuf.akademikkocudestek@gmail.com</li>
        <li><strong>Instagram:</strong> <a href="https://www.instagram.com/sirfatihsultanterim" target="_blank" rel="noopener noreferrer">@sirfatihsultanterim</a></li>
      </ul>

      <h2>8. Politikadaki Değişiklikler</h2>
      <p>Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Herhangi bir değişiklik olduğunda, Uygulama içinde veya e-posta yoluyla size bildirimde bulunacağız. Değişikliklerin yürürlüğe girmesinden sonra Uygulamayı kullanmaya devam etmeniz, güncellenmiş politikayı kabul ettiğiniz anlamına gelir.</p>
    </div>
  );
};

export default PrivacyPolicy;
