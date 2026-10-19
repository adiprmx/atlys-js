# AI Context — atlys-js (PUBLIK)

> Repo ini PUBLIK. JavaScript SDK untuk Atlys API. Package `@adiprmx/atlys` di npm.

## Fungsi repo ini

Ini **toolkit JavaScript** untuk pakai Atlys API. Isinya:
- Package `@adiprmx/atlys` (dual ESM+CJS via esbuild)
- ~20 helper function
- Test suite (7/7 lolos)

## Hubungan dengan repo lain

| Repo | Hubungan |
|------|----------|
| `adiprmx/osint-api` (privat) | Dapur utama. SDK ini adalah klien dari API tersebut. |
| `adiprmx/atlys-python` (publik) | SDK Python (saudara kandung, fitur setara). |

## Aturan kerja di repo ini

1. **Setiap update kode → otomatis bump versi + publish npm + update repo GitHub.** (Aturan tetap Adip 2026-10-17.)
2. Publish WAJIB via `~/workspace/custom-connectors/custom.npm/bin/npm_publish.py` (npm CLI langsung gagal auth).
3. Prefix API key: `atlys_` (sudah diupdate dari `aclys_` typo).
4. API base: `https://api.atlys.my.id`, auth via header `x-api-key`.

## Status

- v0.1.0 sudah rilis di repo.
- **SUDAH LIVE di npm** sebagai `@adiprmx/atlys`.

---
*Update dokumen ini setiap ada keputusan baru. Terakhir: 2026-10-19.*
