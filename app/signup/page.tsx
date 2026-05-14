import { SignupForm } from "@/components/auth/SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const params = await searchParams;
  const setupCompany = params.setup === "company";
  return <SignupForm setupCompany={setupCompany} />;
}
