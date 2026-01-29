import { useState } from "react";
import { validateAdmin, loginAdmin } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, User, Zap } from "lucide-react";

interface AdminLoginProps {
  onLogin: () => void;
}

const AdminLogin = ({ onLogin }: AdminLoginProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simulate loading for effect
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (validateAdmin(username, password)) {
      loginAdmin();
      onLogin();
    } else {
      setError("Invalid credentials");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" />

      <div className="glass rounded-2xl p-8 w-full max-w-md relative animate-scale-in">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="gradient-primary p-3 rounded-2xl glow-primary">
            <Zap className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>

        <h1 className="text-3xl font-display font-bold text-center mb-2 text-gradient">
          SnapTalk
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Admin Portal
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-12 h-14 bg-muted/50 border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 h-14 bg-muted/50 border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          {error && (
            <p className="text-destructive text-sm text-center animate-fade-in">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 gradient-primary text-primary-foreground font-semibold rounded-xl glow-primary hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
