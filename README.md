# @adiprmx/atlys

JavaScript SDK untuk [Atlys API](https://api.atlys.my.id) — 100.000 endpoint data publik Indonesia. Satu key, dokumentasi lengkap, gratis.

JavaScript SDK for the [Atlys API](https://api.atlys.my.id) — 100,000 Indonesian public-data endpoints. One key, full docs, free.

## Instalasi / Install

```bash
npm install @adiprmx/atlys
```

Butuh Node.js 18+. Works in Node.js 18+ and modern browsers.

## Cara pakai / Usage

```js
import { Atlys } from "@adiprmx/atlys";

const atlys = new Atlys("aclys_..."); // your API key

// helper populer / popular helpers
const berita = await atlys.info.news({ limit: 5 });
console.log(berita.result.items[0].title);

const quran = await atlys.islami.quran({ surah: 112 });
console.log(quran.result.ayat);

const kodepos = await atlys.data.kodeposKelurahan("menteng");
console.log(kodepos.result);

// endpoint apa pun / any endpoint (100.000 tersedia / available)
const hasil = await atlys.get("/v1/tools/qr", { teks: "halo" });
```

CommonJS:

```js
const { Atlys } = require("@adiprmx/atlys");
```

## Mode demo (tanpa key / no key)

```js
import { Atlys } from "@adiprmx/atlys";

const demo = Atlys.demo(); // no API key needed
const berita = await demo.info.news({ limit: 3 }); // demo data
```

Mode demo memakai data contoh dan prefix `/v1/demo/` otomatis. Demo mode uses sample data via the `/v1/demo/` prefix automatically.

## Helper yang tersedia / Available helpers

| Namespace | Method | Endpoint |
|---|---|---|
| `info` | `news()`, `hn()`, `sources()` | berita, hacker news |
| `islami` | `jadwalSholat()`, `quran()` | jadwal sholat, al-quran |
| `tools` | `qr()`, `shortlink()`, `cekHeader()`, `extract()` | qr, shortlink, dsb |
| `fun` | `quoteRandom()` | quote acak |
| `data` | `kodeposKecamatan()`, `kodeposKelurahan()`, `wilayahKecamatan()`, `wilayahKota()` | kode pos & wilayah |
| `osint` | `dns()`, `whois()` | dns & whois lookup |
| `downloader` | `tiktok()` | tiktok downloader |

Untuk 100.000 endpoint lainnya, pakai `atlys.get(path, params)`. For everything else, use `atlys.get(path, params)`.

## Error handling

```js
import { Atlys, AtlysError, AuthError, RateLimitError } from "@adiprmx/atlys";

try {
  await atlys.info.news();
} catch (err) {
  if (err instanceof AuthError) {
    console.error("key salah atau tidak ada");
  } else if (err instanceof RateLimitError) {
    console.error(`rate limit, coba lagi setelah ${err.retryAfter} detik`);
  } else if (err instanceof AtlysError) {
    console.error(err.code, err.message);
  }
}
```

Rate limit 429 otomatis di-retry dengan backoff (menghormati header `retry-after`). Matikan dengan `new Atlys(key, { autoRetry: false })`.

429s are auto-retried with backoff respecting the `retry-after` header. Disable with `new Atlys(key, { autoRetry: false })`.

## Opsi / Options

```js
new Atlys(apiKey, {
  baseUrl: "https://api.atlys.my.id", // default
  timeout: 30000,                     // ms, default 30000
  autoRetry: true,                    // default true
});
```

## Lisensi / License

MIT — (c) 2026 adiprmx
