---
name: project-memory
description: Loads and updates concise cross-session project memory, persistent user rules, and optional tools reference under .mandor/. Use only when durable context is valuable.
---

# Project Memory

Mandor mengelola memory langsung di session aktif. Jangan spawn subagent. Skill ini memberi prosedur; Mandor tetap harus memanggilnya pada trigger wajib di bawah.

## Paths

- `.mandor/agents/memory/main.md`: peta codebase dan cara menjalankan project
- `.mandor/agents/memory/concept.md`: konsep domain dan keputusan desain stabil
- `.mandor/agents/memory/changes.md`: index perubahan material
- `.mandor/agents/memory/record-changes/`: riwayat perubahan material
- `.mandor/agents/rules.md`: aturan user yang berlaku lintas task
- `.mandor/agents/memory/tools-reference.md`: dokumentasi tool opsional

## Load

Sebelum file mutation pertama dalam repository, baca `.mandor/agents/rules.md` bila ada. Baca `main.md`/`concept.md` hanya untuk area relevan. Jangan membuka semua change record. Source aktual mengalahkan memory yang stale.

Setelah compaction, reload rules sebelum mutation berikutnya.

Missing `.mandor/` adalah kondisi normal pada project baru, bukan error. Lanjutkan dari source aktual.

## Update

Update sekali setelah hasil final stabil bila perubahan memengaruhi arsitektur, behavior penting, ownership, contract, dependency, project command, atau keputusan yang berguna pada session berikutnya. Ini adalah gate wajib sebelum final response untuk perubahan material.

Jangan mencatat typo, formatting, atau quick fix lokal. Jika `.mandor/` belum ada, buat parent structure yang diperlukan pada update material pertama. Jaga ringkasan tetap pendek dan jangan menyimpan secret.

## Rules

Persist hanya aturan yang jelas berlaku lintas task. Pernyataan user seperti "selalu", "jangan pernah", dan "kedepannya" harus disimpan pada turn yang sama; buat `.mandor/agents/` bila belum ada. Jika request aktif bertentangan dengan rule, tanyakan apakah pengecualian satu kali atau perubahan permanen.

## Tools Reference

Jangan fetch saat startup. Refresh hanya jika diminta atau ketika tool yang dibutuhkan tidak dijelaskan oleh runtime. Query section relevan saja; schema runtime tetap authoritative.
