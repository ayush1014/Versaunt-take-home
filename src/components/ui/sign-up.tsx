"use client";

import { cn } from "@/lib/utils";
import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
  Children,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlassButton } from "@/components/ui/glass-button";
import { GradientBackground } from "@/components/ui/gradient-background";
import {
  ArrowRight,
  Mail,
  Activity,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  X,
  AlertCircle,
  PartyPopper,
  Loader,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  type Variants,
  type Transition,
} from "framer-motion";
import type {
  GlobalOptions as ConfettiGlobalOptions,
  CreateTypes as ConfettiInstance,
  Options as ConfettiOptions,
} from "canvas-confetti";
import confetti from "canvas-confetti";

/* ----------------------------- Confetti ----------------------------- */
type Api = { fire: (options?: ConfettiOptions) => void };
export type ConfettiRef = Api | null;

const Confetti = forwardRef<
  ConfettiRef,
  React.ComponentPropsWithRef<"canvas"> & {
    options?: ConfettiOptions;
    globalOptions?: ConfettiGlobalOptions;
    manualstart?: boolean;
  }
>((props, ref) => {
  const {
    options,
    globalOptions = { resize: true, useWorker: true },
    manualstart = false,
    ...rest
  } = props;
  const instanceRef = useRef<ConfettiInstance | null>(null);
  const canvasRef = useCallback(
    (node: HTMLCanvasElement) => {
      if (node !== null) {
        if (instanceRef.current) return;
        instanceRef.current = confetti.create(node, {
          ...globalOptions,
          resize: true,
        });
      } else {
        if (instanceRef.current) {
          instanceRef.current.reset();
          instanceRef.current = null;
        }
      }
    },
    [globalOptions],
  );
  const fire = useCallback(
    (opts = {}) => instanceRef.current?.({ ...options, ...opts }),
    [options],
  );
  const api = useMemo(() => ({ fire }), [fire]);
  useImperativeHandle(ref, () => api, [api]);
  useEffect(() => {
    if (!manualstart) fire();
  }, [manualstart, fire]);
  return <canvas ref={canvasRef} {...rest} />;
});
Confetti.displayName = "Confetti";

/* --------------------------- TextLoop --------------------------- */
type TextLoopProps = {
  children: React.ReactNode[];
  className?: string;
  interval?: number;
  transition?: Transition;
  variants?: Variants;
  stopOnEnd?: boolean;
};
export function TextLoop({
  children,
  className,
  interval = 2,
  transition = { duration: 0.3 },
  variants,
  stopOnEnd = false,
}: TextLoopProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const items = Children.toArray(children);
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((current) => {
        if (stopOnEnd && current === items.length - 1) {
          clearInterval(timer);
          return current;
        }
        return (current + 1) % items.length;
      });
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [items.length, interval, stopOnEnd]);
  const motionVariants: Variants = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
  };
  return (
    <div className={cn("relative inline-block whitespace-nowrap", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={currentIndex}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
          variants={variants || motionVariants}
        >
          {items[currentIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* --------------------------- BlurFade --------------------------- */
interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  yOffset?: number;
  inView?: boolean;
  inViewMargin?: string;
  blur?: string;
}
function BlurFade({
  children,
  className,
  duration = 0.4,
  delay = 0,
  yOffset = 6,
  inView = true,
  inViewMargin = "-50px",
  blur = "6px",
}: BlurFadeProps) {
  const ref = useRef(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin as any });
  const isInView = !inView || inViewResult;
  const variants: Variants = {
    hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: -yOffset, opacity: 1, filter: `blur(0px)` },
  };
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      exit="hidden"
      variants={variants}
      transition={{ delay: 0.04 + delay, duration, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}


const DefaultLogo = () => (
  <div className="bg-primary text-primary-foreground rounded-md p-1.5">
    <Activity className="h-4 w-4" />
  </div>
);

/* ----------------------------- Auth ----------------------------- */
type AuthMode = "signin" | "signup";
type ModalStatus = "closed" | "loading" | "error" | "success";
type Step = "email" | "password" | "confirmPassword";

interface AuthComponentProps {
  mode: AuthMode;
  onAuthenticate: (email: string, password: string) => Promise<{ error?: string }>;
  logo?: React.ReactNode;
  brandName?: string;
}

const COPY: Record<AuthMode, Record<Step, { title: string; sub: string }>> = {
  signin: {
    email: { title: "Welcome back", sub: "Sign in to your operator console." },
    password: { title: "Enter your password", sub: "Good to see you again." },
    confirmPassword: { title: "", sub: "" },
  },
  signup: {
    email: { title: "Create your account", sub: "Enter your email to get started." },
    password: { title: "Create a password", sub: "At least 6 characters." },
    confirmPassword: { title: "One last step", sub: "Confirm your password to continue." },
  },
};

export const AuthComponent = ({
  mode,
  onAuthenticate,
  logo = <DefaultLogo />,
  brandName = "Ad Performance Monitor",
}: AuthComponentProps) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authStep, setAuthStep] = useState<Step>("email");
  const [modalStatus, setModalStatus] = useState<ModalStatus>("closed");
  const [modalErrorMessage, setModalErrorMessage] = useState("");
  const confettiRef = useRef<ConfettiRef>(null);

  const isSignup = mode === "signup";
  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const isPasswordValid = password.length >= 6;
  const isConfirmPasswordValid = confirmPassword.length >= 6;

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  const fireSideCanons = () => {
    const fire = confettiRef.current?.fire;
    if (fire) {
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
      fire({ ...defaults, particleCount: 50, origin: { x: 0, y: 1 }, angle: 60 });
      fire({ ...defaults, particleCount: 50, origin: { x: 1, y: 1 }, angle: 120 });
    }
  };

  // Real authentication: called on the final step. Shows a brief success beat
  // (confetti) before navigating, or an error modal on failure.
  const submit = async () => {
    if (modalStatus !== "closed") return;
    if (isSignup && password !== confirmPassword) {
      setModalErrorMessage("Passwords do not match.");
      setModalStatus("error");
      return;
    }
    setModalStatus("loading");
    const res = await onAuthenticate(email, password);
    if (res?.error) {
      setModalErrorMessage(res.error);
      setModalStatus("error");
      return;
    }
    setModalStatus("success");
    fireSideCanons();
    setTimeout(() => {
      router.refresh();
      router.push("/");
    }, 1300);
  };

  // Advance to the next step, or submit if this is the last step.
  const goNext = () => {
    if (authStep === "email") {
      if (isEmailValid) setAuthStep("password");
    } else if (authStep === "password") {
      if (!isPasswordValid) return;
      if (isSignup) setAuthStep("confirmPassword");
      else submit();
    } else if (authStep === "confirmPassword") {
      if (isConfirmPasswordValid) submit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      goNext();
    }
  };

  const handleGoBack = () => {
    if (authStep === "confirmPassword") {
      setAuthStep("password");
      setConfirmPassword("");
    } else if (authStep === "password") setAuthStep("email");
  };

  const closeModal = () => {
    setModalStatus("closed");
    setModalErrorMessage("");
  };

  useEffect(() => {
    if (authStep === "password")
      setTimeout(() => passwordInputRef.current?.focus(), 500);
    else if (authStep === "confirmPassword")
      setTimeout(() => confirmPasswordInputRef.current?.focus(), 500);
  }, [authStep]);

  const loadingMessage = isSignup ? "Creating your account…" : "Signing you in…";
  const successMessage = isSignup ? "Welcome aboard!" : "Welcome back!";
  const copy = COPY[mode][authStep];

  return (
    <div className="bg-background min-h-screen w-screen flex flex-col">

      <Confetti
        ref={confettiRef}
        manualstart
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-[999]"
      />

      {/* Status modal */}
      <AnimatePresence>
        {modalStatus !== "closed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-card/90 border border-border rounded-2xl p-8 w-full max-w-sm flex flex-col items-center gap-4 mx-2 shadow-xl"
            >
              {(modalStatus === "error" || modalStatus === "success") && (
                <button
                  onClick={closeModal}
                  className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              {modalStatus === "loading" && (
                <>
                  <Loader className="w-12 h-12 text-primary animate-spin" />
                  <p className="text-lg font-medium text-foreground">{loadingMessage}</p>
                </>
              )}
              {modalStatus === "error" && (
                <>
                  <AlertCircle className="w-12 h-12 text-destructive" />
                  <p className="text-center text-lg font-medium text-foreground">
                    {modalErrorMessage}
                  </p>
                  <GlassButton onClick={closeModal} size="sm" className="mt-2">
                    Try again
                  </GlassButton>
                </>
              )}
              {modalStatus === "success" && (
                <>
                  <PartyPopper className="w-12 h-12 text-green-500" />
                  <p className="text-lg font-medium text-foreground">{successMessage}</p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-4 left-4 z-20 flex items-center gap-2 md:left-1/2 md:-translate-x-1/2">
        {logo}
        <h1 className="text-base font-bold text-foreground">{brandName}</h1>
      </div>

      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="flex w-full flex-1 h-full items-center justify-center bg-card relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <GradientBackground />
        </div>
        <fieldset
          disabled={modalStatus !== "closed"}
          className="relative z-10 flex flex-col items-center gap-8 w-[300px] mx-auto p-4"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={authStep}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full flex flex-col items-center text-center gap-3"
            >
              <p className="font-serif font-light text-4xl sm:text-5xl tracking-tight text-foreground">
                {copy.title}
              </p>
              <p className="text-sm font-medium text-muted-foreground">{copy.sub}</p>
            </motion.div>
          </AnimatePresence>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              goNext();
            }}
            className="w-[300px] space-y-6"
          >
            {/* Email + password (hidden on the confirm step) */}
            <AnimatePresence>
              {authStep !== "confirmPassword" && (
                <motion.div
                  key="email-password-fields"
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="w-full space-y-6"
                >
                  <BlurFade delay={authStep === "email" ? 0.1 : 0} className="w-full">
                    <div className="relative w-full">
                      <AnimatePresence>
                        {authStep === "password" && (
                          <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.4 }}
                            className="absolute -top-6 left-4 z-10"
                          >
                            <label className="text-xs text-muted-foreground font-semibold">
                              Email
                            </label>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="glass-input-wrap w-full">
                        <div className="glass-input">
                          <span className="glass-input-text-area"></span>
                          <div
                            className={cn(
                              "relative z-10 flex-shrink-0 flex items-center justify-center overflow-hidden transition-all duration-300 ease-in-out",
                              email.length > 20 && authStep === "email"
                                ? "w-0 px-0"
                                : "w-10 pl-2",
                            )}
                          >
                            <Mail className="h-5 w-5 text-foreground/80 flex-shrink-0" />
                          </div>
                          <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className={cn(
                              "relative z-10 h-full w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none transition-[padding-right] duration-300 ease-in-out delay-300",
                              isEmailValid && authStep === "email" ? "pr-2" : "pr-0",
                            )}
                          />
                          <div
                            className={cn(
                              "relative z-10 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out",
                              isEmailValid && authStep === "email" ? "w-10 pr-1" : "w-0",
                            )}
                          >
                            <GlassButton
                              type="button"
                              onClick={goNext}
                              size="icon"
                              aria-label="Continue with email"
                              contentClassName="text-foreground/80 hover:text-foreground"
                            >
                              <ArrowRight className="w-5 h-5" />
                            </GlassButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  </BlurFade>

                  <AnimatePresence>
                    {authStep === "password" && (
                      <BlurFade key="password-field" className="w-full">
                        <div className="relative w-full">
                          <AnimatePresence>
                            {password.length > 0 && (
                              <motion.div
                                initial={{ y: -10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="absolute -top-6 left-4 z-10"
                              >
                                <label className="text-xs text-muted-foreground font-semibold">
                                  Password
                                </label>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <div className="glass-input-wrap w-full">
                            <div className="glass-input">
                              <span className="glass-input-text-area"></span>
                              <div className="relative z-10 flex-shrink-0 flex items-center justify-center w-10 pl-2">
                                {isPasswordValid ? (
                                  <button
                                    type="button"
                                    aria-label="Toggle password visibility"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-foreground/80 hover:text-foreground transition-colors p-2 rounded-full"
                                  >
                                    {showPassword ? (
                                      <EyeOff className="w-5 h-5" />
                                    ) : (
                                      <Eye className="w-5 h-5" />
                                    )}
                                  </button>
                                ) : (
                                  <Lock className="h-5 w-5 text-foreground/80 flex-shrink-0" />
                                )}
                              </div>
                              <input
                                ref={passwordInputRef}
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="relative z-10 h-full w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none"
                              />
                              <div
                                className={cn(
                                  "relative z-10 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out",
                                  isPasswordValid ? "w-10 pr-1" : "w-0",
                                )}
                              >
                                <GlassButton
                                  type="button"
                                  onClick={goNext}
                                  size="icon"
                                  aria-label={isSignup ? "Continue" : "Sign in"}
                                  contentClassName="text-foreground/80 hover:text-foreground"
                                >
                                  <ArrowRight className="w-5 h-5" />
                                </GlassButton>
                              </div>
                            </div>
                          </div>
                        </div>
                        <BlurFade inView delay={0.2}>
                          <button
                            type="button"
                            onClick={handleGoBack}
                            className="mt-4 flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
                          >
                            <ArrowLeft className="w-4 h-4" /> Go back
                          </button>
                        </BlurFade>
                      </BlurFade>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confirm password (signup only) */}
            <AnimatePresence>
              {authStep === "confirmPassword" && (
                <BlurFade key="confirm-password-field" className="w-full">
                  <div className="relative w-full">
                    <AnimatePresence>
                      {confirmPassword.length > 0 && (
                        <motion.div
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="absolute -top-6 left-4 z-10"
                        >
                          <label className="text-xs text-muted-foreground font-semibold">
                            Confirm Password
                          </label>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="glass-input-wrap w-[300px]">
                      <div className="glass-input">
                        <span className="glass-input-text-area"></span>
                        <div className="relative z-10 flex-shrink-0 flex items-center justify-center w-10 pl-2">
                          {isConfirmPasswordValid ? (
                            <button
                              type="button"
                              aria-label="Toggle confirm password visibility"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="text-foreground/80 hover:text-foreground transition-colors p-2 rounded-full"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          ) : (
                            <Lock className="h-5 w-5 text-foreground/80 flex-shrink-0" />
                          )}
                        </div>
                        <input
                          ref={confirmPasswordInputRef}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm Password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="relative z-10 h-full w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none"
                        />
                        <div
                          className={cn(
                            "relative z-10 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out",
                            isConfirmPasswordValid ? "w-10 pr-1" : "w-0",
                          )}
                        >
                          <GlassButton
                            type="button"
                            onClick={goNext}
                            size="icon"
                            aria-label="Create account"
                            contentClassName="text-foreground/80 hover:text-foreground"
                          >
                            <ArrowRight className="w-5 h-5" />
                          </GlassButton>
                        </div>
                      </div>
                    </div>
                  </div>
                  <BlurFade inView delay={0.2}>
                    <button
                      type="button"
                      onClick={handleGoBack}
                      className="mt-4 flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Go back
                    </button>
                  </BlurFade>
                </BlurFade>
              )}
            </AnimatePresence>
          </form>

          {/* Mode switch (only on the first step) */}
          {authStep === "email" && (
            <BlurFade delay={0.25} className="w-full">
              <p className="text-center text-sm text-muted-foreground">
                {isSignup ? "Already have an account? " : "New here? "}
                <Link
                  href={isSignup ? "/login" : "/signup"}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {isSignup ? "Sign in" : "Create an account"}
                </Link>
              </p>
            </BlurFade>
          )}
        </fieldset>
      </div>
    </div>
  );
};
