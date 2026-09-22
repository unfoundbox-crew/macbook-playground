# MacBook software stack, silicon to ML frameworks — layer-by-layer map

Research date: 2026-09-22. Every numeric claim carries a source URL. Items I could not confirm in a source are marked **UNVERIFIED**.

## 0. Current state of the platform (Sept 2026)

| Item | Current | Source |
|---|---|---|
| macOS | **macOS 27 "Golden Gate"**, released **September 14, 2026** (macOS 26 Tahoe was the 2025 release and the last to run on Intel Macs) | https://9to5mac.com/2026/09/09/macos-27-golden-gate-here-are-apples-full-release-notes/ ; https://www.macrumors.com/roundup/macos-27/ |
| Supported Macs | Apple-silicon only: MacBook Neo (2026), MacBook Air/Pro (2020+), iMac (2021+), Mac mini (2020+), Mac Studio (2022+), Mac Pro (2023). "Enhanced" on-device Siri/dictation features need M3+ and 12 GB RAM | https://www.macrumors.com/roundup/macos-27/ |
| Newest chips | M5 (Oct 2025), M5 Pro/Max (Mar 2026), **M6 and M5 Ultra (announced Aug 25, 2026)** | https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/ ; https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/ ; https://www.apple.com/newsroom/2026/08/apple-introduces-m6-and-m5-ultra-for-a-big-leap-in-performance-and-ai-compute/ |
| Metal | Metal 4 (WWDC25, macOS 26) with WWDC26 tensor/quantization extensions for macOS 27 | https://developer.apple.com/videos/play/wwdc2025/205/ ; https://developer.apple.com/videos/play/wwdc2026/330/ |
| ML inference framework | **Core AI** (new at WWDC26, macOS 27+, `.aimodel`) alongside Core ML (still present; Apple docs now point non-neural-net models to Core ML) | https://developer.apple.com/documentation/coreai.md |
| coremltools | 9.0 (Nov 10, 2025); 9.1.dev1 pre-release Aug 3, 2026 | https://pypi.org/project/coremltools/ |
| PyTorch | 2.14 (Sep 2, 2026) | https://pytorch.org/blog/pytorch-2-14-release-blog/ |
| MLX | 0.32.2 (PyPI: Aug 25, 2026) | https://pypi.org/project/mlx/ |
| Foundation Models | 3rd-generation AFM (WWDC26): AFM 3 Core (3B dense) + AFM 3 Core Advanced (20B sparse) | https://machinelearning.apple.com/research/introducing-third-generation-of-apple-foundation-models |

### Chip quick-reference (Apple newsroom numbers)

| Chip | CPU | GPU | Neural Engine | Memory BW | Max unified memory | Source |
|---|---|---|---|---|---|---|
| M5 | up to 10-core (4P+6E) | 10-core, Neural Accelerator in each core | 16-core | 153 GB/s (~30% over M4) | 32 GB | https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/ |
| M5 Pro | 18-core (6 "super" + 12 P) | up to 20-core | 16-core | up to 307 GB/s | 64 GB | https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/ |
| M5 Max | 18-core (6 super + 12 P) | up to 40-core | 16-core | up to 614 GB/s | 128 GB | same |
| M5 Ultra | up to 36-core (12 super + 24 P), UltraFusion quad-die | up to 80-core | 32-core | 1.2 TB/s | 512 GB | https://www.apple.com/newsroom/2026/08/apple-introduces-m6-and-m5-ultra-for-a-big-leap-in-performance-and-ai-compute/ |
| M6 | 12-core (2 super + 4 P + 6 E), 2 nm | 12-core with Neural Accelerators | dual 16-core | 170 GB/s | 32 GB | same |

Note: Apple's "super core" naming for M5 Pro/Max/Ultra and M6 is Apple's marketing term as reported in the newsroom pages; the exact microarchitectural meaning is **UNVERIFIED** here.

---

## 1. Boot chain (silicon root of trust to signed system volume)

Order of trust on an Apple-silicon Mac (Apple Platform Security guide, https://support.apple.com/guide/security/boot-process-secac71d5623/web ; overview in https://eclecticlight.co/2024/10/24/how-macs-boot-securely-or-cant/):

1. **Boot ROM** — immutable code in the SoC; "the chip executes code from the Boot ROM in the first step in the chain of trust." It verifies and loads the LLB.
2. **LLB (Low-Level Bootloader)** — first mutable stage. "Verifies the signatures and loads system-paired firmware" for co-processors (storage, Thunderbolt controllers, etc.), loads and validates the **LocalPolicy**, then verifies iBoot.
3. **LocalPolicy** — "a file signed by the Secure Enclave Processor" describing the user-chosen boot/runtime security policy for each boot volume group; anti-replay values prevent downgrading to a weaker policy. Modes: **Full Security** (iOS-like), **Reduced Security** (older macOS, third-party kexts via the Auxiliary Kernel Collection), **Permissive Security** (custom kernels). (https://support.apple.com/guide/security/boot-process-secac71d5623/web)
4. **iBoot** — second stage. Loads remaining firmware, checks the Auxiliary Kernel Collection (AuxKC) if allowed, and "verifies the root hash for the signed system volume" before the kernel mounts it. Kernel collections are locked in memory with SCIP (System Coprocessor Integrity Protection) before handoff (https://eclecticlight.co/2024/10/24/how-macs-boot-securely-or-cant/).
5. **XNU kernel** boots macOS from the Boot Kernel Collection (BKC = XNU + Apple kexts) (https://karol-mazurek.medium.com/snake-apple-x-nu-0bc5c36170da).

**Secure Enclave (SEP)** — "a dedicated secure subsystem integrated into Apple SoC," a separate processor running "an Apple-customized version of the L4 microkernel" (sepOS) with its own Boot ROM as hardware root of trust; a Memory Protection Engine encrypts SEP memory "using AES in MAC XEX mode" with authentication and (A11/S4+) anti-replay. On Apple-silicon Macs the SEP Boot Monitor hashes sepOS and produces the OS-bound key used in LocalPolicy signing; SEP also holds Data Protection key entropy and runs Touch ID matching via a Secure Neural Engine. (https://support.apple.com/guide/security/secure-enclave-sec59b0b31ff/web)

**Signed System Volume (SSV)** — the root filesystem is an APFS snapshot whose per-file **SHA-256** hashes form a Merkle tree; the root hash is the "seal." On Apple silicon "the bootloader verifies the seal before transferring control to the kernel"; failure halts boot and prompts reinstall. Because it uses APFS snapshots, a failed update can roll back without reinstall. (https://support.apple.com/guide/security/signed-system-volume-security-secd698747c9/web)

Full guide PDF (August 2026 edition): https://help.apple.com/pdf/security/en_US/apple-platform-security-guide.pdf

---

## 2. XNU kernel (Darwin)

Source: https://github.com/apple-oss-distributions/xnu (current open-source drops); architecture summary https://en.wikipedia.org/wiki/XNU and https://karol-mazurek.medium.com/snake-apple-x-nu-0bc5c36170da.

- **Hybrid kernel**: "a heavily modified (hybrid) Open Software Foundation Mach kernel (OSF MK) 7.3" — Mach is not run as a microkernel with userspace servers; Mach, BSD and IOKit are linked into one kernel address space. (https://en.wikipedia.org/wiki/XNU)
- **Mach layer**: tasks (resource containers), threads (schedulable entities), ports and message-passing IPC ("the foundation of XNU's communication system"), virtual memory (vm_map/vm_object/pmap), scheduling primitives. (https://karol-mazurek.medium.com/snake-apple-x-nu-0bc5c36170da)
- **BSD layer**: POSIX API, process model on top of Mach tasks, users/groups/permissions, network stack, VFS + APFS/HFS+, basic security policies (MAC framework); code is synced with FreeBSD. (https://en.wikipedia.org/wiki/XNU)
- **IOKit**: the device-driver framework, "written in a subset of C++ based on Embedded C++ that lacks features such as exceptions, multiple inheritance, and templates"; object-oriented, SMP-aware, hot-plug; drivers form the I/O Registry tree. (https://en.wikipedia.org/wiki/XNU)
- **Kernel collections**: Boot Kernel Collection (BKC) with XNU + system kexts, Auxiliary Kernel Collection (AuxKC) for third-party kexts (requires Reduced Security). (https://karol-mazurek.medium.com/snake-apple-x-nu-0bc5c36170da ; https://eclecticlight.co/2024/10/24/how-macs-boot-securely-or-cant/)
- **Memory-safety hardware**: pointer authentication (PAC), KASLR, and PPL/SPTM (Page Protection Layer / Secure Page Table Monitor) which isolate page-table management at a higher privilege than the kernel proper. (https://karol-mazurek.medium.com/snake-apple-x-nu-0bc5c36170da)
- **Page size**: Apple silicon XNU uses **16 KB** pages (https://karol-mazurek.medium.com/snake-apple-x-nu-0bc5c36170da); this is consistent with the DART IOMMU's "hard-wired pagesize of 16K" (https://lwn.net/Articles/861126/) and the GPU's fixed 16 KB pages (https://asahilinux.org/docs/hw/soc/agx/).
- Memory compressor (compressed swap in RAM) exists in XNU's vm_pageout/vm_compressor; details beyond existence are **UNVERIFIED** in this research.

---

## 3. Memory: unified memory architecture, page tables, IOMMU/DART

**One physical DRAM pool shared by CPU, GPU, ANE and other engines.** Apple's Metal documentation states: "Apple GPUs have a unified memory model in which the CPU and the GPU share system memory." Storage modes: `MTLStorageMode.shared` (CPU+GPU accessible, the default for buffers and textures — this is the zero-copy path), `.private` (GPU-only system memory), `.memoryless` (on-GPU tile memory, textures only, "higher bandwidth, lower latency, and consumes less power than system memory"). (https://developer.apple.com/documentation/metal/choosing-a-resource-storage-mode-for-apple-gpus.md)

**Zero-copy at the framework level.** MLX: "Any device can perform any operation on a and b without needing to move them from one memory location to another" — you pick the stream (`mx.cpu` / `mx.gpu`), not the location. (https://ml-explore.github.io/mlx/build/html/usage/unified_memory.html)

**GPU address translation (as reverse-engineered by Asahi Linux).** The AGX GPU's MMU is the **UAT (Unified Address Translator)**, "identical to the ARM64 MMU" with the same page-table format; the GPU firmware coprocessor (ASC) "literally configures UAT page table bases as its TTBR0/1 registers." GPU VAs are 40-bit sign-extended; pages are **16 KB**. The GPU does **not** sit behind a DART; instead an ARM64 coprocessor running Apple firmware owns the page tables, and "all memory is coherent as far as we can tell." Work is submitted via ring buffers in shared memory plus mailbox doorbells. (https://asahilinux.org/docs/hw/soc/agx/)

**DART (Device Address Resolution Table)** = Apple's IOMMU for other DMA masters: "required to use DMA on most peripherals like the display controller, the USB ports or the internal PCIe bus"; "hard-wired pagesize of 16K"; some PCIe DARTs lack bypass mode and limit IOVA to 32-bit. Linux has an `apple-dart` driver with a DART-specific io-pgtable format. (https://lwn.net/Articles/861126/ ; ongoing patches https://ratatoskr.run/linux-iommu/2026/09/17500369/t)

**Neural Engine I/O** uses IOSurface-backed buffers for zero-copy tensor I/O (`_ANEIOSurfaceObject`), with a minimum ~49 KB IOSurface allocation observed. (https://arxiv.org/html/2603.06728)

**Practical consequence**: a 128 GB M5 Max MacBook Pro can hold ~120 GB of model weights visible to the GPU with no PCIe copy; the cost is that all engines contend for the same bandwidth (614 GB/s on M5 Max). (https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/)

---

## 4. Scheduling on asymmetric P/E cores (AMP), QoS, GCD

- Apple: "On AMP systems, the operating system uses the energy-efficiency information conveyed by QoS classes to influence placement of threads on P or E cores." The scheduler weighs (1) app-provided info (QoS), (2) observed workload, (3) whole-system state; foreground and background apps are treated independently. Recommended API: GCD; for `concurrentPerform`/`dispatch_apply` use iteration counts >= 3x the core count so work-stealing balances P and E cores. (https://developer.apple.com/news/?id=vk3m204o)
- QoS classes and their Mach priorities as observed: **Background = 9, Utility = 17, User Initiated = 25, User Interactive = 33.** Background-QoS threads are confined to E cores "even when those [P cores] sit idle"; higher-QoS threads prefer P cores but spill to E cores when P cores are busy. Users can demote (`taskpolicy -b -p <pid>`) but not promote. (https://eclecticlight.co/2025/05/09/what-is-quality-of-service-and-how-does-it-matter/)
- The `MTL4Compiler` inherits the QoS of the requesting thread, so shader compilation is scheduled with the same P/E policy. (https://developer.apple.com/videos/play/wwdc2025/205/)
- Matrix units are per-cluster (see section 11), so demoting a thread to the E cluster also moves it to the smaller SME/AMX block. (https://eclecticlight.co/2024/11/27/inside-m4-chips-matrix-processing-and-power-modes/)

---

## 5. Drivers: IOKit and DriverKit

- **IOKit** (kernel): embedded-C++ driver framework; kexts loaded from the BKC/AuxKC (section 2).
- **DriverKit** (user space): "Develop device drivers that run in user space." Drivers ("dexts") are app extensions installed via the **SystemExtensions** framework on macOS; family frameworks include USBDriverKit, HIDDriverKit, NetworkingDriverKit, PCIDriverKit, SerialDriverKit, AudioDriverKit (SCSIControllerDriverKit constants also appear in the reference). Availability: macOS 10.15+, iPadOS 16+ (M-series iPads). Kernel-side proxies are declared with `IMPL`/`SUPERDISPATCH`; memory via `IOBufferMemoryDescriptor`/`IOMemoryMap`. (https://developer.apple.com/documentation/driverkit.md)
- Rationale from Wikipedia: "In macOS Catalina and later, DriverKit enables certain driver types to operate in user mode, enhancing system stability," while GPU, storage and network drivers still run in-kernel. (https://en.wikipedia.org/wiki/XNU)
- The GPU driver itself is split: the in-kernel AGX driver talks to an ARM64 firmware coprocessor that actually programs the GPU (https://asahilinux.org/docs/hw/soc/agx/).

---

## 6. Graphics/compute stack: Metal 3 -> Metal 4

### Apple family 9 GPU hardware (M3/A17 Pro and later)
From Apple's tech talk (https://developer.apple.com/videos/play/tech-talks/111375/) and the M3 announcement (https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max-the-most-advanced-chips-for-a-personal-computer/):
- **Dynamic Caching**: on-chip register/threadgroup/tile/stack memory is allocated and freed during a shader's lifetime instead of reserving max register usage for the whole SIMDgroup; improves occupancy, transparent to developers.
- **Hardware ray tracing**: a dedicated ray-tracing unit with fixed-function BVH traversal and an intersection-function *reorder* stage that groups coherent intersection calls; use the `intersector` API (not intersection-query) to keep the reorder stage enabled.
- **Hardware mesh shading**: object + mesh shader stages scheduled in hardware with meshlet data on-chip; max threadgroups per mesh grid raised from 1,024 to over 1 million; indirect command buffers can issue mesh draws.
- Apple claims rendering "up to 2.5x faster than on the M1 family" and Neural Engine "60% faster than M1" for M3.
- M5 adds a **third-generation ray-tracing engine** and **second-generation Dynamic Caching**, plus a **Neural Accelerator in each GPU core** with "over 4x the peak GPU compute performance for AI" vs M4 (https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/).

### Metal 4 (WWDC25, macOS 26, supported on M1+/A14+)
From https://developer.apple.com/videos/play/wwdc2025/205/:
- New command model: `MTL4CommandQueue`, `MTL4CommandBuffer` (decoupled from queues, parallel encoding), `MTL4CommandAllocator` (explicit command-memory control).
- Unified compute encoder that also does blit and acceleration-structure builds; render encoder with an attachment map.
- `MTL4ArgumentTable` (bindless-style binding), **residency sets**, **placement sparse resources** (pages from placement heaps on demand), explicit **barrier** API (stage-to-stage).
- `MTL4Compiler` with flexible render pipeline states (compile once, specialize per color state); inherits the caller's QoS.
- **Machine learning in Metal**: `MTLTensor` (rank/extents/dtype/usage) usable in encoders and in MSL; `MTL4MachineLearningCommandEncoder` runs whole networks on the GPU timeline from a `.mtlpackage` produced by `metal-package-builder` from a Core ML `.mlpackage`; **Metal Performance Primitives (MPP)** `tensor_ops::matmul2d` / `convolution2d` in shaders ("Shader ML"), e.g. neural material compression at ~50% the size of block-compressed textures. (https://developer.apple.com/videos/play/wwdc2025/262/)
- **MetalFX** gained frame interpolation and ray-tracing denoising (in addition to spatial/temporal upscaling).

### WWDC26 additions (macOS 27)
From https://developer.apple.com/videos/play/wwdc2026/330/:
- TensorOps "fully exploits the Neural Accelerator" in M5-family GPUs (a block "directly in each shader core" for dense compute-bound work such as LLM prefill).
- Quantized tensor types: int4/int8 in macOS 26; **fp4/fp8, int2, and FP8 E8M0 block-wise scales** in macOS 27; multi-plane `MTLTensor` (data + scales + metadata) with hardware dequant in TensorOps.
- **Cooperative tensors** (thread-private storage reusable directly as matmul inputs), `reduce_rows()` for softmax, simdgroup-scoped execution for FlashAttention-style kernels.
- Stack as Apple draws it: Core AI / MLX (high) -> Metal Performance Shaders (mid) -> MPP/TensorOps (low).

### MPS and MPSGraph
MPSGraph: "Build, compile, and execute compute graphs utilizing all the different compute devices on the platform, including GPU, CPU, and Neural Engine." Symbolic graph of ops/tensors backed by `MTLBuffer`/`MTLTexture`, compiled to `MPSGraphExecutable`, serializable as `.mpsgraphpackage`; has training support (sample "Training a neural network using MPSGraph"). (https://developer.apple.com/documentation/metalperformanceshadersgraph.md) It is the layer PyTorch's MPS backend historically lowered to (section 7).

### Metal Shading Language and command buffers (unchanged Metal 3 basics)
MSL is a C++-based shading language; work is encoded into command buffers via render/compute/blit encoders and committed to a command queue. (Metal 3 basics are background knowledge; the Metal 4 sources above document the current encoder model.)

---

## 7. PyTorch MPS backend

- Definition: "enables high-performance training on GPU for macOS devices with Metal programming framework"; maps graphs onto MPSGraph and optimized Metal kernels; use `device="mps"`; requires macOS 14.0+ per current error text. (https://docs.pytorch.org/docs/2.14/notes/mps.html)
- **PyTorch 2.14 (Sep 2, 2026)** Apple-silicon changes (https://pytorch.org/blog/pytorch-2-14-release-blog/):
  - Native Metal linear-algebra kernels replacing MPSGraph primitives: SVD/eigh/lstsq (Jacobi-style, float32 and complex64), Cholesky (~1.2-2.8x), `lu_factor`/`lu_solve` (>100x on small batched, 2-9x on large single), `geqrf`, `linalg_qr`, `matrix_exp`, `linalg.polar`. **Float64 falls back to CPU because Metal has no double type.**
  - Continued migration of ops off MPSGraph to native Metal (index_add/select, argmin/argmax, conv3d, median, arange, GLU, reductions rewrite) to remove per-op graph compile cost.
  - `F.linear` decode path: fixes an **8.5x slowdown** for bf16/fp16 `[B,1,K]` single-token shapes with new GEMV kernels.
  - Prefill attention via a new **Metal Performance Primitives kernel (macOS 26.2+)**: 2-4x speedup, fp16/bf16, head dims 64/96/128/256, query length > 8; validated best on M5.
  - `ctc_loss` forward/backward now native (no CPU fallback for ASR/OCR).
  - Caching allocator buckets large allocations; placement heaps to cut fragmentation; pinned-buffer blits for CPU->MPS copies.
  - `torch.compile` is not available on Python 3.15; MPS use there is eager-only. (Whether Inductor's Metal backend is default on other Python versions is **UNVERIFIED** here.)
- **Op coverage / fallbacks**: tracking issue https://github.com/pytorch/pytorch/issues/141287 — long-tail ops still missing as of its last updates included `aten::_int_mm`, some `linalg_*`, `_embedding_bag`, `grid_sampler_2d_backward`, distribution samplers. `PYTORCH_ENABLE_MPS_FALLBACK=1` routes unsupported ops to CPU (documented in issues https://github.com/pytorch/pytorch/issues/86195 ; https://github.com/pytorch/pytorch/issues/134416). No fp64 on the GPU.
- Known perf characteristics: small-shape/decode GEMV (fixed in 2.14), per-op MPSGraph compilation overhead (being removed), CPU fallback round trips through unified memory (no PCIe copy, but sync stalls).

---

## 8. MLX

Version 0.32.2 (PyPI Aug 25, 2026; https://pypi.org/project/mlx/). Repo https://github.com/ml-explore/mlx.

- **Lazy evaluation**: "When you perform operations in MLX, no computation actually happens. Instead a compute graph is recorded" until `mx.eval()`; enables `grad`/`vmap` transforms on unevaluated graphs and deferred allocation for large model init; graph construction itself still costs. (https://ml-explore.github.io/mlx/build/html/usage/lazy_evaluation.html)
- **Unified memory**: arrays live in one place; ops take a `stream=mx.cpu|mx.gpu`; scheduler tracks cross-device dependencies. (https://ml-explore.github.io/mlx/build/html/usage/unified_memory.html)
- **Quantization**: `mx.quantize(w, group_size=None, bits=None, mode='affine', global_scale=...)`, `mx.quantized_matmul`, `gather_qmm`, `qqmm`, `to_fp8/from_fp8`; `mlx.nn.quantize`, `QuantizedLinear`, `QuantizedEmbedding`. (https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.core.quantize.html ; https://ml-explore.github.io/mlx/build/html/python/ops.html) Recent releases added **nvfp4 / mxfp4 / mxfp8** modes and **NAX kernels** (Apple's name in MLX for M5 GPU Neural Accelerator paths), fused attention for head-dim 256, plus a CUDA backend and Windows support. (https://github.com/ml-explore/mlx/releases)
- **Distributed**: backends `mpi`, `ring` (TCP, "usually faster than MPI"), **`jaccl`** ("low latency communication with RDMA over thunderbolt. Necessary for things like tensor parallelism"), `nccl` (CUDA). Collectives: `all_sum/all_max/all_min/all_gather/send/recv/sum_scatter`; launch with `mlx.launch`. (https://ml-explore.github.io/mlx/build/html/usage/distributed.html)
  - JACCL RDMA-over-Thunderbolt merged Dec 17, 2025 (PR #2808); requires **Thunderbolt 5** Macs (TB4 unsupported), RDMA enabled in recoveryOS via `rdma_ctl enable`. (https://github.com/ml-explore/mlx/pull/2808)
  - Apple: RDMA over Thunderbolt 5 is supported "starting in macOS 26.2." WWDC26 demo on **4x M3 Ultra**: Qwen3.6-27B inference ~**3x** token-rate speedup with tensor parallelism; Qwen3.5-9B LoRA fine-tune **~180 -> ~600 tok/s (3.3x)**; Kimi K2.6 (1T params, ~1 TB at 8-bit) run across 4 machines with pipeline parallelism. Tensor parallel needs mesh topology (latency-bound); pipeline parallel only needs ring. (https://developer.apple.com/videos/play/wwdc2026/233/)
- **mlx-lm** (https://github.com/ml-explore/mlx-lm): generation, chat REPL, OpenAI-compatible server, HF Hub integration, quantize+upload, rotating KV cache, prompt caching, samplers/logits processors, distributed inference/fine-tuning via `mx.distributed`.
  - **LoRA/QLoRA/DoRA/full**: `mlx_lm.lora --train --fine-tune-type lora|dora|full`, `--num-layers` (default 16), `--batch-size` (default 4), `--grad-accumulation-steps`, `--grad-checkpoint`; QLoRA is automatic when `--model` is a quantized model; `mlx_lm.fuse` merges adapters (optional GGUF export for Llama/Mistral/Mixtral fp16). Example: "M1 Max with 32 GB runs at about 250 tokens-per-second" with minimal settings. (https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md)
- Ollama announced on March 30, 2026 that it is switching to MLX as its Apple-silicon engine (preview; v0.19.0 routes GGUF->llama.cpp, safetensors->MLX). (https://yage.ai/share/mlx-apple-silicon-en-20260331.html)
- Apple's Foundation Models framework now ships an open-source `MLXLanguageModel` that runs models on the Mac GPU behind the same `LanguageModelSession` API. (https://developer.apple.com/videos/play/wwdc2026/241/)

---

## 9. Core ML (and its successor Core AI)

### Core ML / coremltools
- **ML program** model type: "decouples the weights from the program architecture"; expressed in **MIL** (Model Intermediate Language); stored only as `.mlpackage` (a bundle separating architecture, weights blob and metadata); min deployment iOS 15 / macOS 12; **float16 compute precision by default** (`compute_precision=ct.precision.FLOAT32` to override). (https://apple.github.io/coremltools/docs-guides/source/convert-to-ml-program.html ; https://developer.apple.com/documentation/coreml/updating-a-model-file-to-a-model-package.md)
- **Compute units** (`MLComputeUnits`): `.all` (OS picks, including ANE), `.cpuOnly`, `.cpuAndGPU`, `.cpuAndNeuralEngine`. (https://developer.apple.com/documentation/coreml/mlcomputeunits.md) Core ML partitions the graph: the ANE compiler accepts the subgraphs it can lower and the rest runs on GPU (MPSGraph/Metal) or CPU (BNNS); see section 10 for why ops fall back.
- **Stateful models** (iOS 18 / macOS 15, mlprogram only): PyTorch `register_buffer` -> `ct.StateType`; runtime reads/updates state in place; toy KV-cache attention benchmark on M3 Max: ~4,245 ms -> ~238 ms for 100 tokens (~18x). (https://apple.github.io/coremltools/docs-guides/source/stateful-models.html)
- coremltools 8: stateful + multifunction models + compression (palettization, pruning, low-bit quantization). coremltools **9.0 (Nov 10, 2025)**: macOS 26/iOS 26 targets, Python 3.13, PyTorch 2.7, ExecuTorch 0.5, int8 model I/O, read/write model state, `AllowLowPrecisionAccumulationOnGPU` hint. (https://github.com/apple/coremltools/releases ; https://apple.github.io/coremltools/docs-guides/source/new-features.html)
- Apple's ANE deployment guidance for transformers: use (B, C, 1, S) channels-first layout, replace `nn.Linear` with `nn.Conv2d`, keep last axis 64-byte aligned/unpadded (misuse costs up to 32x memory in fp16, 64x in int8), chunk attention per head; distilbert result: "up to 10 times faster," 14x lower peak memory, 3.47 ms at seq 128 on iPhone 13. At short sequences the ANE is bandwidth-bound. (https://machinelearning.apple.com/research/neural-engine-transformers)

### Core AI (new, WWDC26, macOS 27 / iOS 27+)
- "Run AI models in your app on Apple silicon ... across the CPU, GPU, and Neural Engine." Apple says it is the inference engine powering Apple Intelligence. Core ML remains for "model types other than neural networks, such as decision trees or tabular feature engineering." (https://developer.apple.com/documentation/coreai.md ; https://developer.apple.com/videos/play/wwdc2026/324/)
- Format **`.aimodel`**; authoring via `pip install coreai-torch` (`torch.export` -> `TorchConverter().add_exported_program(...).to_coreai()` -> `save_asset(...)`), compression via **coreai-opt** (int4/int8/fp4/fp8, palettization, QAT, calibration; SAM3 example 3 GB fp32 -> 430 MB at 4-bit), custom **Metal 4 MSL kernels** embedded in the asset, native KV-cache/state support (`state_names=[...]`), multi-function models (cached image embedding made second inference 76% faster). (https://developer.apple.com/videos/play/wwdc2026/325/)
- Runtime: two-stage **specialization** (compile: segment graph, plan resources; codegen: device+OS-specific artifacts) cached per device; **AOT** compile via `save_asset(compile_aot=True)` or `coreai-build`. Swift API: `AIModel`, `InferenceFunction`, `NDArray` (non-escapable views for zero-copy), `ComputeStream`, `AIModelCache`, `SpecializationOptions` with `ComputeUnitKind {.cpu, .gpu, .neuralEngine}` (default: all available). (https://developer.apple.com/videos/play/wwdc2026/324/ ; https://developer.apple.com/documentation/coreai/computeunitkind.md)
- Tools: Core AI Debugger app (trace tensors back to Python source, PSNR sync points), Core AI Instruments, Xcode debug gauge; `coreai-models` repo. (https://developer.apple.com/videos/play/wwdc2026/325/)
- `CoreAILanguageModel` is the open-source ANE-backed provider for the Foundation Models framework. (https://developer.apple.com/videos/play/wwdc2026/241/)

---

## 10. Apple Neural Engine (ANE)

Public architecture is reverse-engineered; the two most detailed sources are a Georgia Tech paper (https://www.alphaxiv.org/abs/2606.22283) and "Orion" (https://arxiv.org/html/2603.06728), plus the ANE guide https://ane-guide.readthedocs.io/en/latest/.

- **Topology**: M1 has 4 ANE compute cores; M5 has 16; Apple markets M5 as 16-core ANE, M5 Ultra 32-core, M6 dual 16-core (section 0). Output channels are distributed round-robin across cores. (https://www.alphaxiv.org/abs/2606.22283)
- **Datapath/dtypes**: fixed-function MAC array that is **fp16 end-to-end** with a wide (fp32-class) accumulator; fp32/int32 inputs are converted to fp16; INT8 exists but "values are dequantized to fp16 before computation," so int8 mainly saves bandwidth. IEEE quirks: signed-zero loss, indeterminate forms flush to +0, an M1/A14 "slice saturation" hazard above 4094. (https://www.alphaxiv.org/abs/2606.22283 ; https://arxiv.org/html/2603.06728)
- **Peak vs sustained**: M1 ~12 fp16 TFLOP/s peak, ~4.8 sustained; weight streaming ~51 GB/s of 85 GB/s; ridge point ~141 FLOP/byte; dispatch ~0.23 ms per op. M4 Max: 16 cores, 32 MB SRAM, spec 38 TOPS int8, measured ~19 fp16 TFLOPS, ~0.095 ms dispatch, queue depth 127. (https://www.alphaxiv.org/abs/2606.22283 ; https://arxiv.org/html/2603.06728)
- **SRAM cliffs**: per-op working-set limit "exactly 2 MB" on M1, 4.72 MB on M5; exceeding streams from DRAM (~30% throughput drop noted on M4 Max). (https://www.alphaxiv.org/abs/2606.22283 ; https://arxiv.org/html/2603.06728)
- **Software path**: Core ML/Core AI -> MIL -> `ANECompiler` (private) -> E5 microcode program; `_ANEClient` talks to the `aned` daemon; weights are baked at compile time; ~119 compilations per process limit; concat is rejected by the compiler; GELU needs tanh approximation; 32K-channel convolutions rejected; 3D convolution is "accepted by compiler but fails execution." (https://arxiv.org/html/2603.06728 ; https://www.alphaxiv.org/abs/2606.22283)
- **Why ops fall back to GPU/CPU**: unsupported or shape-rejected ops (concat, large channels, 3D conv, gather-style indexing such as embedding lookup / NLL loss), dynamic control flow and sampling, fp32-required numerics, working sets > SRAM, anything needing mutable weights (optimizers). Core ML's partitioner splits the graph at those points. (https://arxiv.org/html/2603.06728)
- **Sweet spot**: convolution/vision encoders and mid-sized matmuls; 14.5x better energy than GPU on conv-heavy work; int4 LUT weights ~2.37x faster than fp16, structured sparsity 1.55-1.64x; "3.8x faster than the same chip's GPU on 256-channel 3x3 convolutions" (M1 Max). Poor fit: large square GEMMs, long-sequence attention, LLM autoregressive decode (bandwidth-bound). (https://www.alphaxiv.org/abs/2606.22283 ; https://ane-guide.readthedocs.io/en/latest/)
- **Training on ANE** (research only): Orion trained a 110M model at 494 ms/step with delta compilation (3.8x over recompiling), sustaining 0.612 TFLOPS; GPT-2 124M inference 170+ tok/s on M4 Max. (https://arxiv.org/html/2603.06728)

---

## 11. Accelerate, AMX, SME, BNNS

- **AMX (M1-M3)**: an undocumented matrix coprocessor "sharing the L2 cache of the P-cluster"; M1 has two blocks (one for the 4 P-cores, a smaller one for E-cores). Measured: ~1,525 GFLOPS load-free single-thread, 610-680 GFLOPS with loads, ~1,330 GFLOPS P-cluster at 4 threads, up to 1,483 GFLOPS across 8 threads. Accelerate routes `cblas_sgemm` (and BNNS matmul) to AMX with shape-agnostic tiles; a custom pre-packed AMX kernel beat BNNSMatMul by 1.58x geomean on prefill GEMMs and lifted llama.cpp prefill 291 -> 420 tok/s. (https://arxiv.org/html/2606.25426)
- **SME (M4+)**: Apple moved to the Arm **Scalable Matrix Extension** (ARMv9.2-A) as the public ISA for the matrix unit; "one such block per CPU cluster" — a large one shared by the P-cluster and a smaller one in the E-cluster; streaming SVE VL = 512 bits, ZA tile 4,096 bytes; measured ~2 TFLOPS fp32 matrix MAC on the P-cluster, ~250 GFLOPS vector FMLA. (https://github.com/tzakharko/m4-sme-exploration/blob/main/reports/01-sme-overview.md) The Eclectic Light power tests show `vDSP_mmul` threads drawing ~3.6 W each on P cores vs 3.0 W NEON, and degraded matrix throughput on E cores. (https://eclecticlight.co/2024/11/27/inside-m4-chips-matrix-processing-and-power-modes/)
- **BNNS** (Accelerate): CPU neural-network layers (convolution, fully connected, normalization, pooling, activation, embedding, loss, Adam/AdamW/RMSProp/SGD optimizers, quantize/dequantize, top-k, gather/scatter), macOS 11+; **BNNSGraph** compiles MIL/Core ML-style graphs for CPU execution (availability of BNNSGraph API version specifics **UNVERIFIED** beyond the reference listing). BNNS is the CPU backend Core ML uses and it dispatches its GEMMs to AMX/SME via Accelerate. (https://developer.apple.com/documentation/accelerate/bnns.md ; https://arxiv.org/html/2606.25426)

---

## 12. Apple Foundation Models framework and on-device models

- **2025 generation (macOS 26)**: ~3B-parameter on-device model; decoder weights **2 bits/weight via QAT**, embeddings 4-bit, KV cache 8-bit; two-block design (5:3 depth) sharing KV cache to cut KV memory **37.5%**; up to **65K** context in pre-training; adapters are **rank-32** LoRA trained with a Python toolkit; framework features `@Generable` constrained decoding and a `Tool` protocol with parallel/serial tool calls. (https://machinelearning.apple.com/research/apple-foundation-models-2025-updates)
- **2026 (macOS 27, AFM 3)**: **AFM 3 Core** = 3B dense; **AFM 3 Core Advanced** = 20B sparse "activating just 1 to 4 billion parameters at a time," stored in NAND with Instruction-Following Pruning and shared+routed experts selected per prompt; QAT; AFM 3 Cloud (PT-MoE) and AFM 3 Cloud Pro for Private Cloud Compute. Human-preference wins vs 2025 gen: AFM 3 Core 45.6% vs 23.3%. (https://machinelearning.apple.com/research/introducing-third-generation-of-apple-foundation-models)
- **Framework (WWDC26)**: `SystemLanguageModel().contextSize` reports **8192** for the on-device model; `tokenCount(for:)`; image attachments; Private Cloud Compute model with 32K context and `.light`/`.deep` reasoning levels, free for apps under 2M first-time downloads; `LanguageModel` protocol with open-source `CoreAILanguageModel` (ANE) and `MLXLanguageModel` (GPU) providers plus Anthropic/Google packages; `DynamicProfile`; system tools (OCR, barcode, Spotlight RAG); `fm` CLI and `apple_fm_sdk` Python SDK on macOS 27; core framework open-sourced to run on Linux. (https://developer.apple.com/videos/play/wwdc2026/241/)

---

## 13. Training vs inference: which unit does what

| Phase | Dominant unit on a Mac | Why | Source |
|---|---|---|---|
| Training (MLX, PyTorch MPS) | GPU | Needs fp32/bf16, mutable weights, backward ops; ANE weights are immutable and fp16-only | https://arxiv.org/html/2603.06728 ; https://pytorch.org/blog/pytorch-2-14-release-blog/ |
| LLM prefill | GPU (M5+: GPU Neural Accelerators) | Compute-bound GEMMs; M5 accelerators sped TTFT 4.06x vs M4 on Qwen3-14B-4bit | https://yage.ai/share/mlx-apple-silicon-en-20260331.html ; https://developer.apple.com/videos/play/wwdc2026/330/ |
| LLM decode | GPU, limited by DRAM bandwidth | Reads all weights per token; M5 only 1.19x vs M4 on decode | https://yage.ai/share/mlx-apple-silicon-en-20260331.html |
| Vision/encoders, small transformers, background inference | ANE via Core ML/Core AI | 14.5x GPU energy efficiency on conv; SRAM-resident working sets | https://www.alphaxiv.org/abs/2606.22283 |
| Small GEMMs, CPU-only paths, Core ML CPU fallback | CPU + SME/AMX via Accelerate/BNNS | ~2 TFLOPS fp32 (M4 P-cluster SME) | https://github.com/tzakharko/m4-sme-exploration/blob/main/reports/01-sme-overview.md |

---

## 14. The memory-bandwidth bottleneck for LLM decode

- Mechanism: each generated token requires reading "essentially all of its weights out of memory" while doing "comparatively little maths," so arithmetic intensity is low and decode sits on the bandwidth-bound side of the roofline; prefill batches many tokens and is compute-bound. Rule of thumb: **tok/s ≈ (bandwidth GB/s ÷ model GB) × efficiency**, with measured efficiency 66-93%. M2 Max (400 GB/s) with Qwen3-8B: 4-bit 4.6 GB -> 64.9 tok/s (75% of the 87 theoretical); 8-bit 8.7 GB -> 40.0 tok/s (87%). (https://tensorfoundry.io/blog/roofline-llm-apple-silicon)
- Chip design responds by scaling bandwidth: 153 GB/s (M5) -> 307 (M5 Pro) -> 614 (M5 Max) -> 1.2 TB/s (M5 Ultra). (Apple newsroom links in section 0.)
- Implications: quantization (4-bit) roughly doubles decode speed vs 8-bit because bytes/token halve; MoE models decode fast because only active experts are read (Qwen3.6-35B-A3B decodes at 85-105 tok/s vs 17-32 tok/s for dense 27B on the same M5 Max; https://github.com/stared/benching-local-llms-on-apple-silicon); speculative decoding / MTP raises throughput by amortizing weight reads over several tokens (MTP gave +75% on dense 27B, +12% on the MoE; same source).

### llama.cpp Apple-silicon benchmark table (LLaMA-2 7B; PP = prompt processing at batch 512, TG = text generation; tok/s)
Source: https://github.com/ggml-org/llama.cpp/discussions/4167 (community-maintained; ranges reflect GPU-core variants).

| Chip | GPU cores | BW GB/s | F16 TG | Q8_0 TG | Q4_0 TG | Q4_0 PP |
|---|---|---|---|---|---|---|
| M1 | 7-8 | 68 | — | 7.9 | 14.2 | 108-118 |
| M1 Pro | 14-16 | 200 | 12.8 | 22.0-22.3 | 35.5-36.4 | 233-266 |
| M1 Max | 24-32 | 400 | 22.6-23.0 | 37.8-40.2 | 54.6-61.2 | 400-530 |
| M1 Ultra | 48-64 | 800 | 33.9-37.0 | 55.7-59.9 | 74.9-83.7 | 772-1030 |
| M2 | 8-10 | 100 | 6.7 | 12.2 | 21.7-21.9 | 146-180 |
| M2 Pro | 16-19 | 200 | 12.5-13.1 | 22.7-23.0 | 37.9-38.9 | 294-341 |
| M2 Max | 30-38 | 400 | 24.2-24.7 | 40.0-41.8 | 61.0-66.0 | 538-671 |
| M2 Ultra | 60-76 | 800 | 39.9-41.0 | 62.1-66.6 | 88.6-94.3 | 1014-1238 |
| M3 Pro | 14-18 | 150 | 9.9 | 17.4-17.5 | 30.7 | 269-342 |
| M3 Max | 30-40 | 300-400 | 19.5-25.1 | 34.3-42.8 | 56.6-66.3 | 568-760 |
| M3 Ultra | 60-80 | 800 | 39.8-42.2 | 63.6-63.9 | 88.4-92.1 | 1073-1471 |
| M4 | 10 | 120 | 7.4 | 13.5 | 24.1 | 221 |
| M4 Pro | 16-20 | 273 | 17.2 | 30.5-30.7 | 49.6-50.7 | 364-440 |
| M4 Max | 32-40 | 410-546 | 24.3-31.6 | 43.9-54.1 | 70.0-83.1 | 714-886 |
| M5 Pro | 20 | 307 | 21.6 | 38.9 | 66.3 | 1621 |
| M5 Max | 40 | 614 | 37.1 | 72.4 | 119.9 | 3220 |

Observation from the table: TG tracks bandwidth almost linearly (M1 Ultra 800 GB/s ≈ 2x M1 Max 400 GB/s ≈ 2x TG), while M5 Max PP jumps ~3.5x over M4 Max at similar bandwidth thanks to GPU Neural Accelerators. llama.cpp's Metal backend uses the Metal 4 tensor API only on M5-class devices (gated by chip name, with a runtime test-kernel compile; `GGML_METAL_TENSOR_DISABLE=1` turns it off; startup bug on macOS 26.2-26.4 fixed in build b10734, Sept 1, 2026). (https://modelfit.io/blog/m5-mac-metal-tensor-api-llama-cpp-fix/)

Other 2026 datapoints: M4 Pro 64 GB, Qwen3-Coder-30B-A3B: MLX ~130 tok/s vs raw llama.cpp 89.4 vs Ollama 43 (MLX advantage over raw llama.cpp ~1.4-1.8x per that article) (https://yage.ai/share/mlx-apple-silicon-en-20260331.html); but on M5 Max with Qwen3.6 8-bit, llama.cpp beat MLX by 10-24% in June 2026 (https://github.com/stared/benching-local-llms-on-apple-silicon) — so engine ranking is workload- and version-dependent.

---

## 15. One-page layer map (top to bottom)

1. **Apps / agents** — Foundation Models framework (`LanguageModelSession`, `@Generable`, tools, DynamicProfile; providers: system AFM 3 Core on ANE/GPU, PCC, CoreAILanguageModel, MLXLanguageModel, Anthropic/Google packages).
2. **ML frameworks** — MLX (lazy graphs, unified memory, quantized kernels, NAX, JACCL distributed) · PyTorch MPS (MPSGraph + native Metal kernels; CPU fallback) · Core AI (`.aimodel`, specialization, CPU/GPU/ANE) · Core ML (`.mlpackage`, MIL, stateful) · llama.cpp Metal.
3. **Compute libraries** — Metal Performance Shaders / MPSGraph (GPU, also targets ANE) · Metal Performance Primitives/TensorOps in MSL · Accelerate (BNNS, vDSP, BLAS -> AMX/SME).
4. **GPU API** — Metal 4 (MTL4 command queues/buffers/allocators, argument tables, residency sets, placement sparse, barriers, `MTLTensor`, ML command encoder), Metal Shading Language, MetalFX (upscale, frame interpolation, denoise), hardware ray tracing + mesh shading on M3+.
5. **ANE runtime** — Core ML/Core AI -> MIL -> ANECompiler -> E5 microcode -> `aned` daemon; IOSurface zero-copy I/O; fp16 datapath; SRAM-limited working sets.
6. **Kernel** — XNU (Mach + BSD + IOKit + libkern), 16 KB pages, AMP scheduler driven by QoS, PAC/PPL/SPTM, kernel collections; drivers in-kernel (IOKit kexts incl. AGX GPU driver) or user space (DriverKit dexts).
7. **Memory fabric** — one unified DRAM pool; CPU MMU, GPU UAT (ARM64-format page tables managed by GPU firmware), DARTs for other DMA engines; all coherent; bandwidth 153 GB/s (M5) to 1.2 TB/s (M5 Ultra).
8. **Boot/security** — Boot ROM -> LLB (LocalPolicy, paired firmware) -> iBoot (kernel collections, SSV seal SHA-256 Merkle root) -> kernel; Secure Enclave (sepOS on L4, encrypted memory, signs LocalPolicy, holds key entropy).

---

## Sources (all consulted 2026-09-22)

- https://9to5mac.com/2026/09/09/macos-27-golden-gate-here-are-apples-full-release-notes/
- https://www.macrumors.com/roundup/macos-27/
- https://support.apple.com/guide/security/boot-process-secac71d5623/web
- https://support.apple.com/guide/security/secure-enclave-sec59b0b31ff/web
- https://support.apple.com/guide/security/signed-system-volume-security-secd698747c9/web
- https://help.apple.com/pdf/security/en_US/apple-platform-security-guide.pdf
- https://eclecticlight.co/2024/10/24/how-macs-boot-securely-or-cant/
- https://github.com/apple-oss-distributions/xnu
- https://en.wikipedia.org/wiki/XNU
- https://karol-mazurek.medium.com/snake-apple-x-nu-0bc5c36170da
- https://asahilinux.org/docs/hw/soc/agx/
- https://lwn.net/Articles/861126/
- https://developer.apple.com/documentation/metal/choosing-a-resource-storage-mode-for-apple-gpus.md
- https://developer.apple.com/news/?id=vk3m204o
- https://eclecticlight.co/2025/05/09/what-is-quality-of-service-and-how-does-it-matter/
- https://developer.apple.com/documentation/driverkit.md
- https://developer.apple.com/videos/play/tech-talks/111375/
- https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max-the-most-advanced-chips-for-a-personal-computer/
- https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/
- https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/
- https://www.apple.com/newsroom/2026/08/apple-introduces-m6-and-m5-ultra-for-a-big-leap-in-performance-and-ai-compute/
- https://developer.apple.com/videos/play/wwdc2025/205/
- https://developer.apple.com/videos/play/wwdc2025/262/
- https://developer.apple.com/videos/play/wwdc2026/330/
- https://developer.apple.com/documentation/metalperformanceshadersgraph.md
- https://docs.pytorch.org/docs/2.14/notes/mps.html
- https://pytorch.org/blog/pytorch-2-14-release-blog/
- https://github.com/pytorch/pytorch/issues/141287
- https://github.com/pytorch/pytorch/issues/86195
- https://pypi.org/project/mlx/
- https://github.com/ml-explore/mlx/releases
- https://github.com/ml-explore/mlx/pull/2808
- https://ml-explore.github.io/mlx/build/html/usage/distributed.html
- https://ml-explore.github.io/mlx/build/html/usage/lazy_evaluation.html
- https://ml-explore.github.io/mlx/build/html/usage/unified_memory.html
- https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.core.quantize.html
- https://github.com/ml-explore/mlx-lm
- https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md
- https://developer.apple.com/videos/play/wwdc2026/233/
- https://developer.apple.com/wwdc26/guides/machine-learning/
- https://developer.apple.com/documentation/coreai.md
- https://developer.apple.com/documentation/coreai/computeunitkind.md
- https://developer.apple.com/videos/play/wwdc2026/324/
- https://developer.apple.com/videos/play/wwdc2026/325/
- https://developer.apple.com/documentation/coreml/mlcomputeunits.md
- https://apple.github.io/coremltools/docs-guides/source/convert-to-ml-program.html
- https://apple.github.io/coremltools/docs-guides/source/stateful-models.html
- https://apple.github.io/coremltools/docs-guides/source/new-features.html
- https://github.com/apple/coremltools/releases
- https://pypi.org/project/coremltools/
- https://machinelearning.apple.com/research/neural-engine-transformers
- https://www.alphaxiv.org/abs/2606.22283
- https://arxiv.org/html/2603.06728
- https://ane-guide.readthedocs.io/en/latest/
- https://arxiv.org/html/2606.25426
- https://github.com/tzakharko/m4-sme-exploration/blob/main/reports/01-sme-overview.md
- https://eclecticlight.co/2024/11/27/inside-m4-chips-matrix-processing-and-power-modes/
- https://developer.apple.com/documentation/accelerate/bnns.md
- https://machinelearning.apple.com/research/apple-foundation-models-2025-updates
- https://machinelearning.apple.com/research/introducing-third-generation-of-apple-foundation-models
- https://developer.apple.com/videos/play/wwdc2026/241/
- https://tensorfoundry.io/blog/roofline-llm-apple-silicon
- https://github.com/ggml-org/llama.cpp/discussions/4167
- https://yage.ai/share/mlx-apple-silicon-en-20260331.html
- https://github.com/stared/benching-local-llms-on-apple-silicon
- https://modelfit.io/blog/m5-mac-metal-tensor-api-llama-cpp-fix/
