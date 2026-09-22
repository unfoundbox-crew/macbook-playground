# Apple M-series chip spec table (M1 – M6), as of 2026-09-22

Compiled 2026-09-22 from Apple Newsroom / Apple tech-spec pages (primary) with Wikipedia used only as an index and for a few secondary values that Apple never published (flagged). Every numeric claim has a source URL beside it. Anything not found in a source is marked **UNVERIFIED**.

Source key (short names used in tables):

| Key | URL |
|---|---|
| A-M1 | https://www.apple.com/newsroom/2020/11/apple-unleashes-m1/ |
| A-M1PM | https://www.apple.com/newsroom/2021/10/introducing-m1-pro-and-m1-max-the-most-powerful-chips-apple-has-ever-built/ |
| A-M1U | https://www.apple.com/newsroom/2022/03/apple-unveils-m1-ultra-the-worlds-most-powerful-chip-for-a-personal-computer/ |
| A-M2 | https://www.apple.com/newsroom/2022/06/apple-unveils-m2-with-breakthrough-performance-and-capabilities/ |
| A-M2PM | https://www.apple.com/newsroom/2023/01/apple-unveils-m2-pro-and-m2-max-next-generation-chips-for-next-level-workflows/ |
| A-M2U | https://www.apple.com/newsroom/2023/06/apple-introduces-m2-ultra/ |
| A-M3 | https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max-the-most-advanced-chips-for-a-personal-computer/ |
| A-M3U | https://www.apple.com/newsroom/2025/03/apple-reveals-m3-ultra-taking-apple-silicon-to-a-new-extreme/ |
| A-M4 | https://www.apple.com/newsroom/2024/05/apple-introduces-m4-chip/ |
| A-M4PM | https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/ |
| A-M5 | https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/ |
| A-M5MBP14 | https://www.apple.com/newsroom/2025/10/apple-unveils-new-14-inch-macbook-pro-powered-by-the-m5-chip/ |
| A-M5PM | https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/ |
| A-M5MBP | https://www.apple.com/newsroom/2026/03/apple-introduces-macbook-pro-with-all-new-m5-pro-and-m5-max/ |
| A-M5MBA | https://www.apple.com/newsroom/2026/03/apple-introduces-the-new-macbook-air-with-m5/ |
| A-M6U | https://www.apple.com/newsroom/2026/08/apple-introduces-m6-and-m5-ultra-for-a-big-leap-in-performance-and-ai-compute/ |
| A-MS26 | https://www.apple.com/newsroom/2026/08/apple-introduces-new-mac-studio-with-m5-max-and-m5-ultra/ |
| A-MM26 | https://www.apple.com/newsroom/2026/08/apple-unveils-a-more-powerful-mac-mini-featuring-the-all-new-m6-and-m5-pro/ |
| S-MBA-M1 | https://support.apple.com/en-us/111883 |
| S-MBP14-M3 | https://support.apple.com/en-us/117735 |
| S-MBP16-M3 | https://support.apple.com/en-us/117737 |
| S-MBP14-M4 | https://support.apple.com/en-us/121553 |
| S-MBP14-M5PM | https://support.apple.com/en-us/126318 |
| S-MBA13-M5 | https://support.apple.com/en-us/126320 |
| A-MBP-specs | https://www.apple.com/macbook-pro/specs/ |
| A-MS-specs | https://www.apple.com/mac-studio/specs/ |
| A-MM-specs | https://www.apple.com/mac-mini/specs/ |
| W-M1 | https://en.wikipedia.org/wiki/Apple_M1 |
| W-M2 | https://en.wikipedia.org/wiki/Apple_M2 |
| W-M3 | https://en.wikipedia.org/wiki/Apple_M3 |
| W-M4 | https://en.wikipedia.org/wiki/Apple_M4 |
| W-M5 | https://en.wikipedia.org/wiki/Apple_M5 |
| W-M6 | https://en.wikipedia.org/wiki/Apple_M6 |
| W-NE | https://en.wikipedia.org/wiki/Neural_Engine |
| MR-M6 | https://www.macrumors.com/2026/08/25/apple-reveals-m6/ |
| MR-MM26 | https://www.macrumors.com/2026/08/25/apple-announces-2026-mac-mini/ |
| MR-M6Macs | https://www.macrumors.com/2026/08/28/m6-chip-macs/ |
| MR-roadmap | https://www.macrumors.com/2026/07/27/mac-roadmap-2026/ |
| MR-M6MBP | https://www.macrumors.com/2026/06/25/m6-macbook-pro-2026/ |
| 9to5-M6 | https://9to5mac.com/2026/07/16/apples-m6-chip-is-coming-soon-heres-everything-we-know/ |
| AI-MM6 | https://appleinsider.com/inside/mac-mini/vs/m6-mac-mini-vs-m4-mac-mini-compact-powerhouses-compared |
| Hoxton-NE | https://www.hoxtonmacs.co.uk/blogs/news/your-mac-has-a-hidden-ai-chip-developers-are-finally-unlocking-it |
| MRF-Sept26 | https://forums.macrumors.com/threads/everything-apple-announced-at-the-september-2026-event.2488879/ |
| Xeno | https://xenospectrum.com/en/apple-silicon-chip-architecture/ |

---

## 0. Status summary as of 2026-09-22 (what exists vs. what is rumored)

| Family | Base | Pro | Max | Ultra |
|---|---|---|---|---|
| M1 | Shipped Nov 2020 (A-M1) | Shipped Oct 2021 (A-M1PM) | Shipped Oct 2021 (A-M1PM) | Shipped Mar 2022 (A-M1U) |
| M2 | Jun 2022 (A-M2) | Jan 2023 (A-M2PM) | Jan 2023 (A-M2PM) | Jun 2023 (A-M2U) |
| M3 | Oct 2023 (A-M3) | Oct 2023 (A-M3) | Oct 2023 (A-M3) | Mar 2025 (A-M3U) |
| M4 | May 2024 (A-M4) | Oct 2024 (A-M4PM) | Oct 2024 (A-M4PM) | **Never released** (W-M4: "M4 Ultra: does not exist") |
| M5 | Oct 15 2025 (A-M5) | Mar 3 2026 (A-M5PM) | Mar 3 2026 (A-M5PM) | Aug 25 2026, ships Sep 22 2026 (A-M6U, A-MS26) |
| M6 | Aug 25 2026, ships Sep 22 2026 in Mac mini (A-M6U, A-MM26) | **Not announced**; reported cancelled (MR-M6Macs, 9to5-M6) | **Not announced**; reported cancelled | **Not announced** |

- Apple's Sept 9 2026 event announced no Macs and no new M-series chips (MRF-Sept26). Rumor: an M6 14-inch MacBook Pro and M6 iMac in Oct 2026, M6 MacBook Air early 2027, M7 in 1H 2027 (MR-M6Macs, MR-roadmap). These are **UNVERIFIED / rumor**.
- Per Gurman via 9to5Mac: "Apple will only release the base-model M6 processor. It will not release any higher-end Pro, Max, or Ultra variants." (9to5-M6). Not confirmed by Apple.

---

## 1. Per-variant tables

### 1.1 M1 family (TSMC 5 nm, "N5" per W-M1; Apple says "5-nanometer" A-M1)

| Field | M1 | M1 Pro | M1 Max | M1 Ultra |
|---|---|---|---|---|
| Announce date | Nov 10 2020 (A-M1) | Oct 18 2021 (A-M1PM) | Oct 18 2021 (A-M1PM) | Mar 8 2022 (A-M1U) |
| Process | 5 nm (A-M1); N5 (W-M1) | 5 nm (A-M1PM) | 5 nm (A-M1PM) | 5 nm, 2x M1 Max dies (A-M1U) |
| Transistors | 16 B (A-M1) | 33.7 B (A-M1PM) | 57 B (A-M1PM) | 114 B (A-M1U) |
| CPU | 8 (4P + 4E) (A-M1) | up to 10 (8P + 2E); binned 8-core = 6P+2E (A-M1PM, W-M1) | 10 (8P + 2E) (A-M1PM) | 20 (16P + 4E) (A-M1U) |
| GPU cores | 7 or 8 (A-M1 "up to 8", W-M1) | 14 or 16 (A-M1PM "up to 16", W-M1) | 24 or 32 (A-M1PM, W-M1) | 48 or 64 (A-M1U "64-core", W-M1) |
| Neural Engine | 16-core, 11 TOPS (A-M1) | 16-core (A-M1PM); 11 TOPS (W-M1) | 16-core; 11 TOPS (W-M1) | 32-core, 22 TOPS (A-M1U) |
| TOPS basis | Apple's 11 TOPS figure; Hoxton measured 11.19 FP16 TFLOPS and states INT8 = FP16 rate on M1–M3 (Hoxton-NE) — so effectively FP16-class | same | same | same |
| Memory | 8 / 16 GB (S-MBA-M1) | up to 32 GB (A-M1PM); 16/32 (W-M1) | up to 64 GB (A-M1PM); 32/64 (W-M1) | up to 128 GB (A-M1U); 64/128 (W-M1) |
| Bandwidth | 68.3 GB/s (W-M1) — Apple newsroom gives no figure | 200 GB/s (A-M1PM) | 400 GB/s (A-M1PM) | 800 GB/s (A-M1U) |
| LPDDR | LPDDR4X-4266 (W-M1) | LPDDR5-6400 (W-M1) | LPDDR5-6400 (W-M1) | LPDDR5-6400 (W-M1) |
| Media engine | H.264/HEVC encode/decode engines (A-M1); no ProRes engine | 1 ProRes accelerator (A-M1PM) | 2 ProRes accelerators (A-M1PM) | 2x M1 Max ProRes capability; 18 streams 8K ProRes 422 (A-M1U) |
| AV1 | none | none | none | none |
| Display | 1 external up to 6K@60 (S-MBA-M1) | multiple external displays (A-M1PM) | multiple external displays (A-M1PM) | multiple external displays (A-M1U) |
| Thunderbolt | Thunderbolt 3 / USB 4, 40 Gb/s (S-MBA-M1, A-M1) | Thunderbolt 4 (A-M1PM) | Thunderbolt 4 (A-M1PM) | Thunderbolt 4 (W-M1) |
| MacBooks | MacBook Air 13", MacBook Pro 13" (A-M1) | MacBook Pro 14"/16" (A-M1PM) | MacBook Pro 14"/16" (A-M1PM) | none (Mac Studio only) (A-M1U) |
| Other products | Mac mini, iMac 24", iPad Pro, iPad Air (W-M1) | Mac Studio (W-M1) | Mac Studio (W-M1) | Mac Studio (A-M1U) |
| Architecture notes | ARMv8.4-A, Firestorm/Icestorm cores, max 3.2 GHz (W-M1); unified memory, on-package DRAM | — | — | **UltraFusion**: silicon interposer, >10,000 signals, 2.5 TB/s inter-die (A-M1U) |

### 1.2 M2 family (TSMC "second-generation 5 nm" per Apple; N5P per W-M2)

| Field | M2 | M2 Pro | M2 Max | M2 Ultra |
|---|---|---|---|---|
| Announce date | Jun 6 2022 (A-M2) | Jan 17 2023 (A-M2PM) | Jan 17 2023 (A-M2PM) | Jun 5 2023 (A-M2U) |
| Process | 2nd-gen 5 nm (A-M2); N5P (W-M2) | same (A-M2PM) | same | same (A-M2U) |
| Transistors | 20 B (A-M2) | 40 B (A-M2PM) | 67 B (A-M2PM) | 134 B (A-M2U) |
| CPU | 8 (4P + 4E) (W-M2) | 10 or 12 (up to 8P + 4E; binned 6P+4E) (A-M2PM) | 12 (8P + 4E) (A-M2PM) | 24 (16P + 8E) (A-M2U) |
| GPU cores | 8 or 10 (A-M2 "up to 10") | 16 or 19 (A-M2PM "up to 19") | 30 or 38 (A-M2PM "up to 38") | 60 or 76 (A-M2U) |
| Neural Engine | 16-core, 15.8 TOPS (A-M2) | 16-core, 15.8 TOPS (A-M2PM) | 16-core, 15.8 TOPS (A-M2PM) | 32-core, 31.6 TOPS (A-M2U) |
| TOPS basis | FP16-class (Hoxton measured 16.07 FP16 TFLOPS; INT8 = FP16 on M2) (Hoxton-NE) | same | same | same |
| Memory | 8/16/24 GB (W-M2); "up to 24 GB" (A-M2) | up to 32 GB (A-M2PM) | up to 96 GB (A-M2PM) | up to 192 GB (A-M2U) |
| Bandwidth | 100 GB/s (A-M2) | 200 GB/s (A-M2PM) | 400 GB/s (A-M2PM) | 800 GB/s (A-M2U) |
| LPDDR | LPDDR5-6400 (W-M2) | LPDDR5-6400 (W-M2) | LPDDR5-6400 (W-M2) | LPDDR5-6400 (W-M2) |
| Media engine | 8K H.264/HEVC decode; ProRes engine (A-M2) | 1 video encode + 1 ProRes engine (A-M2PM) | 2 video encode + 2 ProRes engines (A-M2PM) | 2x M2 Max; 22 streams 8K ProRes 422 (A-M2U) |
| AV1 | none (W-M2: not listed) | none | none | none |
| Display | not stated in A-M2 | not stated in A-M2PM | not stated | up to 6 Pro Display XDR (A-M2U) |
| Thunderbolt | Thunderbolt 3/USB 4 on MacBooks; TB4 on Mac mini (W-M2) | Thunderbolt 4 (W-M2) | Thunderbolt 4 (W-M2) | Thunderbolt 4 (W-M2) |
| MacBooks | MacBook Air 13" (2022), 15" (2023); MacBook Pro 13" (2022) (A-M2, W-M2) | MacBook Pro 14"/16" (A-M2PM) | MacBook Pro 14"/16" (A-M2PM) | none |
| Other products | Mac mini, iPad Pro, iPad Air, Vision Pro (W-M2) | Mac mini (A-M2PM) | Mac Studio (W-M2) | Mac Studio, Mac Pro (A-M2U) |
| Architecture notes | max 3.49 GHz (W-M2) | — | — | UltraFusion, >10,000 signals, 2.5 TB/s; appears as one chip to software (A-M2U) |

### 1.3 M3 family (TSMC 3 nm; N3B per W-M3)

| Field | M3 | M3 Pro | M3 Max | M3 Ultra |
|---|---|---|---|---|
| Announce date | Oct 30 2023 (A-M3) | Oct 30 2023 (A-M3) | Oct 30 2023 (A-M3) | Mar 5 2025 (A-M3U) |
| Process | 3 nm (A-M3); N3B (W-M3) | same | same | 2x M3 Max dies (A-M3U) |
| Transistors | 25 B (A-M3) | 37 B (A-M3) | 92 B (A-M3) | 184 B (A-M3U) |
| CPU | 8 (4P + 4E) (A-M3) | 12 (6P + 6E); binned 11 = 5P+6E (A-M3, W-M3) | 16 (12P + 4E) or 14 (10P + 4E) (S-MBP16-M3) | 32 (24P + 8E); binned 28 (W-M3) (A-M3U) |
| GPU cores | 10 (A-M3); 8 binned (W-M3) | 18 (A-M3); 14 binned (W-M3) | 40 or 30 (S-MBP16-M3) | up to 80 (A-M3U); 60 binned (W-M3) |
| Neural Engine | 16-core, 18 TOPS (W-M3, W-NE); Apple: "60% faster than M1" (A-M3) | 16-core, 18 TOPS (W-M3) | 16-core, 18 TOPS (W-M3) | 32-core (A-M3U); 36 TOPS (W-M3) |
| TOPS basis | FP16-class (Hoxton: 18.59 FP16 TFLOPS, INT8 = FP16 on M3) (Hoxton-NE) | same | same | same |
| Memory | 8/16/24 GB (S-MBP14-M3) | 18 or 36 GB (S-MBP16-M3) | 36/48/64/96/128 GB (S-MBP16-M3) | 96 GB base, up to 512 GB (A-M3U) |
| Bandwidth | 100 GB/s (S-MBP14-M3) | 150 GB/s (S-MBP16-M3) | 300 GB/s (14-core) / 400 GB/s (16-core) (S-MBP16-M3) | "over 800 GB/s" (A-M3U) |
| LPDDR | LPDDR5-6400 (W-M3) | LPDDR5-6400 (W-M3) | LPDDR5-6400 (W-M3) | LPDDR5-6400 (W-M3) |
| Media engine | H.264/HEVC/ProRes/ProRes RAW; 1 ProRes engine (S-MBP14-M3) | 1 ProRes engine (S-MBP16-M3) | 2 ProRes engines (S-MBP16-M3) | 4 ProRes engines; 24 streams 8K ProRes 422 (A-M3U) |
| AV1 | **AV1 decode** (first M-series with it) (A-M3, S-MBP14-M3) | AV1 decode (S-MBP16-M3) | AV1 decode (S-MBP16-M3) | AV1 decode (W-M3) |
| Display | 1 external 6K@60 (2 with lid closed) (S-MBP14-M3) | up to 2 external (S-MBP16-M3) | up to 4 external (S-MBP16-M3) | up to 8 Pro Display XDR (A-M3U) |
| Thunderbolt | Thunderbolt 3 / USB 4 (S-MBP14-M3) | Thunderbolt 4 (S-MBP16-M3) | Thunderbolt 4 (S-MBP16-M3) | **Thunderbolt 5**, 120 Gb/s (A-M3U) |
| MacBooks | MacBook Air 13"/15", MacBook Pro 14" (W-M3) | MacBook Pro 14"/16" (A-M3) | MacBook Pro 14"/16" (A-M3) | none |
| Other products | iMac 24", iPad Air (W-M3) | — | Mac Studio (W-M3) | Mac Studio (A-M3U) |
| Architecture notes | New GPU: **Dynamic Caching**, **hardware ray tracing**, **mesh shading** (A-M3) | same | same | UltraFusion, >10,000 connections, >2.5 TB/s (A-M3U) |

### 1.4 M4 family (Apple: "second-generation 3 nm"; N3E per W-M4). No M4 Ultra.

| Field | M4 | M4 Pro | M4 Max |
|---|---|---|---|
| Announce date | May 7 2024 (A-M4) | Oct 30 2024 (A-M4PM) | Oct 30 2024 (A-M4PM) |
| Process | 2nd-gen 3 nm (A-M4); N3E (W-M4) | same (A-M4PM) | same |
| Transistors | 28 B (A-M4) | **UNVERIFIED** (not in A-M4PM or W-M4) | **UNVERIFIED** |
| CPU | up to 10 (4P + 6E); binned 8/9-core = 3P (A-M4, W-M4) | up to 14 (10P + 4E); 12-core = 8P+4E (A-M4PM, S-MBP14-M4) | up to 16 (12P + 4E); 14-core = 10P+4E (A-M4PM, S-MBP14-M4) |
| GPU cores | 8/9/10 (W-M4); 10 max (A-M4) | 16 or 20 (S-MBP14-M4) | 32 or 40 (S-MBP14-M4) |
| Neural Engine | 16-core, 38 TOPS (A-M4) | 16-core; Apple "up to 2x faster than prior gen" (A-M4PM); 38 TOPS (W-M4) | 16-core; 38 TOPS (W-M4) |
| TOPS basis | **INT8** — Hoxton measured M4 at 18.64 FP16 TFLOPS vs 35.15 INT8 TOPS, i.e. Apple's 38 figure is INT8-class; earlier generations were quoted at FP16-equivalent rates (Hoxton-NE, W-NE) | same | same |
| Memory | 8–32 GB (W-M4); up to 32 GB (A-M4PM) | 24/36/48/64 GB (S-MBP14-M4); up to 64 GB (A-M4PM) | 36/48/64/128 GB (S-MBP14-M4); up to 128 GB (A-M4PM) |
| Bandwidth | 120 GB/s (A-M4PM) | 273 GB/s (A-M4PM) | 546 GB/s (40-core GPU) / 410 GB/s (32-core GPU) (A-M4PM, S-MBP14-M4) |
| LPDDR | LPDDR5X-7500 (W-M4) | LPDDR5X-8533 (W-M4) | LPDDR5X-8533 (W-M4) |
| Media engine | H.264/HEVC/ProRes/ProRes RAW; AV1 decode (A-M4) | 1 ProRes engine, AV1 decode (S-MBP14-M4) | 2 video encode + 2 ProRes engines, AV1 decode (A-M4PM, S-MBP14-M4) |
| Display | tandem-OLED display engine, 10–120 Hz ProMotion (A-M4); 2 external + built-in on Macs (A-M4PM) | up to 2 external 6K@60 or 1x 8K@60 (S-MBP14-M4) | up to 4 external (S-MBP14-M4) |
| Thunderbolt | Thunderbolt 4 (A-M4PM) | **Thunderbolt 5**, 120 Gb/s (A-M4PM) | Thunderbolt 5 (A-M4PM) |
| MacBooks | MacBook Air 13"/15", MacBook Pro 14" (W-M4, A-M4PM) | MacBook Pro 14"/16" (A-M4PM) | MacBook Pro 14"/16" (A-M4PM) |
| Other products | iPad Pro (7th gen), iPad Air, iMac, Mac mini (A-M4, W-M4) | Mac mini, Mac Studio (W-M4) | Mac Studio (W-M4) |
| Architecture notes | ARMv9.2-A; **SME (Scalable Matrix Extension)** supported, SVE not (W-M4); Apple: "next-generation ML accelerators" in P and E cores (A-M4); ray tracing, Dynamic Caching, mesh shading (W-M4) | same | same |

### 1.5 M5 family (Apple: "third-generation 3 nm"; N3P per W-M5)

| Field | M5 | M5 Pro | M5 Max | M5 Ultra |
|---|---|---|---|---|
| Announce date | Oct 15 2025 (A-M5) | Mar 3 2026 (A-M5PM) | Mar 3 2026 (A-M5PM) | Aug 25 2026; ships Sep 22 2026 (A-M6U, A-MS26) |
| Process | 3rd-gen 3 nm (A-M5); N3P (W-M5) | 3rd-gen 3 nm dies, **two dies ("Fusion Architecture")** (A-M5PM) | same, two dies (A-M5PM) | **quad-die**: UltraFusion joining two dual-die M5 Max (A-M6U) |
| Transistors | **UNVERIFIED** (Apple did not publish) | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** |
| CPU | 10 (4 "super"/performance + 6E); binned 9-core (S-MBA13-M5, W-M5). Note: Oct 2025 release said "4 performance + 6 efficiency" (A-M5); Apple's 2026 spec pages relabel these "super cores" (S-MBA13-M5) | 18 (6 super + 12 performance) or 15 (5 super + 10 performance); **no efficiency cores** (A-M5PM, S-MBP14-M5PM) | 18 (6 super + 12 performance) (A-M5PM) | 36 (12 super + 24 performance) or 30 (10 super + 20 performance) (A-M6U, A-MS-specs) |
| GPU cores | 8 or 10, Neural Accelerator per core (A-M5, S-MBA13-M5) | 16 or 20 (S-MBP14-M5PM) | 32 or 40 (S-MBP14-M5PM) | 64 or 80 (A-MS-specs) |
| Neural Engine | 16-core (A-M5); Apple gives no TOPS; W-M5 lists 42 TOPS (**UNVERIFIED**); Hoxton measured 36.49 INT8 TOPS / 19.31 FP16 TFLOPS (Hoxton-NE) | 16-core, "higher bandwidth connection to memory" (A-M5PM) | 16-core (A-M5PM) | 32-core (A-M6U, A-MS-specs) |
| TOPS basis | INT8 ≈ 1.9x FP16 on M5 per Hoxton measurement (Hoxton-NE) | — | — | — |
| Memory | 16/24/32 GB (S-MBA13-M5, A-MBP-specs) | 24/36/48/64 GB; "up to 64 GB" (A-M5PM, S-MBP14-M5PM) | 36/48/64/128 GB; "up to 128 GB" (A-M5PM, A-MS-specs) | 96 GB base; 256 / 512 GB (512 only with 36-core) (A-MS-specs, A-M6U) |
| Bandwidth | 153 GB/s (A-M5, S-MBA13-M5) | 307 GB/s (A-M5PM) | 614 GB/s (40-core GPU) / 460 GB/s (32-core GPU) (A-M5PM, S-MBP14-M5PM) | 1.2 TB/s (A-M6U); 1,228.8 GB/s (W-M5) |
| LPDDR | LPDDR5X-9600 (W-M5) | LPDDR5X-9600 (W-M5) | LPDDR5X-9600 (W-M5) | LPDDR5X-9600 (W-M5) |
| Media engine | H.264/HEVC/ProRes/ProRes RAW; 1 ProRes engine (S-MBA13-M5) | 1 ProRes engine (S-MBP14-M5PM) | 2 video encode + 2 ProRes engines (S-MBP14-M5PM, A-MBP-specs) | 4 ProRes engines; 33 streams 8K ProRes 422 (A-M6U, A-MS26) |
| AV1 | AV1 decode (S-MBA13-M5) — no AV1 encode listed | AV1 decode (A-M5PM) | AV1 decode (A-M5PM) | AV1 decode (A-M6U) |
| Display | up to 2 external (6K@60 / 4K@144 / 8K@60) (S-MBA13-M5, A-MBP-specs) | up to 3 external (S-MBP14-M5PM) | up to 4 external on MBP; up to 5 on Mac Studio (S-MBP14-M5PM, A-MS-specs) | up to 8 external (A-MS-specs) |
| Thunderbolt | Thunderbolt 4, 40 Gb/s (S-MBA13-M5, A-MBP-specs) | Thunderbolt 5, 120 Gb/s, own controller per port (A-M5PM) | Thunderbolt 5 (A-M5PM) | Thunderbolt 5; RDMA clustering (A-MS26) |
| MacBooks | MacBook Pro 14" (Oct 2025, $1,599) (A-M5MBP14); MacBook Air 13"/15" (Mar 2026, $1,099/$1,299) (A-M5MBA) | MacBook Pro 14"/16" (A-M5MBP) | MacBook Pro 14"/16" (A-M5MBP) | none |
| Other products | iPad Pro, Apple Vision Pro (A-M5) | Mac mini (Aug 2026, $1,699) (A-MM26) | Mac Studio ($2,499) (A-MS26) | Mac Studio ($5,499) (A-MS26) |
| Architecture notes | **Neural Accelerator in each GPU core** (>4x peak GPU AI compute vs M4); 3rd-gen ray tracing engine; **2nd-gen Dynamic Caching**; +15% MT CPU, +30% GPU, +45% RT vs M4 (A-M5) | **Fusion Architecture** (two dies as one SoC); **Memory Integrity Enforcement** (always-on memory safety, EMTE per W-M5); +30% CPU vs M4 Pro (A-M5PM, W-M5) | same as Pro (A-M5PM) | UltraFusion inter-die bandwidth **>4.4 TB/s** (A-M6U) |

### 1.6 M6 family (Apple: "first 2-nanometer chip"; TSMC N2 per W-M6 — Apple has not named N2 vs N2P, Xeno)

| Field | M6 | M6 Pro / Max / Ultra |
|---|---|---|
| Announce date | Aug 25 2026; ships Sep 22 2026 in Mac mini (A-M6U, A-MM26) | **Not announced as of 2026-09-22.** Reported (Gurman) not to exist; Apple to go straight to M7 Pro/Max in 2027 (9to5-M6, MR-M6Macs). **UNVERIFIED/rumor** |
| Process | 2 nm (A-M6U); TSMC N2 (W-M6) | — |
| Transistors | **UNVERIFIED** (not published) (Xeno) | — |
| CPU | 12 (2 super + 4 performance + 6 efficiency) (A-M6U) — Apple's first three-tier core config | — |
| GPU cores | 12, Neural Accelerator per core (A-M6U) | — |
| Neural Engine | **Dual 16-core** (32 cores total), "up to 2x peak compute over previous generations"; frameworks can use both simultaneously (A-M6U, MR-M6) | — |
| TOPS | **UNVERIFIED** (Apple gives no figure) | — |
| Memory | 16 / 24 / 32 GB (A-MM-specs) | — |
| Bandwidth | 153 GB/s (16 GB) / 170 GB/s (24 & 32 GB) (A-MM-specs, AI-MM6); "up to 170 GB/s" (A-M6U) | — |
| LPDDR | **UNVERIFIED** (not stated) | — |
| Media engine | H.264/HEVC/ProRes/ProRes RAW encode/decode, AV1 decode (A-MM-specs) | — |
| Display | up to 3 external (2x 6K@60 or 4K@165 + 1x 5K@60 / 4K@60 HDMI) (A-MM-specs, AI-MM6) | — |
| Thunderbolt | **Thunderbolt 4**, 40 Gb/s, DisplayPort 1.4 (A-MM-specs, A-MM26) | — |
| MacBooks | **None yet.** Rumor: M6 14" MacBook Pro Oct 2026, M6 MacBook Air 2027 (MR-M6Macs, MR-roadmap) — **UNVERIFIED** | — |
| Other products | Mac mini ($899) (A-MM26); rumored iMac 24" (MR-M6Macs) | — |
| Architecture notes | 2 nm; +1.2x MT vs M5, "world's fastest single-threaded"; ~30% more peak GPU AI compute vs M5; updated shader core, Dynamic Caching, hardware RT, +50% geometry rate; dual Neural Engine (A-M6U, MR-M6) | — |

---

## 2. Cross-generation feature timeline

| Feature | First appears | Source |
|---|---|---|
| Unified memory, on-package LPDDR | M1 (2020) | A-M1 |
| ProRes hardware engines | M1 Pro / M1 Max (2021) | A-M1PM |
| UltraFusion silicon interposer (2 dies, >10,000 signals, 2.5 TB/s) | M1 Ultra (2022) | A-M1U |
| AV1 decode | M3 family (2023) | A-M3 |
| Dynamic Caching, HW ray tracing, mesh shading | M3 family (2023) | A-M3 |
| ARMv9.2-A, SME, "next-gen ML accelerators" in CPU cores | M4 (2024) | A-M4, W-M4 |
| Neural Engine quoted at INT8 (38 TOPS) | M4 (2024) | A-M4, Hoxton-NE |
| Thunderbolt 5 | M4 Pro/Max (Oct 2024); M3 Ultra (Mar 2025) | A-M4PM, A-M3U |
| Neural Accelerator per GPU core, 3rd-gen RT, 2nd-gen Dynamic Caching | M5 (Oct 2025) | A-M5 |
| "Super core" naming; Pro/Max with 0 efficiency cores | M5 Pro/Max (Mar 2026) | A-M5PM, S-MBP14-M5PM |
| Fusion Architecture (two dies in one SoC below Ultra tier) | M5 Pro/Max (Mar 2026) | A-M5PM |
| Memory Integrity Enforcement | M5 Pro/Max (Mar 2026) | A-M5PM |
| Quad-die UltraFusion, >4.4 TB/s inter-die | M5 Ultra (Aug 2026) | A-M6U |
| 2 nm; 3-tier CPU (super/perf/eff); dual Neural Engine | M6 (Aug 2026) | A-M6U |
| AV1 **encode** | Not found on any M-series through M6 (all spec pages list "AV1 decode" only) | S-MBA13-M5, A-MM-specs |

## 3. Package / die notes

- All M-series are SoCs with LPDDR packaged on the same substrate ("unified memory") (A-M1).
- Ultra chips (M1/M2/M3 Ultra) join two Max dies with UltraFusion: silicon interposer, >10,000 signals, 2.5 TB/s (A-M1U, A-M2U, A-M3U).
- M5 Pro / M5 Max are themselves two dies ("Fusion Architecture", A-M5PM); M5 Ultra therefore has four dies, presented to software as one processor, with UltraFusion inter-die bandwidth >4.4 TB/s (A-M6U, Xeno).
- No M4 Ultra was ever released; Mac Studio 2025 paired M4 Max with M3 Ultra (W-M4, A-M3U).

## 4. Open uncertainties

1. Transistor counts for M4 Pro, M4 Max, all M5 variants and M6 were never published by Apple — UNVERIFIED.
2. Neural Engine TOPS for M5 and M6 not published by Apple; W-M5's "42 TOPS" is unsourced here. Hoxton's measured 36.5 INT8 TOPS for M5 is third-party.
3. Process-node designations N5/N5P/N3B/N3E/N3P/N2 come from Wikipedia/reporting; Apple only says "5 nm", "2nd-gen 5 nm", "3 nm", "2nd/3rd-gen 3 nm", "2 nm".
4. LPDDR generation/speed per chip is from Wikipedia; Apple does not publish it. M6 memory type unknown.
5. M6 Pro/Max/Ultra cancellation and M6 MacBook Pro (Oct 2026) / M7 (1H 2027) are rumors (Gurman via 9to5Mac/MacRumors), not Apple statements.
6. Some Apple support-page extractions conflated Pro and Max rows (e.g. "M5 Pro 128 GB", "M4 Pro 410 GB/s"); these were rejected in favor of Apple newsroom figures (M5 Pro max 64 GB / 307 GB/s; M4 Pro 273 GB/s).
