# Physical Hardware Anatomy: MacBook Pro (14/16-inch, M-series) and MacBook Air (M-series)

Research date: 2026-09-22. Every numeric claim carries a source URL. Items not confirmed by a fetched source are marked **UNVERIFIED**.

Scope: the models shipping as of September 2026 (MacBook Pro 14-inch M5 [Oct 2025]; MacBook Pro 14/16-inch M5 Pro / M5 Max [Mar 2026]; MacBook Air 13/15-inch M5 [Mar 2026]), with teardown-level anatomy drawn from iFixit's 2021-2026 teardowns of the same chassis families (the 14/16-inch Pro chassis has been unchanged since Oct 2021; the Air chassis since the M2 in 2022).

---

## 0. Lineup as of September 2026 (what is "current")

| Model | Chip | Announced / available | Source |
|---|---|---|---|
| MacBook Pro 14-inch (M5) | M5 (10-core CPU: 4 "super" + 6 efficiency; 10-core GPU; 16-core Neural Engine; 153 GB/s) | Introduced 2025 (Oct 15, 2025 chip launch) | https://support.apple.com/en-us/125405 ; https://en.wikipedia.org/wiki/Apple_M5 |
| MacBook Pro 14-inch / 16-inch (M5 Pro, M5 Max) | Up to 18-core CPU (6 super + 12 performance); M5 Pro up to 20-core GPU, 64 GB, 307 GB/s; M5 Max up to 40-core GPU, 128 GB, 614 GB/s | Pre-order Mar 4, 2026; available Mar 11, 2026 | https://www.apple.com/newsroom/2026/03/apple-introduces-macbook-pro-with-all-new-m5-pro-and-m5-max/ |
| MacBook Air 13-inch / 15-inch (M5) | M5 10-core CPU, 8- or 10-core GPU, 153 GB/s | Pre-order Mar 4, 2026; available Mar 11, 2026 | https://www.apple.com/newsroom/2026/03/apple-introduces-the-new-macbook-air-with-m5/ |

Prices (US): 14" M5 $1,699; 14" M5 Pro $2,199; 16" M5 Pro $2,699; 14" M5 Max $3,599; 16" M5 Max $3,899 (https://www.apple.com/newsroom/2026/03/apple-introduces-macbook-pro-with-all-new-m5-pro-and-m5-max/). MacBook Air 13" $1,099; 15" $1,299 (https://www.apple.com/newsroom/2026/03/apple-introduces-the-new-macbook-air-with-m5/).

**OLED status (Sept 2026): no shipping MacBook has an OLED panel.** All current MacBook Pros use mini-LED "Liquid Retina XDR"; all current Airs use an LED-backlit IPS LCD (https://en.wikipedia.org/wiki/MacBook_Pro_(Apple_silicon) ; https://support.apple.com/en-us/126320). RUMOR (Bloomberg/Gurman via MacRumors, Sept 14, 2026): touch-enabled OLED 14/16-inch MacBook Pro ("MacBook Ultra" branding possible) with Dynamic Island replacing the notch, thinner design, M5 Pro/M5 Max chips, in testing on macOS 27.1, expected before end of 2026 (https://www.macrumors.com/2026/09/14/oled-macbook-pro-macos-27-1-testing/). Whether it is a **tandem** OLED is **UNVERIFIED** in the sources fetched. Roadmap (MacRumors, Jul 27, 2026): 14-inch MacBook Pro with M6 (2 nm) expected fall 2026; M6 MacBook Airs 2027; OLED MacBook Air not before 2028 (https://www.macrumors.com/2026/07/27/mac-roadmap-2026/).

---

## 1. Best public sources for reference dimensions

- Apple marketing tech specs (all current models on one page):
  - MacBook Pro: https://www.apple.com/macbook-pro/specs/
  - MacBook Air: https://www.apple.com/macbook-air/specs/
- Apple Support per-model tech-spec pages (stable, archived per model):
  - MacBook Pro (14-inch, M5): https://support.apple.com/en-us/125405
  - MacBook Air (13-inch, M5): https://support.apple.com/en-us/126320
- Apple Self Service Repair manuals (module names, exploded procedure, screw tables):
  - MacBook Pro (14-inch, M5 Pro/M5 Max), Manual ID RZHNPW, published Mar 12, 2026: https://support.apple.com/en-us/125819
  - MacBook Pro (16-inch, M5 Pro/M5 Max): https://support.apple.com/en-us/125836
  - MacBook Pro (14-inch, M5): https://support.apple.com/en-us/123173
  - MacBook Air (13-inch, M5), Manual ID KSTVDR, published Mar 12, 2026: https://support.apple.com/en-us/125721
- Apple Product Environmental Reports (materials): https://www.apple.com/environment/pdf/products/notebooks/MacBook_Pro_14-inch_M5_PER_Oct2025.pdf ; https://www.apple.com/environment/pdf/products/notebooks/MacBook_Air_M5_PER_Mar2026.pdf
- iFixit device pages / teardowns:
  - M5 MacBook Pro teardown (Oct 2025): https://www.ifixit.com/News/114046/m5-macbook-pro-teardown
  - 2021 MacBook Pro teardown (chassis baseline, chip IDs): https://www.ifixit.com/News/54122/macbook-pro-2021-teardown
  - M2 Pro 14" teardown (package/NAND changes): https://www.ifixit.com/News/71442/tearing-down-the-14-macbook-pro-with-apples-help
  - M4 Pro teardown: https://www.ifixit.com/News/106300/macbook-pro-m4-pro-teardown-new-model-same-repair-situation
  - M2 MacBook Air teardown: https://www.ifixit.com/News/62674/m2-macbook-air-teardown-apple-forgot-the-heatsink
  - M2 Air logic-board chip ID guide: https://www.ifixit.com/Guide/Macbook+Air+(M2+2022)+Logic+Board+and+Chip+Identification/151816
  - 15" MacBook Air teardown: https://www.ifixit.com/News/76973/15-macbook-air-teardown-bigger-and-better-maybe-not-en
  - Device pages: https://www.ifixit.com/Device/MacBook_Pro_14%22_2026 ; https://www.ifixit.com/Device/MacBook_Air_13%22_2026_%28M5%29 ; https://www.ifixit.com/Device/MacBook_Air_15%22_2026

---

## 2. External dimensions, weights, finishes (Apple official)

### MacBook Pro 14-inch (M5, M5 Pro, M5 Max) — https://www.apple.com/macbook-pro/specs/
- Height 0.61 in (1.55 cm); width 12.31 in (31.26 cm); depth 8.71 in (22.12 cm)
- Weight: M5 3.4 lb (1.55 kg); M5 Pro 3.5 lb (1.60 kg); M5 Max 3.6 lb (1.62 kg)
- Colors: Space Black, Silver

### MacBook Pro 16-inch (M5 Pro, M5 Max) — https://www.apple.com/macbook-pro/specs/
- Height 0.66 in (1.68 cm); width 14.01 in (35.57 cm); depth 9.77 in (24.81 cm)
- Weight: M5 Pro 4.7 lb (2.14 kg); M5 Max 4.7 lb (2.15 kg)
- Colors: Space Black, Silver

### MacBook Air 13-inch (M5) — https://www.apple.com/macbook-air/specs/ ; https://support.apple.com/en-us/126320
- Height 0.44 in (1.13 cm); width 11.97 in (30.41 cm); depth 8.46 in (21.5 cm); weight 2.7 lb (1.23 kg)
- Colors: Sky Blue, Silver, Starlight, Midnight

### MacBook Air 15-inch (M5) — https://www.apple.com/macbook-air/specs/
- Height 0.45 in (1.15 cm); width 13.40 in (34.04 cm); depth 9.35 in (23.76 cm); weight 3.3 lb (1.51 kg)
- Colors: Sky Blue, Silver, Starlight, Midnight

---

## 3. Unibody chassis (aluminium, anodizing)

- Construction: CNC-machined aluminium unibody in two main shells: the **top case** (palm rest + keyboard well + houses battery, logic board, speakers, trackpad) and a flat **bottom case** (a.k.a. bottom cover) held by pentalobe screws plus hidden snap-in clips. Apple's repair manuals name the top case module "Top Case with Battery and Keyboard" (Pro) / "Top Case with Keyboard" (Air) (https://support.apple.com/en-us/125819 ; https://support.apple.com/en-us/125721). Bottom case uses "pentalobe screws, a five-pointed, star-shaped fastener"; internals use Torx T3/T5 or Torx Plus (https://www.ifixit.com/News/116077/everything-you-need-to-know-before-you-fix-a-macbook). M5 MacBook Pro bottom cover: P5 pentalobe screws plus clip-based fastening; antenna bracket uses tiny P2 pentalobe screws (https://www.ifixit.com/News/114046/m5-macbook-pro-teardown).
- Shape: 2021+ 14/16" Pro is "a thicker and more-squared design" with a "double anodized" black keyboard well (https://en.wikipedia.org/wiki/MacBook_Pro_(Apple_silicon)). iFixit: "square-edged aluminum cases reminiscent of early 2000s designs"; the black keyboard surround is not a separate module (https://www.ifixit.com/News/54122/macbook-pro-2021-teardown).
- Material: "100% recycled aluminum in the enclosure" (MacBook Pro 14-inch M5 PER: https://www.apple.com/environment/pdf/products/notebooks/MacBook_Pro_14-inch_M5_PER_Oct2025.pdf). Same claim for the M3-era Pro (https://www.apple.com/newsroom/2023/10/apple-unveils-new-macbook-pro-featuring-m3-chips/).
- Finish: anodized aluminium. **Space Black** (introduced Oct 2023 on M3 Pro/Max; replaced Space Gray for Pro/Max) "features a breakthrough chemistry that forms an anodization seal to greatly reduce fingerprints" (https://www.apple.com/newsroom/2023/10/apple-unveils-new-macbook-pro-featuring-m3-chips/). Color history: 2021-2023 Silver/Space Gray; 2023-2026 Silver/Space Black (https://en.wikipedia.org/wiki/MacBook_Pro_(Apple_silicon)).
- Air chassis: the M4/M5 Air keeps "the same chassis as the M2 model that was introduced in 2022" (https://www.macrumors.com/2025/03/14/ifixit-m4-macbook-air-teardown/). Air bottom case: four screws (https://www.ifixit.com/News/62674/m2-macbook-air-teardown-apple-forgot-the-heatsink). Apple describes the Air as a "thin, light, fanless aluminum design" (https://www.apple.com/newsroom/2026/03/apple-introduces-the-new-macbook-air-with-m5/).
- Other structural bits: Pro has a "Vent/Antenna Module" (the rear vent bar between the hinges, doubling as the Wi-Fi antenna carrier) and "Display Hinge Covers" (https://support.apple.com/en-us/125819). Air: "Display Hinge Covers", plus "Right Speaker with Antenna" / "Left Speaker with Antenna" (antennas are integrated into the speaker modules) (https://support.apple.com/en-us/125721).
- Recycled steel: "Steel in speakers and keyboard (80% or more recycled)" (https://www.apple.com/environment/pdf/products/notebooks/MacBook_Pro_14-inch_M5_PER_Oct2025.pdf) — i.e., there are steel parts inside the keyboard and speaker assemblies.

---

## 4. Display assembly

### MacBook Pro 14/16": Liquid Retina XDR (mini-LED)
- 14.2-inch diagonal, 3024×1964 at 254 ppi; 16.2-inch diagonal, 3456×2234 at 254 ppi (https://www.apple.com/macbook-pro/specs/)
- XDR brightness 1000 nits sustained full-screen, 1600 nits peak HDR; SDR up to 1000 nits; 1,000,000:1 contrast; ProMotion up to 120 Hz; optional nano-texture glass (https://support.apple.com/en-us/125405 ; https://www.apple.com/macbook-pro/specs/)
- Panel type: IPS-type LCD with an always-on mini-LED backlight behind it ("an LCD panel which appears to be IPS-like in design ... always-active mini-LED backlight") (https://www.techspot.com/review/2365-apple-macbook-pro-xdr-display/). The M4 generation (2024+) added quantum-dot film and the nano-texture option (https://en.wikipedia.org/wiki/MacBook_Pro_(Apple_silicon)).
- Backlight stack (for the model): glass cover → polarizer/LCD cell (IPS, oxide TFT) → diffuser/optical films (incl. quantum-dot film from M4 on) → mini-LED array on a backplane → display housing. Local dimming zones: **14-inch 2,010 zones; 16-inch 2,554 zones** (https://en.wikipedia.org/wiki/MacBook_Pro_(Apple_silicon)). Mini-LED count is reported as "10,000" for the 16-inch by TechSpot (https://www.techspot.com/review/2365-apple-macbook-pro-xdr-display/); a MacRumors forum thread claims the 14-inch has ~8,000 (https://forums.macrumors.com/threads/macbook-pro-14-only-has-8-000-mini-leds.2319327/) — **UNVERIFIED** (forum). Order of the film layers above is a general description and is **UNVERIFIED** at teardown level.
- Display cables: 2021 redesign gave the display flex cables "roughly 100% more slack" to avoid flexgate (https://www.ifixit.com/News/54122/macbook-pro-2021-teardown).
- Display is a single sealed module ("Display" in Apple's manual); swapping it without Apple's Repair Assistant loses True Tone (https://www.ifixit.com/News/116077/everything-you-need-to-know-before-you-fix-a-macbook). On the M5 Pro, the hinge/display "requires antenna bracket removal before access" (https://www.ifixit.com/News/114046/m5-macbook-pro-teardown).
- Backlight driver on the Air's board: Texas Instruments LP8548B1 LCD backlight driver, TI TPS65157B0 display power management (https://www.ifixit.com/Guide/Macbook+Air+(M2+2022)+Logic+Board+and+Chip+Identification/151816) — the Pro's mini-LED driver ICs are **UNVERIFIED** in fetched sources.

### MacBook Air 13/15": Liquid Retina (LED-backlit IPS LCD, no local dimming)
- 13.6-inch, 2560×1664 at 224 ppi, 500 nits, "LED-backlit display with IPS technology" (https://support.apple.com/en-us/126320)
- 15.3-inch, 2880×1864 at 224 ppi, 500 nits (https://www.apple.com/macbook-air/specs/)
- Both Air and Pro displays have a notch at the top center (see §5).

---

## 5. Notch camera module and sensors

- The notch houses the camera sensor, the camera indicator LED, and the ambient light sensor, with "vast stretches of additional notch to either side" (https://www.ifixit.com/News/54122/macbook-pro-2021-teardown).
- Camera: 12MP Center Stage camera with Desk View, 1080p video, on all current Pros and Airs (https://www.apple.com/macbook-pro/specs/ ; https://www.apple.com/macbook-air/specs/). The M4 Air's webcam was one of only two component changes vs. M3 (https://www.macrumors.com/2025/03/14/ifixit-m4-macbook-air-teardown/).
- Ambient light sensor: lives in the notch on the Pro (above); it drives True Tone and the keyboard backlight ("Backlit Magic Keyboard with ... ambient light sensor") (https://en.wikipedia.org/wiki/MacBook_Pro_(Apple_silicon)). Gold wire in cameras is 100% recycled (https://www.apple.com/environment/pdf/products/notebooks/MacBook_Pro_14-inch_M5_PER_Oct2025.pdf).
- No Face ID / no depth module on any current MacBook (Apple specs pages list only Touch ID).

---

## 6. Hinge and lid angle sensor

- Two hinges at the rear corners, hidden under "Display Hinge Covers" (a serviceable part on both Pro and Air) (https://support.apple.com/en-us/125819 ; https://support.apple.com/en-us/125721). On the Air, "hinge covers reinforce hinge structure but difficult to remove" (https://www.ifixit.com/News/62674/m2-macbook-air-teardown-apple-forgot-the-heatsink).
- **Lid Angle Sensor** (a separate service part on both current Pro and Air): a magnet is embedded in the hinge (with an etched arrow marking its orientation); a sensor on a flex cable inside the bottom case near the hinge reads the magnet's rotation, giving continuous lid angle (and presumably open/close counts) rather than the binary closed/open of older Hall-effect lid sensors (https://www.ifixit.com/News/33952/apple-put-a-hinge-sensor-in-the-16-macbook-pro-what-could-it-be-for). Apple lists "Lid Angle Sensor" replacement pages for MacBook Air (13-inch, M5) (https://support.apple.com/en-lk/125717) and M4 Air (https://support.apple.com/en-ug/121946).
- Historical lid-closed detection used Hall-effect sensors + a magnet in the display bezel (https://www.ifixit.com/News/33952/apple-put-a-hinge-sensor-in-the-16-macbook-pro-what-could-it-be-for). Exact sensor part on 2025-26 models: **UNVERIFIED**.

---

## 7. Logic board (layout, layers)

### Position and shape
- MacBook Pro 14/16": the logic board sits at the rear of the top case, "beneath the keyboard within a black well", spanning between the two fans; battery is in front of it under the palm rests/trackpad; ports (HDMI, SDXC, MagSafe 3) connect "via substantial metal brackets" (https://appleinsider.com/articles/21/10/26/16-inch-macbook-pro-teardown-reveals-m1-max-tweaked-internals). In the 2021 redesign Apple "moved the battery out from under the logic board" (https://www.ifixit.com/News/116077/everything-you-need-to-know-before-you-fix-a-macbook).
- On the M5 Pro/Max Pro, the fan is "beneath logic board" and the ports are "trapped beneath logic board requiring full disassembly" (https://www.ifixit.com/News/114046/m5-macbook-pro-teardown). M4 Pro: "slightly redesigned logic board with a bigger heatsink and rearranged components" (https://www.ifixit.com/News/106300/macbook-pro-m4-pro-teardown-new-model-same-repair-situation).
- MacBook Air: small logic board at the rear-center, with a thin metal heat shield over it and the battery in front; removing the battery requires removing "rear case, speakers, heat shield, and logic board" first (15" Air) (https://www.ifixit.com/News/76973/15-macbook-air-teardown-bigger-and-better-maybe-not-en).
- Modules directly attached/adjacent (from Apple manuals): Pro — Logic Board, Audio Board, USB-C Boards, MagSafe 3 Board, Touch ID Board, Battery Management Unit flex cable, Fans, Vent/Antenna Module (https://support.apple.com/en-us/125819). Air — Logic Board, USB-C Boards, MagSafe 3 Board, Touch ID Board, Audio/Sensor Flex Cable (https://support.apple.com/en-us/125721).
- PCB layer count for current boards: **UNVERIFIED** (no public source found; multilayer HDI PCB is the industry norm). Materials: "100% recycled gold plating and tin solder in all Apple-designed printed circuit boards"; 100% recycled copper in PCBs and thermal modules (https://www.apple.com/environment/pdf/products/notebooks/MacBook_Pro_14-inch_M5_PER_Oct2025.pdf).

### Reference chip populations (identified by iFixit; family-representative)

**MacBook Pro 14" (M1 Pro, 2021) — front:** Apple APL1103 M1 Pro SoC; Intel JHL8040R Thunderbolt 4 retimer(s); MegaChips MCDP2920 DisplayPort-to-HDMI converter; Genesys Logic GL9755A SD card reader controller; Apple APL1098/343S00515 power management. **Rear:** USI 339S00912 Wi-Fi/Bluetooth module; NXP SN210V NFC controller; TI CD3217B12 USB Type-C controller; Renesas ISL9240 Li-ion battery charger; Cirrus Logic CS42L84A audio codec; TI SN012776B0 audio amplifiers (https://www.ifixit.com/News/54122/macbook-pro-2021-teardown).

**MacBook Air (M2, 2022):** Apple APL1109/339S01067 M2; SK hynix H58G56AK6HX052 4 GB LPDDR5 (on package); SK hynix HN3T1BA4GAX170 256 GB NAND; Apple APL109C/343S00554 and APL109D/343S00555 power management; Macronix MX25S6473F 8 MB NOR flash; TI SN012776B0 audio amp; TI CD3217B13 USB-C PD controller; Apple Thunderbolt redriver; TI USB 2.0 dual repeater; TI TPS65157B0 display PMIC; TI LP8548B1 backlight driver; Renesas RAA489900A6 battery charger; USI 339S01013 Wi-Fi/BT module; NXP SN210V NFC; Bosch 6-axis accelerometer/gyro; assorted eFuses, load switches, level translators (https://www.ifixit.com/Guide/Macbook+Air+(M2+2022)+Logic+Board+and+Chip+Identification/151816).

**Current (M5) boards:** iFixit's M5 Pro teardown did not publish a chip map ("Specific chip packaging details not provided") (https://www.ifixit.com/News/114046/m5-macbook-pro-teardown). Part numbers for M5-generation PMICs, retimers and NAND are therefore **UNVERIFIED**; assume the same functional blocks. New for M5 Pro/Max and M5 Air: Apple's own **N1** wireless chip (Wi-Fi 7 / Bluetooth 6) replaces the USI/Broadcom module (https://www.apple.com/macbook-pro/specs/ ; https://www.apple.com/macbook-air/specs/). The 14-inch M5 (Oct 2025) still lists Wi-Fi 6E / Bluetooth 5.3, i.e., not N1 (https://support.apple.com/en-us/125405).

---

## 8. SoC package (die, on-package LPDDR, heat spreader)

- Apple silicon uses a flip-chip BGA package with the LPDDR DRAM packages "co-located on the BGA substrate next to the [M1] processor (DRAM placed end-to-end beside the processor silicon)", with "an interesting integrated heat spreader covering the die ... thin metal (probably aluminum)" covering only the SoC side of the substrate (M1, EE Times Asia teardown: https://www.eetasia.com/apple-mini-m1-soc-teardown/). This lid-over-die, DRAM-alongside layout is the template for M-series laptop packages.
- Module count by tier: M1 Pro 14" — two Samsung 8 GB LPDDR5 packages (16 GB) (https://www.ifixit.com/News/54122/macbook-pro-2021-teardown); M2 Pro — two SK hynix 4 GB LPDDR5 modules on each side of the die (four total), on a substrate with fewer layers (https://www.ifixit.com/News/71442/tearing-down-the-14-macbook-pro-with-apples-help); M1 Max — "surrounded by four memory chips" (https://wccftech.com/m1-max-macbook-pro-disassembly-goes-live/ ; https://appleinsider.com/articles/21/10/26/16-inch-macbook-pro-teardown-reveals-m1-max-tweaked-internals).
- M5 family: TSMC third-generation 3 nm (N3P); LPDDR5X at 9600 MT/s; base M5 single die; **M5 Pro and M5 Max use "Fusion Architecture", two N3P dies connected "using advanced packaging"** into one SoC (https://en.wikipedia.org/wiki/Apple_M5 ; https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/). Bandwidth: M5 153.6 GB/s (up to 32 GB); M5 Pro 307 GB/s (up to 64 GB); M5 Max 460-614 GB/s (up to 128 GB) (https://en.wikipedia.org/wiki/Apple_M5). Reported (pre-launch) use of TSMC 2.5D packaging for M5 (https://siliconangle.com/2024/12/23/report-apples-m5-chips-will-use-n3p-2-5d-packaging-technology-tsmc/) — **UNVERIFIED** by Apple.
- Die size reference points: M2 ≈ 155 mm² (SemiAnalysis measurement; Apple's figure 141.7 mm²), 20 B transistors, TSMC N5, 128-bit LPDDR5-6400, memory controller/PHY ~14 mm² (https://newsletter.semianalysis.com/p/apple-m2-die-shot-and-architecture). M4: 28 B transistors, N3E, LPDDR5X-7500 (https://en.wikipedia.org/wiki/Apple_M4). M5 die sizes: **UNVERIFIED**.
- On-die blocks relevant to the model: CPU clusters, GPU, Neural Engine, SLC, memory controllers/PHY, display engines, media engine, **Secure Enclave**, and the **SSD/storage controller** (see §9).

---

## 9. NAND flash and the in-SoC storage controller

- Apple silicon Macs carry raw NAND packages soldered to the logic board; the SSD controller is inside the SoC: "The Secure Enclave incorporates the storage controller for the internal SSD, so all data transferred between CPU and SSD passes through an encryption stage in the enclave"; a hardware AES engine encrypts even with FileVault off (https://eclecticlight.co/2025/01/10/filevault-and-volume-encryption-explained/). Apple Platform Security guide (Secure Enclave): https://support.apple.com/en-gb/guide/security/sec59b0b31ff/1/web/1.
- NAND package counts seen: M1 Pro 14" — Kioxia 2×128 GB on front plus a 128 GB on the rear (https://www.ifixit.com/News/54122/macbook-pro-2021-teardown); M2 Pro 512 GB — two 256 GB packages, one per side of the board (down from four 128 GB), with a ball-count change from 110 to 315 pads (https://www.ifixit.com/News/71442/tearing-down-the-14-macbook-pro-with-apples-help); M2 Air 256 GB — a single SK hynix 256 GB package (https://www.ifixit.com/News/62674/m2-macbook-air-teardown-apple-forgot-the-heatsink).
- Current capacities: Pro 512 GB/1 TB standard, up to 4 TB; SSD up to 14.5 GB/s on M5 Pro/Max (https://support.apple.com/en-us/125405 ; https://www.apple.com/newsroom/2026/03/apple-introduces-macbook-pro-with-all-new-m5-pro-and-m5-max/). Air 512 GB standard, up to 4 TB (https://www.apple.com/newsroom/2026/03/apple-introduces-the-new-macbook-air-with-m5/).
- Storage "remains soldered to the logic board"; unified memory is "built into the M-series chip package" (https://www.ifixit.com/News/116077/everything-you-need-to-know-before-you-fix-a-macbook).

---

## 10. Power management ICs, chargers, USB-C/Thunderbolt retimers

- Apple-designed PMICs: APL1098/343S00515 (M1 Pro board) (https://www.ifixit.com/News/54122/macbook-pro-2021-teardown); APL109C/343S00554 and APL109D/343S00555 (M2 Air) (https://www.ifixit.com/Guide/Macbook+Air+(M2+2022)+Logic+Board+and+Chip+Identification/151816).
- Battery charger: Renesas ISL9240 (M1 Pro) ; Renesas RAA489900A6 (M2 Air) (same sources).
- USB-C port controllers: TI CD3217B12/B13 (one per port), TI TPD4S311A port protection; Thunderbolt: Intel JHL8040R TB4 retimers on M1 Pro; Apple-made Thunderbolt redriver on M2 Air (same sources). Current M5 Pro/Max ports are Thunderbolt 5 up to 120 Gb/s (https://www.apple.com/macbook-pro/specs/) — retimer part numbers **UNVERIFIED**.
- HDMI: MegaChips MCDP2920 DP-to-HDMI converter; SD: Genesys Logic GL9755A (M1 Pro) (https://www.ifixit.com/News/54122/macbook-pro-2021-teardown).
- Audio: Cirrus Logic CS42L84A codec, TI SN012776B0 amplifiers (https://www.ifixit.com/News/54122/macbook-pro-2021-teardown). The Air has a "super thin audio board" adhered to the case (https://www.ifixit.com/News/62674/m2-macbook-air-teardown-apple-forgot-the-heatsink); the Pro has a separate "Audio Board" module (https://support.apple.com/en-us/125819).
- Small daughterboards: "USB-C Boards" and "MagSafe 3 Board" are separate service parts on both Pro and Air (https://support.apple.com/en-us/125819 ; https://support.apple.com/en-us/125721). NFC controller NXP SN210V is present on both board families (sources above).
- Charging: 14" M5 ships with 70 W adapter; 14" M5 Pro/Max 96 W; 16" 140 W; fast charge to 50% in 30 min with 96 W+ (14") or 140 W+ (16") (https://www.apple.com/macbook-pro/specs/). Air: 40 W Dynamic Power Adapter with 60 W Max (https://www.apple.com/macbook-air/specs/).

---

## 11. Wi-Fi / Bluetooth module and antennas

- Pre-M5: USI 339S00912 module (M1 Pro) and USI 339S01013 (M2 Air), on the rear of the logic board (https://www.ifixit.com/News/54122/macbook-pro-2021-teardown ; https://www.ifixit.com/Guide/Macbook+Air+(M2+2022)+Logic+Board+and+Chip+Identification/151816).
- M5 Pro/Max and M5 Air: **Apple N1** wireless chip, Wi-Fi 7 (802.11be), Bluetooth 6 (https://www.apple.com/macbook-pro/specs/ ; https://www.apple.com/macbook-air/specs/). Physical placement of N1 on the board: **UNVERIFIED**.
- Antennas: Pro — inside the rear "Vent/Antenna Module" (the slotted bar between the hinges), held by an antenna bracket with P2 screws (https://support.apple.com/en-us/125819 ; https://www.ifixit.com/News/114046/m5-macbook-pro-teardown). Air — integrated into the left/right speaker assemblies ("Right Speaker with Antenna") (https://support.apple.com/en-us/125721).

---

## 12. Ports and MagSafe

### MacBook Pro 14/16" (left-to-right, both sides)
- Left: MagSafe 3, two Thunderbolt (USB-C), 3.5 mm headphone jack; right: SDXC card slot, one Thunderbolt (USB-C), HDMI — port set from https://www.apple.com/macbook-pro/specs/ (side assignment is the well-known layout; **UNVERIFIED** in fetched text).
- Thunderbolt 5 on M5 Pro/Max (up to 120 Gb/s); Thunderbolt 4 on the 14" M5; HDMI up to 8K (https://www.apple.com/macbook-pro/specs/ ; https://www.apple.com/newsroom/2026/03/apple-introduces-macbook-pro-with-all-new-m5-pro-and-m5-max/). Headphone jack supports high-impedance headphones (Apple spec page).
- Modularity: USB-C boards, headphone jack, and MagSafe are modular; on the M4/M5 Pros iFixit says MagSafe and the card reader need advanced soldering/are soldered, while ports are "individually modular" but "trapped beneath logic board" (https://www.ifixit.com/News/106300/macbook-pro-m4-pro-teardown-new-model-same-repair-situation ; https://www.ifixit.com/News/114046/m5-macbook-pro-teardown). Apple nonetheless lists a "MagSafe 3 Board" module for the M5 Pro (https://support.apple.com/en-us/125819).

### MacBook Air 13/15"
- Left: MagSafe 3, two Thunderbolt 4 (USB-C); right: 3.5 mm headphone jack (https://www.apple.com/macbook-air/specs/). All three are modular, not glued (https://www.ifixit.com/News/62674/m2-macbook-air-teardown-apple-forgot-the-heatsink).

---

## 13. Battery (cells, capacity, pull-tabs)

| Model | Apple-rated capacity | Cells / teardown detail | Sources |
|---|---|---|---|
| MacBook Pro 14" (M5, M5 Pro, M5 Max) | 72.4 Wh (Apple) | iFixit measured 72.6 Wh, six-cell, pull-tab adhesive; center tabs no longer hidden under trackpad (M5) | https://www.apple.com/macbook-pro/specs/ ; https://www.ifixit.com/News/114046/m5-macbook-pro-teardown |
| MacBook Pro 14" (2021 baseline) | 69.6 Wh, 11.47 V, 6068 mAh | Six cells; 4 outer cells with pull tabs, 2 center via cutouts under trackpad | https://www.ifixit.com/News/54122/macbook-pro-2021-teardown |
| MacBook Pro 16" (M5 Pro/Max) | 100 Wh (Apple spec page); Wikipedia lists 99.6 Wh | Six cells "beneath the palm rests and trackpad" (2021) | https://www.apple.com/macbook-pro/specs/ ; https://en.wikipedia.org/wiki/MacBook_Pro_(Apple_silicon) ; https://appleinsider.com/articles/21/10/26/16-inch-macbook-pro-teardown-reveals-m1-max-tweaked-internals |
| MacBook Pro 16" (2021 baseline) | 99.6 Wh, 11.45 V, 8693 mAh | | https://www.ifixit.com/News/54122/macbook-pro-2021-teardown |
| MacBook Air 13" (M5) | 53.8 Wh | M2 Air baseline: 52.6 Wh, four cells (top two parallel, bottom two series), ~251.5 g, metal tray with screws + stretch-release strips | https://www.apple.com/macbook-air/specs/ ; https://www.ifixit.com/News/62674/m2-macbook-air-teardown-apple-forgot-the-heatsink |
| MacBook Air 15" (M5) | 66.5 Wh | 66.5 Wh with extra cells for faster charging (M2 15") | https://www.apple.com/macbook-air/specs/ ; https://www.ifixit.com/News/76973/15-macbook-air-teardown-bigger-and-better-maybe-not-en |

- Battery layout: Pro — six lithium-polymer pouch cells in a wide flat pack filling the front two-thirds of the top case under the palm rests and trackpad; the Pro has a separate "Battery Management Unit Flex Cable" that must be disconnected first in Apple's procedure (https://support.apple.com/en-us/125819 ; https://www.ifixit.com/News/114046/m5-macbook-pro-teardown). Air — four cells in a screw-in metal tray, iPhone-style tiny battery connector (https://www.ifixit.com/News/62674/m2-macbook-air-teardown-apple-forgot-the-heatsink).
- Materials: 100% recycled cobalt, 95% recycled lithium (https://www.apple.com/environment/pdf/products/notebooks/MacBook_Pro_14-inch_M5_PER_Oct2025.pdf).
- Apple's official M5 Pro replacement is a full "Top Case with Battery and Keyboard" for $527 (https://www.ifixit.com/News/114046/m5-macbook-pro-teardown).
- Whether the M5 Air's 53.8 Wh pack changed cell count vs. M2 (52.6 Wh): **UNVERIFIED**.

---

## 14. Thermal system

### MacBook Pro 14/16" (active)
- Two Nidec-made fans plus a heatsink assembly; 14" and 16" use different-size fans ("The larger fan is from the 16" model") (https://www.ifixit.com/News/54122/macbook-pro-2021-teardown). Fans sit at the rear corners beside the logic board, exhausting through the rear vent/antenna bar and the side vents.
- Heat pipe: "a redesigned heat pipe arches over the chip's center"; "substantial central heat distribution plate"; fans move "approximately 50% more air" than 2019 (https://appleinsider.com/articles/21/10/26/16-inch-macbook-pro-teardown-reveals-m1-max-tweaked-internals). Described elsewhere as a "single heat-pipe and dual-fan solution" (https://wccftech.com/m1-max-macbook-pro-disassembly-goes-live/).
- M4 Pro (2024) got a "larger heatsink" and rearranged board components (https://www.cultofmac.com/news/m4-macbook-pro-teardown-reveals-larger-heatsink). M5 Pro/Max: "heat pipes present but not detailed"; fan beneath the logic board (https://www.ifixit.com/News/114046/m5-macbook-pro-teardown). Copper in thermal modules is 100% recycled (https://www.apple.com/environment/pdf/products/notebooks/MacBook_Pro_14-inch_M5_PER_Oct2025.pdf).
- Fan dimensions / heat-pipe dimensions: **UNVERIFIED** (no numeric source found; iFixit fan-replacement guides exist at https://www.ifixit.com/Guide/MacBook+Pro+14-Inch+2024+(M4+Pro+and+M4+Max)+Fans+Replacement/223651).

### MacBook Air 13/15" (fanless)
- No fan, no heatsink; cooling is "graphite tape, thermal paste, and thin metal shield only" (M2 Air) (https://www.ifixit.com/News/62674/m2-macbook-air-teardown-apple-forgot-the-heatsink); 15" Air: "just a shield for heat management" (https://www.ifixit.com/News/76973/15-macbook-air-teardown-bigger-and-better-maybe-not-en). The M4 Air had no internal layout changes vs. M2/M3 (https://www.macrumors.com/2025/03/14/ifixit-m4-macbook-air-teardown/). Apple: "fanless aluminum design" for the M5 Air (https://www.apple.com/newsroom/2026/03/apple-introduces-the-new-macbook-air-with-m5/). Any M5-specific graphite/spreader change: **UNVERIFIED**.

---

## 15. Speakers and microphones

- MacBook Pro 14/16": "High-fidelity six-speaker sound system with force-cancelling woofers", Spatial Audio; "Studio-quality three-mic array" (https://www.apple.com/macbook-pro/specs/). Physical layout (16" 2021): "Four force-cancelling woofers stacked in pairs take residence at the front corners of MacBook Pro, while tweeters are located toward the middle of the chassis"; the speaker assemblies run alongside the battery bank and fire through the perforated grilles flanking the keyboard (https://appleinsider.com/articles/21/10/26/16-inch-macbook-pro-teardown-reveals-m1-max-tweaked-internals). Speakers are glued and released with isopropyl alcohol (https://www.ifixit.com/News/114046/m5-macbook-pro-teardown).
- MacBook Air 13": "Four-speaker sound system" (https://support.apple.com/en-us/126320); Air 15": "Six-speaker sound system with force-cancelling woofers" (https://www.apple.com/macbook-air/specs/). Air speakers are placed between the case and the display hinge area, firing up through the gap under the display, mounted with screws (M2 13") (https://www.ifixit.com/News/62674/m2-macbook-air-teardown-apple-forgot-the-heatsink). 15" Air: two speaker units, each with three drivers — two opposed drivers form a force-cancelling woofer and a third driver sits 90 degrees off-axis (https://www.ifixit.com/News/76973/15-macbook-air-teardown-bigger-and-better-maybe-not-en). Air speaker modules also carry the Wi-Fi antennas (https://support.apple.com/en-us/125721).
- Microphones: three-mic array on both Pro and Air (https://www.apple.com/macbook-pro/specs/ ; https://www.apple.com/macbook-air/specs/). Exact mic positions (typically along the left speaker grille on the Pro): **UNVERIFIED**.

---

## 16. Keyboard (scissor mechanism, backlight)

- Backlit Magic Keyboard, "scissor-switch mechanism", 78 (ANSI) / 79 (ISO) keys, full-height function row, Touch ID in the top-right key position (https://www.apple.com/macbook-pro/specs/ ; https://en.wikipedia.org/wiki/MacBook_Pro_(Apple_silicon)).
- Scissor switch: "two plastic pieces, crossed, with a pivot in the middle"; ~0.5 mm more travel than the butterfly; keycaps ~0.2 mm thicker with reinforced clips; no membrane (https://www.ifixit.com/News/33820/16-inch-macbook-pro-magic-keyboard-throwback). Absolute key travel figure: **UNVERIFIED** (commonly cited ~1 mm).
- Mounted from above: keyboard is "screwed and riveted down" into the top case and is not separately serviceable; individual "Keys" (keycaps) are a listed part on the Air (https://www.ifixit.com/News/54122/macbook-pro-2021-teardown ; https://support.apple.com/en-us/125721). Backlight controlled by the ambient light sensor (https://en.wikipedia.org/wiki/MacBook_Pro_(Apple_silicon)); backlight construction (LED count, light-guide sheet): **UNVERIFIED**.
- Keyboard steel is 80%+ recycled (https://www.apple.com/environment/pdf/products/notebooks/MacBook_Pro_14-inch_M5_PER_Oct2025.pdf).

---

## 17. Touch ID and the Secure Enclave

- Touch ID is a capacitive fingerprint sensor built into the power button at the top-right of the keyboard; it is a separate service part ("Touch ID Board") on both Pro and Air (https://support.apple.com/en-us/125819 ; https://support.apple.com/en-us/125721). On the M5 Pro it "slides out but requires recalibration" via Apple's Repair Assistant (https://www.ifixit.com/News/114046/m5-macbook-pro-teardown).
- Security model: the sensor is only a sensor; the Secure Enclave inside the SoC "performs the enrolment and matching operations and enforces security policies"; sensor-to-SEP link is paired with ECDHE and encrypted with AES-GCM-256 (described for Magic Keyboard with Touch ID, whose SEP behaviour is "the same ... as for a built-in Touch ID sensor") (https://support.apple.com/en-ca/guide/security/secf60513daa/web). Secure Enclave overview: https://support.apple.com/en-gb/guide/security/sec59b0b31ff/1/web/1.

---

## 18. Force Touch trackpad (Taptic Engine, strain gauges)

- Glass-topped trackpad with no mechanical hinge; "tiny strain gauges ... mounted on flexing metal supports" measure downward force; haptics come from "an array of electromagnets that rapidly push and pull against a metal rail mounted beneath the trackpad" (the Taptic Engine), giving one buzz per click and a second for a force click; the 13" Pro version is "a solid aluminum plate, with four springs punched out of it" (https://www.ifixit.com/News/7084/force-touch-track-pad).
- Service module: "Trackpad and Trackpad Flex Cable" on both Pro and Air (https://support.apple.com/en-us/125819 ; https://support.apple.com/en-us/125721). Air trackpad is secured with screws and washers (https://www.ifixit.com/News/62674/m2-macbook-air-teardown-apple-forgot-the-heatsink). On 2021-2024 Pros the trackpad had to come out to reach the center battery pull tabs; M5 removed that need (https://www.ifixit.com/News/114046/m5-macbook-pro-teardown).
- Trackpad outer dimensions: **UNVERIFIED** (no official figure found).

---

## 19. Other sensors

- Ambient light sensor: in the notch (Pro; Air likewise has a notch) — see §5.
- Lid angle sensor: see §6.
- 6-axis accelerometer/gyroscope (Bosch Sensortec) on the M2 Air logic board (https://www.ifixit.com/Guide/Macbook+Air+(M2+2022)+Logic+Board+and+Chip+Identification/151816); presence on current boards **UNVERIFIED**.
- "Audio/Sensor Flex Cable" is a listed Air module (https://support.apple.com/en-us/125721).

---

## 20. Suggested part list for a teaching 3D model (with model-scale cues)

Outer envelope: use Apple's dimensions from §2. Internal layout (14/16" Pro, viewed from below with the bottom case removed, hinge at top):
1. Bottom case (flat plate, pentalobe P5 screws, rubber feet).
2. Rear: Vent/Antenna module between the two hinges; hinge covers; lid angle sensor flex near a hinge.
3. Rear-left / rear-right: two fans (different sizes 14" vs 16"), exhausting rearward.
4. Center-rear: logic board with SoC package (lidded die + 2-4 LPDDR5X packages beside it), heat pipe/heatsink plate over the SoC, NAND packages (2-4), PMICs, TB retimers, N1 wireless; USB-C boards, MagSafe 3 board, HDMI/SDXC/headphone at the board edges; audio board.
5. Front two-thirds: six-cell battery pack (72.4 Wh / 100 Wh) with pull-tabs; BMU flex.
6. Front corners: stacked woofer pairs; tweeters toward the middle; grilles either side of the keyboard.
7. Center-front: Force Touch trackpad (glass + strain-gauge plate + Taptic Engine rail) with flex cable.
8. Top case above all of that: riveted scissor keyboard, backlight, Touch ID power button (top-right).
9. Display assembly: aluminium lid, glass, IPS LCD, mini-LED backlight with 2,010/2,554 zones, notch (camera + LED + ALS), display flex cables through the hinges.

Air variant: same order but single small logic board with a thin heat shield and graphite, no fans/heat pipe, four-cell tray battery (53.8/66.5 Wh), speakers-with-antennas at the rear firing through the hinge gap, LED-backlit IPS LCD without local dimming, two USB-C boards + MagSafe board on the left.

Sources for this layout are the ones cited in §§3-19; the relative positions are as described by iFixit/AppleInsider teardowns, not measured coordinates (**UNVERIFIED** for exact mm positions).
