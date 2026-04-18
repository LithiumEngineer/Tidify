'use client'

import { useEffect } from 'react'
import {
  Github,
  FolderOpen,
  Sparkles,
  Trash2,
  SlidersHorizontal,
  Award,
  Crop,
  Shield,
  Cpu,
  ImageIcon,
} from 'lucide-react'

const GITHUB_URL = 'https://github.com/LithiumEngineer/Tidify'

function useFadeIn() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible')
        })
      },
      { threshold: 0.15 }
    )
    document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

export default function Home() {
  useFadeIn()

  return (
    <main className="min-h-screen overflow-hidden">
      <Hero />
      <Divider />
      <HowItWorks />
      <Divider />
      <TechOverview />
      <Divider />
      <Features />
      <Footer />
    </main>
  )
}

function Divider() {
  return (
    <div className="max-w-5xl mx-auto px-6">
      <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
    </div>
  )
}

function Hero() {
  return (
    <section className="relative">
      <div className="hero-glow" />
      <div className="relative max-w-4xl mx-auto px-6 pt-36 pb-24 text-center">
        <div className="fade-in">
          <div className="flex items-center justify-center gap-4 mb-1">
            <img src="/logo.png" alt="Tidify logo" className="h-16 sm:h-20 w-auto" />
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.05] text-zinc-900">
              Tidify
            </h1>
          </div>
          <p className="mt-6 text-lg text-zinc-500 max-w-xl mx-auto leading-relaxed font-light">
            Find and remove duplicate photos on your computer.
          </p>
          <div className="mt-10">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-700 shadow-lg shadow-zinc-900/20 hover:shadow-xl hover:shadow-zinc-900/25"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
        </div>

        <div className="fade-in mt-20">
          <div className="screenshot-shadow screenshot-hover rounded-2xl overflow-hidden bg-zinc-900 p-2 pt-0">
            <img
              src="/app-demo-image.png"
              alt="Tidify app screenshot"
              width={3024}
              height={1964}
              className="w-full h-auto block rounded-b-lg"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

const steps = [
  {
    icon: FolderOpen,
    title: 'Pick a folder',
    description: 'Choose any directory on your machine to scan.',
    color: 'group-hover:bg-blue-50 group-hover:border-blue-200',
    iconColor: 'group-hover:text-blue-500',
  },
  {
    icon: Sparkles,
    title: 'Find duplicates',
    description: 'Images are embedded via CNN and matched by cosine similarity.',
    color: 'group-hover:bg-violet-50 group-hover:border-violet-200',
    iconColor: 'group-hover:text-violet-500',
  },
  {
    icon: Trash2,
    title: 'Review & clean up',
    description: 'See grouped results, keep the best, move the rest to Trash.',
    color: 'group-hover:bg-rose-50 group-hover:border-rose-200',
    iconColor: 'group-hover:text-rose-500',
  },
]

function HowItWorks() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-32">
      <div className="fade-in text-center mb-20">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900">
          How it works
        </h2>
      </div>
      <div className="grid md:grid-cols-3 gap-16 md:gap-12">
        {steps.map((step, i) => (
          <div key={i} className="fade-in text-center group cursor-default">
            <div className={`step-card inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-zinc-100 border border-zinc-200/80 mb-6 ${step.color}`}>
              <step.icon className={`h-5 w-5 text-zinc-400 transition-colors duration-300 ${step.iconColor}`} />
            </div>
            <h3 className="text-base font-medium text-zinc-900 mb-2.5">{step.title}</h3>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-[220px] mx-auto">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function TechOverview() {
  return (
    <section className="max-w-2xl mx-auto px-6 py-32">
      <div className="fade-in">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-center text-zinc-900 mb-10">
          Under the hood
        </h2>
        <div className="space-y-6 text-[15px] text-zinc-500 leading-[1.8] font-light">
          <p>
            Each photo is run through a small CNN (MobileNetV3) locally on your
            machine to produce a feature embedding — a vector that captures the
            visual content of an image rather than its raw pixels.
          </p>
          <p>
            These vectors are L2-normalized and indexed with FAISS. Cosine
            similarity between any two vectors determines how alike they are.
            Pairs above a threshold are grouped as duplicates using Union-Find.
            A sensitivity slider lets you tune how strict the matching is.
          </p>
          <p>
            Before embedding, a content-aware autocrop uses edge detection to
            strip whitespace and borders — so the same photo with different
            padding still matches. Within each group, images are ranked by
            resolution, sharpness, and file size to surface the best version.
          </p>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-2.5 text-[11px] text-zinc-400 tracking-wide">
          {['ONNX Runtime', 'MobileNetV3', 'FAISS', 'Cosine Similarity', 'Union-Find'].map(
            (label, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200/80">
                  {label}
                </span>
                {i < 4 && <span className="text-zinc-300">·</span>}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  )
}

const features = [
  {
    icon: SlidersHorizontal,
    title: 'Sensitivity control',
    description: 'Tune matching strictness — from near-exact copies to visually similar photos.',
    hoverBg: 'hover:bg-amber-50',
    hoverBorder: 'hover:border-amber-200',
    hoverIcon: 'group-hover:text-amber-500',
  },
  {
    icon: Award,
    title: 'Quality ranking',
    description: 'Surfaces the best version per group by resolution, sharpness, and metadata.',
    hoverBg: 'hover:bg-emerald-50',
    hoverBorder: 'hover:border-emerald-200',
    hoverIcon: 'group-hover:text-emerald-500',
  },
  {
    icon: Crop,
    title: 'Autocrop',
    description: 'Strips borders and whitespace before comparing so padded images still match.',
    hoverBg: 'hover:bg-sky-50',
    hoverBorder: 'hover:border-sky-200',
    hoverIcon: 'group-hover:text-sky-500',
  },
  {
    icon: Shield,
    title: 'Safe by default',
    description: 'Deletions go to Trash. Nothing is permanently removed.',
    hoverBg: 'hover:bg-violet-50',
    hoverBorder: 'hover:border-violet-200',
    hoverIcon: 'group-hover:text-violet-500',
  },
  {
    icon: Cpu,
    title: 'Fully local',
    description: 'Runs entirely on your machine. No cloud, no uploads, no internet required.',
    hoverBg: 'hover:bg-rose-50',
    hoverBorder: 'hover:border-rose-200',
    hoverIcon: 'group-hover:text-rose-500',
  },
  {
    icon: ImageIcon,
    title: 'HEIC support',
    description: 'iPhone photos just work — HEIC, JPEG, PNG, WebP, and more.',
    hoverBg: 'hover:bg-indigo-50',
    hoverBorder: 'hover:border-indigo-200',
    hoverIcon: 'group-hover:text-indigo-500',
  },
]

function Features() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-32">
      <div className="fade-in text-center mb-20">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900">
          Features
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <div
            key={i}
            className={`fade-in group feature-card rounded-2xl bg-white border border-zinc-200/80 p-6 cursor-default ${f.hoverBg} ${f.hoverBorder}`}
          >
            <f.icon className={`h-[18px] w-[18px] text-zinc-400 mb-4 transition-colors duration-300 ${f.hoverIcon}`} />
            <h3 className="text-sm font-medium text-zinc-900 mb-1.5">{f.title}</h3>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              {f.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="mt-8 pb-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent mb-10" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-zinc-400">
            © 2026 <a href="https://www.kevinkang.me/" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-600 transition-colors duration-300">Kevin Kang</a> · Licensed under the <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-600 transition-colors duration-300">Apache License 2.0</a>
          </p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-press inline-flex items-center gap-2 text-[13px] text-zinc-400 hover:text-zinc-600"
          >
            <Github className="h-3.5 w-3.5" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
