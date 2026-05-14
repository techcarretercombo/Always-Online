import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Zap } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password required"),
});

const registerSchema = z.object({
  fullName: z.string().min(2, "At least 2 characters"),
  username: z.string().min(3, "At least 3 characters").regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscore only"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPw, setShowPw] = useState(false);
  const login = useLogin();
  const register = useRegister();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", username: "", email: "", password: "" },
  });

  function handleLogin(data: LoginForm) {
    login.mutate({ data }, {
      onSuccess: (res: any) => {
        setToken(res.token);
        queryClient.invalidateQueries();
        window.location.href = import.meta.env.BASE_URL + "feed";
      },
      onError: (err: any) => {
        toast({ title: "Login failed", description: err?.data?.error ?? "Invalid credentials", variant: "destructive" });
      },
    });
  }

  function handleRegister(data: RegisterForm) {
    register.mutate({ data }, {
      onSuccess: (res: any) => {
        setToken(res.token);
        queryClient.invalidateQueries();
        window.location.href = import.meta.env.BASE_URL + "feed";
      },
      onError: (err: any) => {
        toast({ title: "Registration failed", description: err?.data?.error ?? "Please try again", variant: "destructive" });
      },
    });
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 sjm-gradient p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur">
            <span className="font-black text-xl">S</span>
          </div>
          <span className="font-black text-2xl tracking-tight">SJM</span>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 text-white/70 text-sm font-medium uppercase tracking-widest">
            <Zap size={14} className="fill-white/70" />
            Social. Real. Alive.
          </div>
          <h1 className="text-5xl font-black leading-tight">
            Everything social,<br />in one place.
          </h1>
          <p className="text-white/80 text-lg max-w-md leading-relaxed">
            Posts, stories, reels, messages, groups, marketplace — the platform your community lives on.
          </p>
          <div className="flex gap-6 pt-2">
            {[["Feed", "Share moments"], ["Reels", "Short videos"], ["Messages", "Stay connected"], ["Groups", "Find your tribe"]].map(([title, desc]) => (
              <div key={title}>
                <div className="font-bold text-sm">{title}</div>
                <div className="text-xs text-white/60">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/40 text-xs">SJM © {new Date().getFullYear()}</p>
      </div>

      {/* Right: auth */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden mb-2">
            <div className="w-9 h-9 rounded-xl sjm-gradient flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="font-black text-2xl tracking-tight">SJM</span>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="w-full mb-2">
              <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>Sign in to your SJM account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...loginForm.register("email")}
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input
                          type={showPw ? "text" : "password"}
                          placeholder="••••••••"
                          {...loginForm.register("password")}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPw(v => !v)}
                        >
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={login.isPending}>
                      {login.isPending ? <><Loader2 size={16} className="mr-2 animate-spin" />Signing in...</> : "Sign In"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle>Create account</CardTitle>
                  <CardDescription>Join SJM today — it's free</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Full name</Label>
                        <Input placeholder="John Doe" {...registerForm.register("fullName")} />
                        {registerForm.formState.errors.fullName && (
                          <p className="text-xs text-destructive">{registerForm.formState.errors.fullName.message}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Username</Label>
                        <Input placeholder="john_doe" {...registerForm.register("username")} />
                        {registerForm.formState.errors.username && (
                          <p className="text-xs text-destructive">{registerForm.formState.errors.username.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input type="email" placeholder="you@example.com" {...registerForm.register("email")} />
                      {registerForm.formState.errors.email && (
                        <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input
                          type={showPw ? "text" : "password"}
                          placeholder="••••••••"
                          {...registerForm.register("password")}
                          className="pr-10"
                        />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(v => !v)}>
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {registerForm.formState.errors.password && (
                        <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={register.isPending}>
                      {register.isPending ? <><Loader2 size={16} className="mr-2 animate-spin" />Creating account...</> : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
