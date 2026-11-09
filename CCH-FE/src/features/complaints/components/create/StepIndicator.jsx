import { Check } from 'lucide-react'

/**
 * Step Indicator Component - Modern CCH Theme
 * Responsive visual progress bar for multi-step wizard across mobile, tablet, and desktop
 */
export function StepIndicator({ currentStep, steps }) {
  return (
    <div className="step-indicator mb-6 sm:mb-8">
      <div className="flex justify-between items-center max-w-2xl mx-auto">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isActive = currentStep === stepNumber
          const isCompleted = currentStep > stepNumber
          const isLast = index === steps.length - 1

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                {/* Step Circle */}
                <div
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm mb-1.5 sm:mb-2 transition-all duration-200 ${
                    isCompleted
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md shadow-green-500/30'
                      : isActive
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 ring-4 ring-blue-500/20 scale-105'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>

                {/* Step Label */}
                <div
                  className={`text-[11px] sm:text-xs font-medium text-center transition-colors line-clamp-1 sm:line-clamp-none ${
                    isActive
                      ? 'text-blue-600 font-bold'
                      : isCompleted
                      ? 'text-green-600 font-semibold'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </div>
              </div>

              {/* Connecting Line */}
              {!isLast && (
                <div className="flex-1 h-0.5 mx-1 sm:mx-2 -mt-6 sm:-mt-7">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isCompleted
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-slate-200'
                    }`}
                  ></div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
