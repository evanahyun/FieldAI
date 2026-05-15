import { redirect } from "next/navigation";

export default function LegacyWebhookTestPage() {
  redirect("/dev/test-call");
}
