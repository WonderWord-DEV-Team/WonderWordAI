"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

type SubscribeFormProps = {
  planName: string;
};

export default function SubscribeForm({ planName }: SubscribeFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/billing?subscribed=1`,
      },
    });

    // confirmPayment only returns if there's an immediate error (e.g. card
    // declined) — on success the browser is redirected to return_url.
    if (error) {
      setErrorMessage(error.message ?? "Something went wrong. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="mb-4 text-sm font-semibold text-[#2b2b2b]">
        Payment Info
      </h2>

      <PaymentElement />

      {errorMessage && (
        <p className="mt-3 text-sm text-[#a3352b]">{errorMessage}</p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="rounded-full bg-[#a3352b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#8c2c23] disabled:opacity-60"
        >
          {submitting ? "Processing…" : `Subscribe to ${planName}`}
        </button>
        <button
          type="button"
          onClick={() => router.push("/billing")}
          className="rounded-full border border-[#e0c9c6] px-6 py-3 text-sm font-semibold text-[#a3352b] transition hover:bg-[#fbeceb]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
