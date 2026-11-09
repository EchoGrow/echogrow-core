import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, ShieldCheck, Rocket, Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useScorecard } from '../../lib/scorecard/useScorecard'

const STEPS = [
  {
    id: 'scored',
    label: 'Scoring',
    description: 'Evaluating technical depth, communication, and problem solving.',
    icon: Brain,
    loadingMessages: [
      'Analyzing technical depth...',
      'Evaluating communication clarity...',
      'Assessing problem-solving approach...',
      'Comparing against rubric...',
    ],
  },
  {
    id: 'verified',
    label: 'Verifying',
    description: 'Cross-checking interview claims against the resume.',
    icon: ShieldCheck,
    loadingMessages: [
      'Extracting claims from CV...',
      'Cross-checking statements...',
      'Detecting contradictions...',
      'Flagging discrepancies...',
    ],
  },
  {
    id: 'planned',
    label: 'Planning',
    description: 'Generating a personalized growth roadmap.',
    icon: Rocket,
    loadingMessages: [
      'Identifying skill gaps...',
      'Selecting learning resources...',
      'Building weekly roadmap...',
      'Finalizing plan...',
    ],
  },
]

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-accent-500/30"
          initial={{
            x: Math.random() * 100 + '%',
            y: Math.random() * 100 + '%',
            opacity: Math.random() * 0.5 + 0.2,
          }}
          animate={{
            y: [null, Math.random() * -100 - 50],
            opacity: [null, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: 'linear',
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  )
}

// --- مكون الأيقونة النشطة (The Core) ---
function ActiveIconCore({ Icon }: { Icon: any }) {
  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      {/* 1. الطبقة الداخلية: نبض الرادار */}
      <motion.div
        className="absolute inset-0 rounded-full bg-accent-500/20"
        animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
      />
      
      {/* 2. الطبقة الوسطى: القوس الدوار */}
      <motion.div
        className="absolute inset-[-4px] rounded-full border-[3px] border-transparent border-t-accent-500 border-r-accent-500"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />

      {/* 3. الطبقة الخارجية: الخطوط المتقطعة الدوارة (عكس الاتجاه) */}
      <motion.div
        className="absolute inset-[-12px] rounded-full border border-dashed border-accent-500/40"
        animate={{ rotate: -360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* 4. النواة (الدائرة الرئيسية) */}
      <motion.div
        animate={{ 
          scale: [1, 1.03, 1],
          boxShadow: [
            "0 0 20px 0px rgba(34,169,133,0.3)",
            "0 0 30px 5px rgba(34,169,133,0.6)",
            "0 0 20px 0px rgba(34,169,133,0.3)"
          ]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 flex h-full w-full items-center justify-center rounded-full bg-accent-500 text-white"
      >
        <Icon className="h-9 w-9" />
      </motion.div>
    </div>
  )
}

export function ProcessingState() {
  const { scorecard } = useScorecard()
  const [messageIndex, setMessageIndex] = useState(0)
  
  const progress = scorecard && scorecard.status === 'processing' ? scorecard.progress : {
    isScored: false,
    isVerified: false,
    isPlanned: false,
  }

  const stepStates = [progress.isScored, progress.isVerified, progress.isPlanned]
  const activeStepIndex = stepStates.findIndex((isDone) => !isDone)
  const allDone = activeStepIndex === -1

  useEffect(() => {
    if (allDone) return
    const currentStep = STEPS[activeStepIndex] || STEPS[STEPS.length - 1]
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % currentStep.loadingMessages.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [activeStepIndex, allDone])

  const completedCount = stepStates.filter(Boolean).length
  const progressPercent = (completedCount / STEPS.length) * 100

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[65vh] py-12 px-4 overflow-hidden">
      
      <FloatingParticles />

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-line-strong/20">
        <motion.div 
          className="h-full bg-accent-500"
          initial={{ width: '0%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16 z-10"
      >
        <h2 className="text-3xl font-semibold text-fg-strong tracking-tight">
          {allDone ? 'Finalizing Report...' : 'Processing Interview'}
        </h2>
        
        <div className="h-6 mt-3 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-fg-muted font-medium"
            >
              {allDone 
                ? 'All steps complete. Preparing your dashboard.'
                : STEPS[activeStepIndex]?.loadingMessages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="relative flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 w-full max-w-4xl z-10">
        
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent-500/10 rounded-full blur-[80px] -z-10"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {STEPS.map((step, index) => {
          const isCompleted = stepStates[index]
          const isActive = index === activeStepIndex
          const isPending = index > activeStepIndex
          const Icon = step.icon

          return (
            <motion.div 
              key={step.id}
              layout
              initial={false}
              animate={{
                opacity: isPending ? 0.4 : 1,
                scale: isActive ? 1.05 : 1,
                y: isActive ? -8 : 0,
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className={cn(
                'relative flex flex-col items-center text-center p-6 rounded-3xl w-full max-w-[260px] transition-all duration-500',
                isActive && 'bg-surface-card shadow-xl border border-accent-500/30 ring-1 ring-accent-500/20',
                isCompleted && 'bg-surface-card/50 border border-line',
                isPending && 'bg-transparent border border-transparent'
              )}
            >
              <div className="relative mb-5">
                {isActive ? (
                  <ActiveIconCore Icon={Icon} />
                ) : (
                  <motion.div
                    layout
                    className={cn(
                      'flex h-20 w-20 items-center justify-center rounded-full transition-colors duration-500',
                      isCompleted && 'bg-success-500 text-white',
                      isPending && 'bg-chip text-fg-muted'
                    )}
                  >
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      >
                        <Check className="h-9 w-9" strokeWidth={3} />
                      </motion.div>
                    ) : (
                      <Icon className="h-9 w-9" />
                    )}
                  </motion.div>
                )}
              </div>

              <motion.h3 
                layout="position"
                className={cn(
                  'text-lg font-semibold mb-2 transition-colors duration-300',
                  isActive ? 'text-fg-strong' : 'text-fg-muted'
                )}
              >
                {step.label}
              </motion.h3>
              <motion.p 
                layout="position"
                className="text-xs text-fg-subtle leading-relaxed"
              >
                {step.description}
              </motion.p>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute -bottom-4 bg-accent-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm"
                  >
                    In Progress
                  </motion.div>
                )}
                {isCompleted && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute -bottom-4 bg-success-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm"
                  >
                    Done
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}