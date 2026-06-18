import { AuthComponent } from "@/components/ui/sign-up";
import { signUpCredentials } from "@/lib/auth/actions";

export default function SignupPage() {
  return <AuthComponent mode="signup" onAuthenticate={signUpCredentials} />;
}
