## Regression Test Management Platform

Bu depo MERN (MongoDB, Express, React, Node.js) yığını kullanarak oluşturacağınız regresyon test yönetim platformunun temel çatısını içerir. Monorepo düzeninde `server` ve `client` klasörleri bulunur.

### Gereksinimler

- Node.js 18+ (proje Node 24 ile test edilmiştir)
- npm 10+
- MongoDB 6+ (MongoDB servisinin çalışıyor olması gerekir)

### Kurulum

1. **Bağımlılıkları yükleyin:**
```bash
npm install                    # Root bağımlılıkları
cd server && npm install       # Backend bağımlılıkları
cd ../client && npm install   # Frontend bağımlılıkları
```

2. **Ortam değişkenlerini ayarlayın:**

Her servis için örnek dosyalardan yararlanarak `.env` dosyalarınızı oluşturun:

- `server/env.example` → `server/.env`
- `client/env.example` → `client/.env`

**Windows:**
```powershell
Copy-Item server\env.example server\.env
Copy-Item client\env.example client\.env
```

**Linux/Mac:**
```bash
cp server/env.example server/.env
cp client/env.example client/.env
```

3. **MongoDB servisinin çalıştığından emin olun:**
```bash
mongosh --eval "db.adminCommand('ping')"
```

### Çalıştırma

#### Tüm Servisleri Birlikte (Önerilen)

Root dizinden tüm servisleri aynı anda başlatmak için:

```bash
npm run dev        # Backend ve frontend'i birlikte başlatır
```

#### Ayrı Ayrı Çalıştırma

**Backend (`server`):**

Express + TypeScript altyapısı MongoDB bağlantısı ile hazırdır.

```bash
cd server
npm run dev        # Geliştirme sunucusu (ts-node-dev)
npm run build      # Production derlemesi
npm start          # Derlenmiş kodu çalıştırır (dist/server.js)
npm run lint       # TypeScript tip kontrolü
```

API health endpoint: `GET http://localhost:5000/health` veya `GET /api/status`.

**Frontend (`client`):**

Vite + React + TypeScript kullanır. API tabanı `VITE_API_BASE_URL` değişkeni ile okunur.

```bash
cd client
npm run dev        # Geliştirme sunucusu (http://localhost:5173)
npm run build      # Production derlemesi
npm run preview    # Production build'i önizleme
npm run lint       # ESLint kontrolü
```

Varsayılan dev sunucusu `http://localhost:5173` adresindedir ve backend sağlık durumunu gösteren basit bir gösterge içerir.

### Proje Yapısı

```
regression-test-management-platform/
├── server/                 # Backend (Express + TypeScript)
│   ├── src/
│   │   ├── config/        # MongoDB bağlantı konfigürasyonu
│   │   ├── controllers/   # Route controller'ları
│   │   ├── routes/        # API route tanımları
│   │   ├── app.ts         # Express uygulama yapılandırması
│   │   └── server.ts      # Server başlatma dosyası
│   ├── dist/              # TypeScript derleme çıktısı (gitignore)
│   └── .env               # Ortam değişkenleri (gitignore)
├── client/                # Frontend (React + Vite + TypeScript)
│   ├── src/
│   │   ├── App.tsx        # Ana React bileşeni
│   │   └── ...
│   ├── dist/              # Vite build çıktısı (gitignore)
│   └── .env               # Ortam değişkenleri (gitignore)
└── package.json           # Root package.json (monorepo script'leri)
```

### Geliştirmeye Başlama Önerileri

1. MongoDB koleksiyon şemaları ve Mongoose modellerini ekleyin.
2. Kimlik doğrulama, rol tabanlı yetkilendirme ve test seti akışlarınızı planlayın.
3. Frontend tarafında tasarım sisteminizi ve sayfa/feature klasör yapınızı oluşturun.

Bu yapı taşları üzerine istediğiniz özellikleri katman katman ekleyebilirsiniz. İyi çalışmalar!

