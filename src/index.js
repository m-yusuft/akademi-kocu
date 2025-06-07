import React from 'react';
import ReactDOM from 'react-dom/client';
// Artık App.js'i değil, kendi ana bileşenimizi import ediyoruz
// main.jsx dosyanızın varsayılan (default) bir bileşen export ettiğini varsayıyorum.
import YourMainComponent from './main.jsx'; // main.jsx dosyanızı import edin
import reportWebVitals from './reportWebVitals';
import './index.css'; // Tailwind CSS ve diğer global stiller için

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <YourMainComponent /> {/* Burada kendi ana bileşeninizi render ediyoruz */}
  </React.StrictMode>
);

// Uygulamanızın performansını ölçmek isterseniz bu kısmı kullanabilirsiniz.
reportWebVitals();