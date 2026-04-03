import { ReactNode } from 'react';
import { Card } from '../ui/Card';

interface TripFormProps {
  title: string;
  children: ReactNode;
}

export function TripForm({ title, children }: TripFormProps) {
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </Card>
  );
}
