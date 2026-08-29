import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { speakerToSlug } from '../lib/speakerSlug'

interface SpeakerProfileLinkProps {
  name: string
  className?: string
}

export default function SpeakerProfileLink({ name, className = '' }: SpeakerProfileLinkProps) {
  if (!name || name === 'All') return null

  return (
    <Link
      to={`/speaker/${speakerToSlug(name)}`}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 transition-colors ${className}`}
    >
      <User size={13} />
      View {name}&apos;s profile
    </Link>
  )
}
