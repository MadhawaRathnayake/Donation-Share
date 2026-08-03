import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil } from "lucide-react";
import { ProfileForm } from "../components/profile/ProfileForm";
import {
  Button,
  ErrorState,
  LoadingSkeleton,
  StatusBadge,
} from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { services } from "../services";
import type { ProfileInput } from "../types/domain";

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();
  const auth = useAuth();
  const toast = useToast();
  const query = useQuery({
    queryKey: ["profile", "me"],
    queryFn: services.profiles.getMe,
  });
  const mutation = useMutation({
    mutationFn: (input: ProfileInput) => services.profiles.update(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(["profile", "me"], profile);
      setEditing(false);
      toast.notify({ tone: "success", title: "Profile updated" });
    },
    onError: (error: { message?: string }) =>
      toast.notify({
        tone: "error",
        title: "Update failed",
        message: error.message,
      }),
  });
  if (query.isPending) return <LoadingSkeleton rows={4} />;
  if (query.isError || !query.data)
    return (
      <ErrorState
        message="Your profile could not be loaded."
        retry={() => query.refetch()}
      />
    );
  const profile = query.data;
  const rows = Object.entries(profile).filter(
    ([key]) => !["id", "role", "verificationStatus"].includes(key),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand">
            Account details
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">
            Your profile
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => auth.accountManagement()}>
            <KeyRound size={17} />
            Password & security
          </Button>
          {!editing && (
            <Button onClick={() => setEditing(true)}>
              <Pencil size={17} />
              Edit profile
            </Button>
          )}
        </div>
      </div>
      <section className="rounded-2xl border border-brand/20 bg-white p-5 shadow-panel sm:p-8">
        {editing ? (
          <ProfileForm
            profile={profile}
            submitLabel="Save changes"
            submitting={mutation.isPending}
            onSubmit={(input) => mutation.mutate(input)}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
              <div>
                <p className="text-sm text-stone-500">Role</p>
                <p className="text-xl font-bold">{profile.role}</p>
              </div>
              <StatusBadge status={profile.verificationStatus} />
            </div>
            <dl className="grid gap-x-10 sm:grid-cols-2">
              {rows.map(([key, value]) => (
                <div key={key} className="border-b border-stone-200 py-5">
                  <dt className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    {key.replace(/([A-Z])/g, " $1")}
                  </dt>
                  <dd className="mt-1 whitespace-pre-line font-medium">
                    {String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>
    </div>
  );
}
