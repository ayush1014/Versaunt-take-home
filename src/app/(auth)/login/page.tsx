import { AuthComponent } from "@/components/ui/sign-up";
import { signInCredentials } from "@/lib/auth/actions";

export default function LoginPage() {
  return <AuthComponent mode="signin" onAuthenticate={signInCredentials} />;
}
