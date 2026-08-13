import { Link } from '@tanstack/react-router';
import { Users } from 'lucide-react';
import { Card } from './Card';

export interface ClubCardData {
  id: string;
  name: string;
  description: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  _count: { members: number };
}

export function ClubCard({ club }: { club: ClubCardData }) {
  return (
    <Link to="/clubs/$clubId" params={{ clubId: club.id }}>
      <Card className="p-5 transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">{club.name}</h2>
          <span className="flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400">
            <Users className="h-3.5 w-3.5" /> {club._count.members}
          </span>
        </div>
        {club.description && (
          <p className="mt-2 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">{club.description}</p>
        )}
      </Card>
    </Link>
  );
}
