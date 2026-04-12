import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-3 text-center">
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-sm text-text-muted">The page you are looking for does not exist.</p>
        <Link to="/">
          <Button>Go Home</Button>
        </Link>
      </Card>
    </div>
  );
}
