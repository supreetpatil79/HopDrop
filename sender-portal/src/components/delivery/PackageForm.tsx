import { ReactNode } from 'react';
import { Card } from '../ui/Card';

interface PackageFormProps {
  children: ReactNode;
}

export function PackageForm({ children }: PackageFormProps) {
  return <Card className="space-y-3">{children}</Card>;
}
