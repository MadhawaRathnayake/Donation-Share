import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ProfileForm } from "../components/profile/ProfileForm";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { roleHome } from "../lib/format";
import { services } from "../services";
import type { ProfileInput } from "../types/domain";

export default function Onboarding() {
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (auth.roles.includes("Admin")) navigate("/admin", { replace: true });
  }, [auth.roles, navigate]);
  const mutation = useMutation({
    mutationFn: (input: ProfileInput) => services.profiles.create(input),
    onSuccess: async (profile) => {
      queryClient.setQueryData(["profile", "me"], profile);
      await auth.refreshRoles(profile.role);
      toast.notify({
        tone: "success",
        title: "Profile completed",
        message: "Your FoodShare workspace is ready.",
      });
      navigate(roleHome([profile.role]), { replace: true });
    },
    onError: (error: { message?: string }) =>
      toast.notify({
        tone: "error",
        title: "Profile could not be saved",
        message: error.message || "Please review the form and try again.",
      }),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand">
          One-time setup
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Complete your FoodShare profile
        </h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          Tell the network how you participate. Your selected role is securely
          confirmed by the platform before access is granted.
        </p>
      </div>
      <section className="rounded-2xl border border-brand/20 bg-white p-5 shadow-panel sm:p-8">
        <ProfileForm
          submitLabel="Complete profile"
          submitting={mutation.isPending}
          onSubmit={(input) => mutation.mutate(input)}
        />
      </section>
    </div>
  );
}
