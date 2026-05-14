// Backend API basit stres testi (k6 ile)
// Kullanım: k6 run perf-api.js
// Önce backend çalışıyor olsun: cd backend && npm start
import http from 'k6/http';

export const options = {
  vus: 10,        // 10 eşzamanlı kullanıcı
  duration: '10s'
};

export default function () {
  const res = http.get('http://127.0.0.1:3000/api/products?limit=5');
  if (res.status !== 200) {
    console.warn('Unexpected status: ' + res.status);
  }
}
