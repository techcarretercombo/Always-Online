import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="text-8xl font-black text-primary/20">404</div>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-muted-foreground">This page doesn't exist or was removed.</p>
        <Link href="/feed">
          <Button className="gap-2 mt-2">
            <Home size={16} />
            Back to feed
          </Button>
        </Link>
      </div>
    </div>
  );
}
