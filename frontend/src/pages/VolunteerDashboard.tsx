import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  CheckCircle2,
  MapPin,
  Navigation,
  PackageCheck,
  Truck,
} from "lucide-react";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Pagination,
  StatusBadge,
} from "../components/ui";
import { services } from "../services";
import { useToast } from "../hooks/useToast";
import { formatDateTime } from "../lib/format";
import type { Pickup, PickupStatus } from "../types/domain";

export default function VolunteerDashboard() {
  const [page, setPage] = useState(1);
  const [acceptTarget, setAcceptTarget] = useState<Pickup | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const available = useQuery({
    queryKey: ["pickups", "available", page],
    queryFn: () => services.pickups.available(page),
  });
  const active = useQuery({
    queryKey: ["pickups", "active"],
    queryFn: services.pickups.active,
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pickups"] });
  };
  const accept = useMutation({
    mutationFn: services.pickups.accept,
    onSuccess: () => {
      setAcceptTarget(null);
      refresh();
      toast.notify({
        tone: "success",
        title: "Delivery accepted",
        message: "Follow the route details to complete the handoff.",
      });
    },
    onError: (error: { message?: string }) =>
      toast.notify({
        tone: "error",
        title: "Job unavailable",
        message: error.message,
      }),
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PickupStatus }) =>
      services.pickups.updateStatus(id, status),
    onSuccess: (pickup) => {
      refresh();
      toast.notify({
        tone: "success",
        title:
          pickup.status === "Delivered"
            ? "Delivery completed"
            : "Delivery status updated",
      });
    },
    onError: (error: { message?: string }) =>
      toast.notify({
        tone: "error",
        title: "Status update failed",
        message: error.message,
      }),
  });
  const activePickup = active.data;
  const nextAction =
    activePickup?.status === "Assigned"
      ? {
          status: "PickedUp" as const,
          label: "Confirm pickup",
          icon: PackageCheck,
        }
      : activePickup?.status === "PickedUp"
        ? {
            status: "InTransit" as const,
            label: "Start delivery",
            icon: Navigation,
          }
        : activePickup?.status === "InTransit"
          ? {
              status: "Delivered" as const,
              label: "Confirm delivery",
              icon: CheckCircle2,
            }
          : null;

  return (
    <div className="space-y-9">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-info">
          Volunteer workspace
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Move each donation with confidence.
        </h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          Accept one job at a time, follow the verified addresses, and record
          every handoff.
        </p>
      </div>
      <section>
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-info text-white shadow-sm">
            <Truck size={20} />
          </span>
          <div>
            <h3 className="text-xl font-black">Active delivery</h3>
            <p className="text-sm text-stone-600">
              Your current assignment and next required action.
            </p>
          </div>
        </div>
        {active.isPending ? (
          <LoadingSkeleton rows={2} />
        ) : active.isError ? (
          <ErrorState
            message="Your active delivery could not be loaded."
            retry={() => active.refetch()}
          />
        ) : activePickup ? (
          <article className="rounded-2xl border-2 border-info/30 bg-gradient-to-br from-white to-info-soft/40 p-5 shadow-panel sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                  {activePickup.donation.donorName}
                </p>
                <h4 className="mt-1 text-2xl font-black">
                  {activePickup.donation.foodType}
                </h4>
                <p className="mt-1 text-sm text-stone-600">
                  {activePickup.donation.quantity} portions · Pickup{" "}
                  {formatDateTime(activePickup.donation.pickupWindowStart)}
                </p>
              </div>
              <StatusBadge status={activePickup.status} />
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <div className="rounded-xl border border-info/20 bg-white p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                  <MapPin size={15} />
                  Collect from
                </p>
                <p className="mt-2 font-semibold">
                  {activePickup.donorAddress}
                </p>
              </div>
              <ArrowDown className="self-center justify-self-center sm:-rotate-90" />
              <div className="rounded-xl border border-info/20 bg-white p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                  <MapPin size={15} />
                  Deliver to
                </p>
                <p className="mt-2 font-semibold">
                  {activePickup.recipientAddress}
                </p>
              </div>
            </div>
            {nextAction && (
              <Button
                className="mt-6 w-full sm:w-auto"
                size="lg"
                variant="info"
                loading={update.isPending}
                onClick={() =>
                  update.mutate({
                    id: activePickup.id,
                    status: nextAction.status,
                  })
                }
              >
                <nextAction.icon size={19} />
                {nextAction.label}
              </Button>
            )}
          </article>
        ) : (
          <EmptyState
            title="No active delivery"
            description="Accept an available job below when you are ready to help."
          />
        )}
      </section>
      <section className="border-t border-stone-300 pt-8">
        <h3 className="text-xl font-black">Available jobs</h3>
        <p className="mt-1 text-sm text-stone-600">
          Unassigned food deliveries ready for a volunteer.
        </p>
        {available.isPending ? (
          <div className="mt-5">
            <LoadingSkeleton rows={3} />
          </div>
        ) : available.isError ? (
          <div className="mt-5">
            <ErrorState
              message="Available jobs could not be loaded."
              retry={() => available.refetch()}
            />
          </div>
        ) : available.data.items.length ? (
          <>
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {available.data.items.map((pickup) => (
                <article
                  key={pickup.id}
                  className="rounded-xl border border-info/15 bg-white p-5 shadow-panel transition hover:border-info"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        {pickup.donation.donorName}
                      </p>
                      <h4 className="mt-1 text-lg font-black">
                        {pickup.donation.foodType}
                      </h4>
                    </div>
                    <StatusBadge status={pickup.status} />
                  </div>
                  <div className="mt-5 space-y-3 text-sm">
                    <p>
                      <span className="block text-xs text-stone-500">
                        Collect
                      </span>
                      <strong>{pickup.donorAddress}</strong>
                    </p>
                    <p>
                      <span className="block text-xs text-stone-500">
                        Deliver
                      </span>
                      <strong>{pickup.recipientAddress}</strong>
                    </p>
                  </div>
                  <Button
                    className="mt-5 w-full"
                    variant="info"
                    disabled={Boolean(activePickup)}
                    onClick={() => setAcceptTarget(pickup)}
                  >
                    {activePickup
                      ? "Complete active job first"
                      : "Accept delivery"}
                  </Button>
                </article>
              ))}
            </div>
            <Pagination
              page={available.data.page}
              pageSize={available.data.pageSize}
              total={available.data.total}
              onPageChange={setPage}
            />
          </>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No jobs available"
              description="New delivery requests will appear here automatically."
            />
          </div>
        )}
      </section>
      <ConfirmDialog
        open={Boolean(acceptTarget)}
        title="Accept this delivery?"
        description="You will become responsible for collecting and delivering this donation. Confirm that you can complete it within the pickup window."
        confirmLabel="Accept job"
        loading={accept.isPending}
        onClose={() => setAcceptTarget(null)}
        onConfirm={() => acceptTarget && accept.mutate(acceptTarget.id)}
      />
    </div>
  );
}
