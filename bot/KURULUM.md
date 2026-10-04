# Telegram botu kurulumu (telefondan 5 dakika)

Bot GitHub'da her 4 saatlik mum kapanışından birkaç dakika sonra kendi kendine çalışır.
BTC ve ETH ana trendi (50 günlük ortalama) değişince haber verir; bu, 2018'den beri testte işe yarayan kuraldır.
Ayrıca Binance TR ve Binance Global'i tarayıp gözlem sinyallerini ve sonuçlarını yazar (bunlar kanıtlanmamıştır, işlem için değildir).
Senin telefonun kapalı olsa da çalışır. Ücretsizdir.

## 1. Telegram'da bot oluştur
1. Telegram'da **@BotFather**'ı aç, `/newbot` yaz.
2. Bota bir isim ver (örnek: Dipten Dönüş Sinyal).
3. Kullanıcı adı ver, sonu `bot` ile bitmeli (örnek: `sana_dipten_donus_bot`).
4. BotFather sana uzun bir **token** verir (`123456:ABC...` gibi). Bunu kopyala. Kimseyle paylaşma.

## 2. Token'ı GitHub'a ekle
1. Tarayıcıda repoyu aç: github.com/dreamdosima08-del/Binance-sinyal
2. **Settings → Secrets and variables → Actions**
3. **New repository secret**
   - Name: `TELEGRAM_TOKEN`
   - Secret: BotFather'ın verdiği token
4. **Add secret**

## 3. Botu kendine bağla
1. Telegram'da kendi botunu aç ve **/start** yaz.
2. Bot bir sonraki taramada (en geç 4 saat içinde) "Bağlandı!" mesajı atar.
   Beklemek istemezsen: repoda **Actions → Sinyal botu → Run workflow** ile hemen çalıştır.

Not: İlk /start yazan kişi kaydedilir. Bot kullanıcı adını kimseyle paylaşma.

## Ayarlar
`bot/ayarlar.json` dosyasından değiştirilebilir:
- `piyasalar`: taranacak piyasalar (`TRY`, `USDT`)
- `sermaye`: önerilen alım tutarı hesabı için sermayen
- `riskYuzde`: işlem başı risk
- `enDusukPuan`: bu puanın altındaki sinyaller gönderilmez
- `gunlukOzetSaati`: sabah özetinin gönderileceği en erken saat (Türkiye saati)

Strateji kuralları sitedeki `index.html` ile ortaktır; site güncellenince bot da otomatik olarak aynı kurallarla çalışır.

## Bilmen gerekenler
- GitHub zamanlanmış görevleri yoğunlukta birkaç dakika gecikebilir.
- Repo 60 gün boyunca hiç güncellenmezse GitHub zamanlanmış görevi durdurabilir. Böyle olursa Actions sekmesinden yeniden etkinleştir.
- Bot sadece sinyal verir; emir vermez, Binance hesabına erişmez.

## Botu hemen çalıştırmak
4 saati beklemek istemezsen: repoda **Actions → Sinyal botu → Run workflow**.
