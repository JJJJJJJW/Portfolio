import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Sign Up | Investment Dashboard"
        description="Create your account to start managing your portfolio and tracking goals."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
