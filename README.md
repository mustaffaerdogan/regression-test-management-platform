## Regression Test Management Platform

Bu depo MERN (MongoDB, Express, React, Node.js) yığını kullanarak oluşturacağınız regresyon test yönetim platformunun temel çatısını içerir. Monorepo düzeninde `server` ve `client` klasörleri bulunur.

**Özellikler:**
- ✅ Tam authentication sistemi (JWT, bcrypt)
- ✅ React Router v6 ile protected routes
- ✅ Tailwind CSS ile modern UI
- ✅ TypeScript ile tip güvenliği
- ✅ Express-validator ile input validasyonu

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

- `server/env.example` → `server/.env` (JWT_SECRET eklemeyi unutmayın!)
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

**API Endpoints:**

- Health: `GET http://localhost:5000/health` veya `GET /api/status`
- Authentication:
  - `POST /api/auth/register` - Kullanıcı kaydı
  - `POST /api/auth/login` - Giriş yapma
  - `GET /api/auth/me` - Kullanıcı bilgilerini getir (JWT gerekli)

**Frontend (`client`):**

Vite + React + TypeScript kullanır. API tabanı `VITE_API_BASE_URL` değişkeni ile okunur.

```bash
cd client
npm run dev        # Geliştirme sunucusu (http://localhost:5173)
npm run build      # Production derlemesi
npm run preview    # Production build'i önizleme
npm run lint       # ESLint kontrolü
```

Varsayılan dev sunucusu `http://localhost:5173` adresindedir.

**Frontend Özellikleri:**
- React Router v6 ile routing
- Authentication context ile state management
- Protected routes (dashboard)
- Public routes (login, register)
- Tailwind CSS ile responsive tasarım
- Form validasyonu ve error handling

### Proje Yapısı

```
regression-test-management-platform/
├── server/                 # Backend (Express + TypeScript)
│   ├── src/
│   │   ├── config/        # MongoDB bağlantı konfigürasyonu
│   │   ├── controllers/   # Route controller'ları (auth.controller.ts)
│   │   ├── middleware/    # Auth, validation, error middleware'leri
│   │   ├── models/        # Mongoose modelleri (User.model.ts)
│   │   ├── routes/        # API route tanımları (auth.routes.ts)
│   │   ├── types/         # TypeScript type extensions (express.d.ts)
│   │   ├── utils/         # Utility fonksiyonları (generateToken.ts)
│   │   ├── app.ts         # Express uygulama yapılandırması
│   │   └── server.ts      # Server başlatma dosyası
│   ├── dist/              # TypeScript derleme çıktısı (gitignore)
│   └── .env               # Ortam değişkenleri (gitignore)
├── client/                # Frontend (React + Vite + TypeScript + Tailwind)
│   ├── src/
│   │   ├── api/           # API client fonksiyonları (auth.ts)
│   │   ├── components/    # Reusable bileşenler (Button, FormInput)
│   │   ├── context/       # React Context (AuthContext)
│   │   ├── hooks/         # Custom hooks (useAuth)
│   │   ├── layouts/       # Layout bileşenleri (PublicLayout, ProtectedLayout)
│   │   ├── pages/         # Sayfa bileşenleri (Auth/Login, Auth/Register)
│   │   ├── router/        # React Router yapılandırması
│   │   ├── types/         # TypeScript type tanımları (user.ts)
│   │   ├── App.tsx        # Ana React bileşeni
│   │   └── main.tsx       # Entry point
│   ├── dist/              # Vite build çıktısı (gitignore)
│   └── .env               # Ortam değişkenleri (gitignore)
└── package.json           # Root package.json (monorepo script'leri)
```

### Authentication Kullanımı

**Backend:**
- JWT token'lar 7 gün geçerlidir
- Password'ler bcrypt ile hash'lenir (salt rounds: 10)
- Protected endpoint'ler için `Authorization: Bearer <token>` header'ı gerekir

**Frontend:**
- Token localStorage'da saklanır
- Sayfa yenilendiğinde otomatik session restore
- Protected routes için `ProtectedLayout` kullanılır
- Login/Register sayfaları `PublicLayout` kullanır

**Örnek API Kullanımı:**

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get Me (Protected)
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### Geliştirmeye Başlama Önerileri

1. ✅ Authentication sistemi tamamlandı
2. MongoDB koleksiyon şemaları ve Mongoose modellerini ekleyin (Test, TestSuite, vb.)
3. Rol tabanlı yetkilendirme ekleyin (admin, user, vb.)
4. Frontend'de test yönetim sayfalarını oluşturun
5. Test çalıştırma ve sonuç görüntüleme özelliklerini ekleyin

Bu yapı taşları üzerine istediğiniz özellikleri katman katman ekleyebilirsiniz. İyi çalışmalar!

