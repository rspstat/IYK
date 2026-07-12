interface ApiPendingPlaceholderProps {
  apiName: string
  description?: string
  className?: string
}

export default function ApiPendingPlaceholder({
  apiName,
  description,
  className = '',
}: ApiPendingPlaceholderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500 ${className}`}
    >
      <span>{apiName} 연동 예정</span>
      {description && <span className="text-xs">{description}</span>}
    </div>
  )
}
