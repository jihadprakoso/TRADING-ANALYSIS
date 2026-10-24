# AuraTrade AI — Trading Analysis

Dashboard analisis trading berbasis **React 19 + Vite + TypeScript + Tailwind 4** dengan backend **Express** yang juga menyediakan endpoint analisis AI (Google Gemini) dan stream harga real-time (OANDA). Fokus analisis memakai metodologi **ICT (Inner Circle Trader)** dan **SMC (Smart Money Concepts)**.

## Fitur

- **Chart candlestick real-time** (`lightweight-charts`) dengan pemilihan pair: XAU/USD, EUR/USD, GBP/USD, USD/JPY.
- **Pemilihan timeframe & gaya trading** (Scalping / Intraday / Swing).
- **Overlay indikator**: Area Support/Resistance, level Fibonacci, dan penghitungan **ATR (14)** di sisi klien.
- **Analisis AI (Gemini)**: mengirim ringkasan data pasar + ATR ke `/api/analyze` dan mengembalikan JSON terstruktur berisi trend, rekomendasi (Buy/Sell/Wait), entry, stop loss, take profit, risk level, analisis sesi ICT, SMC (OB/FVG/BOS), pola candle, level Fibonacci, serta area S/R.
- **Stream harga real-time opsional** melalui WebSocket: bila kredensial OANDA tersedia, server meneruskan tick harga ke semua klien.
- **Fallback simulasi**: bila WebSocket/OANDA tidak tersedia, aplikasi tetap berjalan dengan data pasar simulasi yang diperbarui tiap 3 detik — sehingga demo portofolio selalu tampil hidup.

## Teknologi

| Lapisan | Teknologi |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4, `lightweight-charts`, `recharts`, `lucide-react`, `motion` |
| Backend | Node.js + Express 4 (`server.ts`), WebSocket (`ws`), `https` untuk streaming OANDA |
| AI | `@google/generative-ai` (Gemini 1.5 Flash, output JSON schema) |

## Persyaratan

- **Node.js 18+** (terverifikasi pada Node **v20.20.1**, npm 10.8.2)
- Kunci API opsional: `GEMINI_API_KEY` (untuk analisis AI) dan kredensial OANDA (untuk harga live)

## Menjalankan

```bash
cd Trading-Analysis
npm install
npm run dev
```

Buka **http://localhost:3000**

Server dev menjalankan Express + Vite middleware dalam satu proses, jadi frontend dan endpoint `/api/analyze` tersedia di port yang sama.

### Konfigurasi kredensial

Buat file `.env.local` di root proyek (`.env` juga dibaca sebagai fallback):

```env
# Wajib untuk fitur analisis AI
GEMINI_API_KEY=your_gemini_api_key

# Opsional — stream harga real-time OANDA v20
OANDA_API_KEY=your_oanda_key
OANDA_ACCOUNT_ID=your_account_id
OANDA_ENV=practice   # atau 'live'
```

Tanpa kredensial, aplikasi **tetap berjalan**: chart memakai data simulasi dan tombol analisis menampilkan pesan error yang informatif (`Gemini API Key is missing or invalid`), bukan crash.

### Perintah lain

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Jalankan server dev (Express + Vite, port 3000) |
| `npm run build` | Build produksi ke `dist/` |
| `npm run preview` | Preview hasil build dengan Vite |
| `npm run lint` | Pemeriksaan tipe (`tsc --noEmit`) |
| `npm run clean` | Hapus folder `dist` |

## Menjalankan versi build tanpa Node

Hasil build di `dist/` memakai path aset **relatif** sehingga dapat dibuka langsung dari web server statis (misal XAMPP):

```
http://localhost/My_Porto/Trading-Analysis/dist/
```

Pada mode statis ini, chart dan simulasi tetap berjalan, tetapi endpoint `/api/analyze` dan WebSocket tidak aktif karena memerlukan proses Node — gunakan `npm run dev` untuk fitur AI dan harga live.

## Struktur

```
Trading-Analysis/
├── index.html          # Entry Vite (judul & meta SEO)
├── server.ts           # Express: /api/analyze, WebSocket, stream OANDA, Vite middleware
├── vite.config.ts      # Plugin React + Tailwind, alias @, base relatif
├── src/
│   ├── App.tsx         # Dashboard utama (chart, panel analisis, indikator)
│   ├── main.tsx        # Bootstrap React
│   ├── index.css       # Tailwind + tema gelap
│   └── lib/utils.ts    # Helper `cn()` (clsx + tailwind-merge)
├── dist/               # Hasil build produksi
└── .env.example        # Template kredensial
```

## Catatan Keamanan

- Kunci API hanya dibaca di sisi server (`process.env`) dan **tidak** dikirim ke bundle klien. `vite.config.ts` hanya meng-inline `GEMINI_API_KEY` untuk `process.env` — pastikan tidak memakainya di kode klien.
- Jangan commit `.env.local` (berisi kredensial). Gunakan `.env.example` sebagai template.
- Endpoint `/api/analyze` memvalidasi keberadaan `prompt` dan mengembalikan 400 bila kosong.

## Disclaimer

Data pasar pada mode demo bersifat **simulasi**, dan hasil analisis AI bukan nasihat keuangan. Aplikasi ini dibuat untuk keperluan portofolio/edukasi.
