# YouTube Kanal Fabrikasi - Agent Mimarisi ve Plan

## Amac

YouTube kanali isletmek icin bir framework kurmak. Framework hazir olduktan sonra sayisiz yeni kanal acilip farkli icerikler birkac koldan yayinlanabilir. Tek bir core framework reposu (`yt-pipeline`), her kanal kendi reposunu fork/template olarak alir.

---

## Teknoloji Kararlari

- **Dil:** TypeScript (her yerde)
- **Video Uretim:** Remotion
- **TTS:** Google Cloud TTS — Chirp 3: HD (LINEAR16/WAV output, free tier 1M chars/month; previously ElevenLabs — deprecated)
- **Gorseller:** Stock API'lar (Pexels/Unsplash) + AI gorsel uretimi (Gemini primary, DALL-E fallback)
- **YouTube:** YouTube Data API v3 + Analytics API
- **Video Formati:** Voiceover + gorseller/text (birincil), Data/grafik agirlikli (ikincil - chart animasyonlari, haritalar, istatistikler)
- **Thumbnail:** Simdilik oncelik degil

## Orkestrasyon Yaklasimi

**Hibrit:** OpenCode slash command'leri agent tetiklemek icin + Node.js script'leri agir isler icin (Remotion render, YouTube upload, TTS uretimi)

## State Management

**Dosya sistemi bazli.** Her video projesi bir klasor, icerisinde yapilandirilmis alt dizinler:

```
projects/<video-slug>/
  config.json          # Pipeline durumu, metadata
  research/            # Arastirma ciktilari
  content/             # Icerik taslaklari ve son hali
  storyboard/          # Storyboard dosyalari (Figma entegrasyonu)
  production/          # Remotion kaynaklari, renderlar
  publishing/          # YouTube metadata, thumbnail, SEO
  analytics/           # Performans verileri
```

## Pipeline Evrimi

1. **Manuel** (baslangic): Kullanici her adimi tetikler
2. **Yari-otomatik** (orta vade): Agent'lar arasi gecisler otomatik, kullanici onay noktalarinda
3. **Direktor yonetimli** (uzun vade): Direktor agent pipeline'i yonetiyor, kullanici sadece stratejik kararlarda

## Hata Yonetimi

Basit baslangic - sorunlari markdown dosyasina logla, sonra formalize et.

---

## Temel Ayrim: Pipeline vs Icerik

Bu framework'te iki farkli katman vardir ve bunlar KESINLIKLE birbirinden ayri tutulur:

### Pipeline (Git'te yasar)
Framework'un kendisi — agent prompt'lari, slash command'ler, TypeScript tipleri, utility fonksiyonlar, Remotion template'leri, Node.js script'leri, template dosyalari. Bunlar **jenerik** ve **kanal-bagimsizdir**. Herhangi bir kanal bu framework'u fork edip kullanabilir.

- `src/`, `.opencode/`, `templates/`, `agents-plan.md`, `package.json`, vb.
- Git'e commit edilir, PR ile gelisir, surekli iyilestirilir

### Icerik (Git'te YASAMAZ)
Video projeleri, arastirma dosyalari, senaryolar, storyboard'lar, renderlar, yayin metadata'si, analitik verileri. Bunlar **kanal-spesifiktir**.

- `channels/<channel-slug>/videos/<slug>/` — her video kendi klasorunde
- `.gitignore` ile git'ten haric tutulur
- Yerel dosya sisteminde kalir, gerekirse ayri backup stratejisi uygulanir

### Neden?
1. Pipeline kodu jenerik kalmali — herhangi bir kanal tipi icin calisabilmeli
2. Icerik pipeline'i kirletmemeli — bir kanalin "expensive liquids" arastirmasi baska bir kanalin kod tabanini etkilememeli
3. Commit gecmisi temiz kalmali — sadece gercek framework iyilestirmeleri gorulmeli
4. Farkli makinelerde/ortamlarda farkli kanallar ayni pipeline uzerinde calisabilmeli

---

## Kanal Olgunlasma Modeli

Kanallar zaman icinde olgunlasir. Bu olgunluk seviyesi `channel-config.json` icindeki `maturity` alaniyla takip edilir ve agent'larin davranisini etkiler.

### Seviyeler

| Seviye | Aciklama | Agent Davranisi |
|--------|----------|-----------------|
| `seed` | Yeni kanal, henuz icerik yok | Agent'lar jenerik best practice'lere gore calisir, deneysel yaklasim |
| `growing` | 5-20 video, ilk veriler geliyor | Agent'lar erken analitik verilere gore adapte olmaya baslar |
| `established` | 20+ video, tutarli performans verisi | Agent'lar kanal verisine dayanarak optimizasyon yapar, ton/stil tutarliligi saglar |
| `mature` | 50+ video, net kimlik | Agent'lar kanalin kimligine tam uyumlu icerik uretir, sadece stratejik degisiklikler |

### Olgunlasma Etkileri
- **Researcher:** Established+ kanallarda, onceki basarili videolarin konularini ve formatlarini referans alir
- **Content Writer:** Growing+ kanallarda, kanal tonunu ve basarili hook pattern'lerini ogrenip uygular
- **YouTube Expert:** Growing+ kanallarda, gercek kanal analitik verileriyle optimizasyon yapar
- **Content Strategist:** Established+ kanallarda, kanal verisine dayali icerik takvimi olusturur
- **Director:** Tum seviyelerde, olgunluk seviyesine gore strateji belirler

> **NOT:** Agent'lar kanalin olgunluk seviyesine gore davranislarini adapte eder, ama urettikleri icerik ASLA pipeline git reposuna dahil edilmez. Olgunlasma sadece agent'larin "nasil" calistigini etkiler, urettikleri ciktilar yine `projects/` altinda yerel kalir.

## Versiyon Yonetim Sistemi

Pipeline dogrusal degildir - kullanici herhangi bir asamaya geri donebilir, asamalari atlayabilir veya dogrudan duzenleme yapabilir. Bu yuzden her asama bagimsiz versiyonlanir.

### Temel Prensipler

1. **`currentWork` alani:** `config.json`'da o an aktif olarak ne uzerinde calisildigini gosterir (ornegin `"content"` veya `null`)
2. **Asama bazli versiyon:** Her pipeline asamasinin `status` ve `version` numarasi vardir
3. **Dosya versiyonlama:** `script-v1.md`, `script-v2.md` seklinde - **eski versiyonlar asla silinmez**
4. **Versiyon basligi:** Her versiyonlu dosyanin basinda metadata bulunur:
   ```
   version: 2
   based_on: research-v3
   changes_from_prev: Hook bolumu yeniden yazildi, istatistikler guncellendi
   date: 2026-02-25
   ```
5. **Gecmis takibi:** `config.json` icindeki `history` dizisi her durum gecisini kaydeder (timestamp, olay, sebep, atlanan asamalar)
6. **Produksiyon bir butundur:** Uretim asamasi (ses, gorsel, render) tek bir birim olarak versiyonlanir, alt varliklar ayri ayri degil
7. **Analitik snapshot bazlidir:** Tarih bazli dosyalar (`analytics-2026-02-25.json`), revizyon bazli degil

### config.json Yapisi

```json
{
  "currentWork": "content",
  "pipeline": {
    "research": { "status": "completed", "version": 2 },
    "content": { "status": "in_progress", "version": 3 },
    "storyboard": { "status": "completed", "version": 1 },
    "production": { "status": "not_started", "version": 0 },
    "publishing": { "status": "not_started", "version": 0 },
    "analytics": { "status": "not_started", "version": 0 }
  },
  "history": [
    {
      "timestamp": "2026-02-25T10:00:00Z",
      "event": "research.completed",
      "details": "Initial research finished",
      "version": 1
    },
    {
      "timestamp": "2026-02-25T14:00:00Z",
      "event": "content.reopened",
      "details": "Hook needs rewrite based on user feedback",
      "version": 3
    }
  ]
}
```

### Versiyon Tutarliligi

- Downstream dosyalar `based_on` ile upstream versiyonu referans eder
- QA agent tutarsizliklari otomatik tespit eder (ornegin storyboard hala script-v1'e dayanirken content v3'te ise)
- Director agent durum raporlarinda stale bagimliliklar icin uyari verir
- Dependency zinciri: research → content → storyboard → production → publishing

---

## Agent Yapisi (11 Agent)

Orijinal 18 agent'tan 11'e dusuruldu - iliskili roller birlestirilerek.

### Pipeline Agent'lari (6)

Bunlar sirasiyla calisir, her biri pipeline'in bir asamasini yonetir.

#### 1. Arastirmaci (Researcher)
- **Mod:** Build (otonom calisir, sonra onay ister)
- **Gorev:** Verilen konu icin materyal toplar. Data odakli calisir, kaynaklari ispatlayacak baglantilari getirir. Fact-checking yapar.
- **Eski roller:** Arastirmaci + Yorumcu + Derleyici birlesti
- **Cikti:** `research/` klasorune yapilandirilmis arastirma dosyasi
- **Kullanici etkilesimi:** Arastirma sonuclarini sunar, kullanici yorumlar/yonlendirir, sonra icerik taslagini olusturur

#### 2. Icerik Yazari (Content Writer)
- **Mod:** Build -> Plan (otonom taslak yazar, sonra kullaniciyla birlikte duzenler)
- **Gorev:** Arastirma ciktisini video senaryosuna cevirir. Script, voiceover metni, ana mesajlar.
- **Eski roller:** Derleyici + Editor birlesti
- **Cikti:** `content/` klasorune senaryo dosyasi
- **Kullanici etkilesimi:** Taslagi sunar, birlikte editleme yapar, fact-check ve format kontrol

#### 3. Storyboard
- **Mod:** Build -> Plan
- **Gorev:** Onaylanmis icerigi sahne sahne gorsel plana cevirir. Figma entegrasyonu (MCP, CLI veya OpenCode skill) ile storyboard olusturur.
- **Cikti:** `storyboard/` klasorune sahne planlari
- **Kullanici etkilesimi:** Storyboard'u Figma'da birlikte real-time duzenleyebilirler

#### 4. Video Produksiyon
- **Mod:** Build
- **Gorev:** Remotion kullanarak storyboard'u videoya cevirir. TTS uretimi (Google Cloud Chirp 3: HD — LINEAR16/WAV), gorsel toplama (Pexels/Gemini), Remotion renderle birlestirir.
- **Eski roller:** Video Yaratici + Video Editor birlesti
- **Cikti:** `production/` klasorune render edilmis video
- **Kullanici etkilesimi:** Preview sunar, duzenleme talepleri alir
- **ONEMLI:** Full render asla blocking calistirilmaz. Preview icin Remotion Studio veya `remotion still` kullanilir.

#### 5. Yayin (Publisher)
- **Mod:** Plan -> Build
- **Gorev:** Yayinlama stratejisi belirler (saat, gun, hedef kitle), YouTube-ready yapar (aciklama, tag, metadata), upload eder.
- **Eski roller:** Yayinlama Arastirmacisi + Yayinlamaci birlesti
- **Cikti:** `publishing/` klasorune metadata + YouTube'a upload
- **Kullanici etkilesimi:** Yayinlama plani onayi, upload oncesi son kontrol

#### 6. Analiz (Analytics)
- **Mod:** Plan
- **Gorev:** Yayin sonrasi performans takibi, YouTube Analytics verileri, cikarimlar ve tavsiyeler.
- **Eski roller:** Yayin Sonrasi agent
- **Cikti:** `analytics/` klasorune raporlar
- **Kullanici etkilesimi:** Raporlari sunar, stratejik oneriler tartisir

### Yardimci Agent'lar (4)

Pipeline agent'larina destek verir, gerektiginde cagirilir.

#### 7. Toplayici (Collector)
- **Mod:** Build
- **Gorev:** Utility agent. Gorsel, ses, bilgi gerektiginde internetten toplar. Stock foto/video API'lari, AI gorsel uretimi, kaynak arama.
- **Kimler kullanir:** Tum pipeline agent'lari gerektiginde cagirir

#### 8. YouTube Uzmani (YouTube Expert)
- **Mod:** Plan + Build
- **Gorev:** YouTube SEO, algoritma best practice'leri, tag/aciklama optimizasyonu, kanal analitigi. YouTube Data API ve Analytics API ile calisir.
- **Eski roller:** Algoritma Optimizasyonu + YouTube Analiz birlesti
- **Kimler kullanir:** Yayin agent'i, Analiz agent'i, Direktor

#### 9. QA Agent
- **Mod:** Build
- **Gorev:** Pipeline'daki sorunlari raporlar, kalite kontrol yapar. Hata loglama, iyilestirme ajandasi cikarma.
- **Eski roller:** Kaza Raporu + Iyilestirme birlesti
- **Cikti:** Hata raporlari ve iyilestirme onerileri

#### 10. Icerik Stratejisti (Content Strategist)
- **Mod:** Plan
- **Gorev:** Gundemi takip, konu ajandasi yonetimi, icerik takvimi, follow-up planlamasi. "You may also like" tarzi oneriler, trend yakalama, release planlamasi.
- **Eski roller:** Gundem + Konu agent'lari birlesti
- **Kimler kullanir:** Direktor, Arastirmaci

### Orkestrasyon Agent'i (1)

#### 11. Direktor
- **Mod:** Plan
- **Gorev:** Tum agent'lari oversee eder, kullaniciyla iletisimde kalir, kanalin genel gidisatini ve yonunu belirler. Pipeline sorunlarini degerlendirir, koklu degisikliklere karar verir.
- **Ozellikler:**
  - Trafik kaynaklarini ve motivasyon etkilerini degerlendirir
  - Icerik dogrultusu hakkinda cikarimlar yapar
  - Dunya gundemini takip edip trendleri yakalar
  - Agent'lar arasi koordinasyonu saglar

---

## Slash Command'ler

Her agent icin bir slash command tanimlanacak:

```
/research <konu>          - Arastirmaci agent'i tetikler
/write <proje>            - Icerik Yazari agent'i tetikler
/storyboard <proje>       - Storyboard agent'i tetikler
/produce <proje>          - Video Produksiyon agent'i tetikler
/publish <proje>          - Yayin agent'i tetikler
/analyze <proje|kanal>    - Analiz agent'i tetikler
/collect <tur> <sorgu>    - Toplayici agent'i tetikler
/youtube-expert <sorgu>   - YouTube Uzmani agent'i tetikler
/qa <proje>               - QA agent'i tetikler
/strategy                 - Icerik Stratejisti agent'i tetikler
/director                 - Direktor agent'i tetikler
/status <proje>           - Proje durumunu gosterir
/new-project <slug>       - Yeni video projesi olusturur
```

## Node.js Script'ler

Agir isler icin ayri script'ler:

```
scripts/
  tts-generate.ts         - Google Cloud TTS Chirp 3: HD (LINEAR16/WAV output)
  remotion-render.ts      - Remotion video renderle
  youtube-upload.ts       - YouTube API ile video upload
  fetch-analytics.ts      - YouTube Analytics verisi cek
  collect-stock.ts        - Stock foto/video API'lardan topla
  generate-image.ts       - Gemini/DALL-E ile gorsel uret
  audio-probe.ts          - WAV + MP3 duration parsing utility
  text-utils.ts           - Word count, duration budget, estimation
```

---

## Proje Dizin Yapisi

```
yt-pipeline/
  package.json
  tsconfig.json
  agents-plan.md
  pipeline-diagram.excalidraw
  
  .opencode/
    agents/                # Agent system prompt'lari
      researcher.md
      content-writer.md
      storyboard.md
      video-production.md
      publisher.md
      analytics.md
      collector.md
      youtube-expert.md
      qa.md
      content-strategist.md
      director.md
    commands/              # Slash command tanimlari
      research.ts
      write.ts
      storyboard.ts
      produce.ts
      publish.ts
      analyze.ts
      collect.ts
      youtube-expert.ts
      qa.ts
      strategy.ts
      director.ts
      status.ts
      new-project.ts
  
  src/
    types/                 # Shared TypeScript tipleri
    utils/                 # Ortak yardimci fonksiyonlar
    scripts/               # Node.js script'ler (TTS, render, upload, vb.)
    remotion/              # Remotion video sablonlari ve componentleri
  
  projects/                # Video projeleri (her biri bir klasor)
    <video-slug>/
      config.json
      research/
      content/
      storyboard/
      production/
      publishing/
      analytics/
  
  templates/               # Yeni proje sablonlari
    default-config.json
```

---

## Maliyet ve Gelir Analizi

### Maliyet (Aylik)
- **Google Cloud TTS Chirp 3: HD:** Free tier 1M chars/month (~111 videos), sonra $30/1M chars
- **Claude API:** Simdilik free
- **Gemini Image Gen:** Kullanima bagli
- **Stock API'lar:** Pexels/Unsplash free tier'lar
- **YouTube API:** Free (quota limitleri var)
- **Toplam baslangic:** ~$0-15/ay

### Gelir Projeksiyonu

| Senaryo | Kisa Vade (0-6 ay) | Orta Vade (6-18 ay) | Uzun Vade (18+ ay) |
|---------|-------------------|--------------------|--------------------|
| Kotu    | $0                | $0-50/ay           | $50-200/ay         |
| Ortalama| $0                | $50-200/ay         | $200-1000/ay       |
| Iyi     | $0-50             | $200-1000/ay       | $1000-5000/ay      |

---

## Sonraki Adimlar

1. [x] Mimari kararlar ve agent yapisi finalize
2. [x] Pipeline diyagrami olustur (Excalidraw)
3. [x] Proje yapisini kur (TypeScript, Remotion, dizin yapisi)
4. [x] Agent prompt dosyalarini olustur (11 agent)
5. [x] Slash command tanimlarini yaz (13 command)
6. [x] Node.js script'leri implement et (7 script)
7. [x] Core TypeScript tipleri ve utility fonksiyonlar
8. [x] Versiyon yonetim sistemi tasarimi ve implementasyonu
9. [ ] Remotion template/component'leri kur
10. [ ] Ilk agent'i test et (Arastirmaci ile gercek konu)
11. [ ] Ilk test videosu pipeline'dan gecir
