# 🎬 Station of Vision

**Station of Vision**, yaratıcı süreçler ile dijital dosya yönetimi arasındaki hantallığı ortadan kaldıran, post-prodüksiyon iş akışları için tasarlanmış akıllı bir yerel ağ (localhost) ve medya aktarım istasyonudur.

## 👁️ Felsefe: "Vizyonun Kesintiye Uğramasın"

Bir kurgu sadece bilgisayar ekranına bakarak şekillenmez; mekanda gezinirken, bir salonda otururken veya fikirleri başkalarıyla paylaşırken büyür. Geleneksel post-prodüksiyon süreçlerinde, kameradan bilgisayara dosya aktarmak, doğru klasörleri bulmak ve bu görüntüleri büyük bir ekranda referans olarak izlemek her zaman fiziksel efor gerektiren mekanik bir süreçtir. 

**Station of Vision**, bu mekanik süreci görünmez kılar:
1. **Donanım ve Yazılımın Buluşması:** Kameranızı (veya SD kartınızı) istasyona taktığınız an, hiçbir şeye tıklamanıza gerek kalmadan görüntüleriniz doğru dizinlere otomatik olarak aktarılır.
2. **Director Mode (Yönetmen Modu):** Masa başında hapsolmak yerine, televizyonunuzu bir vizör, cep telefonunuzu ise bir kumanda olarak kullanmanızı sağlar.
3. **Mekandan Bağımsızlık:** Kendi ev veya stüdyo ağınız içinde dolaşırken, sunucuya bağlı tüm harici disklerdeki vizyonunuza (dosyalarınıza) kablosuz olarak hükmedersiniz.

*Bu bir dosya yöneticisi değil, vizyonunuzu yansıtacağınız bir yönetim merkezidir.*

---

## ✨ Temel Özellikler

* ⚡ **Zero-Click Ingest (Otomatik Aktarım):** Sistem, belirlenen kamera veya SD kart sürücüsünü arka planda sürekli dinler. Donanım bağlandığı an, dosyalar tarih ve saat etiketleriyle Ingest klasörüne asenkron olarak kopyalanır.
* 🎬 **Director Mode (Çok Yakında):** WebSockets üzerinden çalışan çift ekranlı kontrol yapısı. Televizyonda açık olan arayüzü, telefonunuzdaki web tarayıcısından gerçek zamanlı olarak yönetin.
* 🗂️ **Dinamik Dizin Gezgini:** İşletim sisteminin dosya yapısına web üzerinden erişim. İstasyona takılan harici diskleri (`D:\`, `E:\` vb.) arayüz üzerinden görüntüleyin, klasörler arasında gezinin ve medyaları anında oynatın.
* 🚀 **FastAPI Core:** Python'un gücü ve FastAPI'nin asenkron yapısıyla sistemi yormadan arka planda çalışan, ağdaki tüm cihazlara hızlı tepki veren hafif bir motor.

---

## 🛠️ Teknoloji Yığını (Tech Stack)

* **Backend:** Python 3.x, FastAPI, Uvicorn
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (Sade ve bağımsız)
* **İletişim:** REST API ve WebSockets (Gerçek zamanlı Director Mode için)
* **Dosya Yönetimi:** Python `os` ve `shutil` kütüphaneleri

---

## 📂 Proje Yapısı

\`\`\`text
station-of-vision/
├── app/
│   ├── main.py              # FastAPI sunucusu ve rotaları
│   ├── ingest.py            # Donanım dinleme ve kopyalama motoru
│   └── explorer.py          # Harici disk ve klasör okuma API'si
├── static/
│   ├── css/                 # Arayüz stilleri
│   └── js/                  # Director mode ve oynatıcı mantığı
├── templates/
│   ├── index.html           # Ana Dashboard (TV/PC görünümü)
│   └── director.html        # Telefon kumanda görünümü
├── .gitignore
├── requirements.txt         # Pip bağımlılıkları
└── README.md
\`\`\`

---

## 🚀 Başlangıç

1. Repoyu klonlayın:
   ```bash
   git clone [https://github.com/KULLANICI_ADINIZ/station-of-vision.git](https://github.com/KULLANICI_ADINIZ/station-of-vision.git)
    ```

2. Gerekli kütüphaneleri kurun:

    ```bash
    pip install -r requirements.txt
    ```

3. İstasyonu başlatın:

    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```

Tarayıcınızdan http://localhost:8000 (veya ağdaki cihazlardan http://YAZILIMIN_IP_ADRESI:8000) adresine giderek vizyonunuza bağlanın.
