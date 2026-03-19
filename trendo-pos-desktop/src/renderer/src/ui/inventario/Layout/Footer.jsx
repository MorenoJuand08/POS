
export default function Footer({ compact = false }) {
  const year = new Date().getFullYear()

  if (compact) {
    return (
      <div className="mt-8 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-300">Sistema Actualizado</span>
          </div>
          <div className="text-gray-600 dark:text-gray-300">Versión 1.0.0</div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" />
            </svg>
            <span className="hidden sm:inline">Sincronización Automática</span>
          </div>
          <span className="ml-auto text-gray-600 dark:text-gray-300 flex-shrink-0">© {year} Trendo</span>
        </div>
      </div>
    )
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800 py-3 px-3 sm:py-4 sm:px-6 z-50">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-6 max-w-full">
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap text-xs sm:text-sm">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-300">Sistema Actualizado</span>
          </div>
          <div className="text-gray-600 dark:text-gray-300 whitespace-nowrap">Versión 1.0.0</div>
        </div>
        <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600 dark:text-gray-300 flex-wrap justify-between sm:justify-end w-full sm:w-auto">
          <span className="whitespace-nowrap">© {year} Trendo POS</span>
          <div className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" />
            </svg>
            <span className="hidden sm:inline">Sincronización</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
