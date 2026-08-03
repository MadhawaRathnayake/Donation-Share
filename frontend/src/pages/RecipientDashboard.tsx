import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import {
  Button,
  ConfirmDialog,
  DonationCard,
  EmptyState,
  ErrorState,
  Input,
  LoadingSkeleton,
  Pagination,
  Select,
  StatusBadge,
} from "../components/ui";
import { services } from "../services";
import { useToast } from "../hooks/useToast";
import { formatDateTime } from "../lib/format";
import type { Donation } from "../types/domain";

export default function RecipientDashboard() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [distance, setDistance] = useState("10");
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [claimTarget, setClaimTarget] = useState<Donation | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const available = useQuery({
    queryKey: ["donations", "available", page, type, distance, expiringSoon],
    queryFn: () =>
      services.donations.list({
        page,
        pageSize: 6,
        type: type || undefined,
        maxDistance: Number(distance),
        expiringSoon,
      }),
  });
  const claims = useQuery({
    queryKey: ["claims", "mine"],
    queryFn: () => services.claims.mine(1),
  });
  const claim = useMutation({
    mutationFn: services.claims.create,
    onSuccess: () => {
      setClaimTarget(null);
      queryClient.invalidateQueries({ queryKey: ["donations", "available"] });
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      toast.notify({
        tone: "success",
        title: "Donation claimed",
        message: "The donor and logistics team have been notified.",
      });
    },
    onError: (error: { message?: string }) => {
      setClaimTarget(null);
      toast.notify({
        tone: "error",
        title: "Claim unsuccessful",
        message: error.message || "This donation may no longer be available.",
      });
    },
  });
  const resetFilters = () => {
    setType("");
    setDistance("10");
    setExpiringSoon(false);
    setPage(1);
  };

  return (
    <div className="space-y-9">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand">
          Recipient workspace
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Find food for your community.
        </h2>
        <p className="mt-3 max-w-2xl text-stone-600">
          Browse live donations, check safe-use times, and claim only what your
          organization can collect.
        </p>
      </div>
      <div className="grid items-start gap-7 lg:grid-cols-[250px_1fr]">
        <aside className="rounded-xl border border-brand/20 bg-white p-5 shadow-panel lg:sticky lg:top-24">
          <div className="flex items-center gap-2 text-brand-dark">
            <SlidersHorizontal className="text-brand" size={18} />
            <h3 className="font-black">Filters</h3>
          </div>
          <div className="mt-5 space-y-5">
            <label className="block text-sm font-semibold">
              Food type
              <Select
                className="mt-2"
                value={type}
                onChange={(event) => {
                  setType(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All food</option>
                <option>Fresh produce</option>
                <option>Prepared meals</option>
                <option>Bakery items</option>
                <option>Dry goods</option>
                <option>Dairy</option>
              </Select>
            </label>
            <label className="block text-sm font-semibold">
              Maximum distance
              <Select
                className="mt-2"
                value={distance}
                onChange={(event) => {
                  setDistance(event.target.value);
                  setPage(1);
                }}
              >
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
              </Select>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold">
              <Input
                className="mt-0.5 size-4 min-h-0 w-4 accent-brand"
                type="checkbox"
                checked={expiringSoon}
                onChange={(event) => {
                  setExpiringSoon(event.target.checked);
                  setPage(1);
                }}
              />
              <span>Expiring within 12 hours</span>
            </label>
            <Button
              className="w-full"
              variant="secondary"
              onClick={resetFilters}
            >
              Reset filters
            </Button>
          </div>
        </aside>
        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black">Available food</h3>
              <p className="mt-1 text-sm text-stone-600">
                {available.data?.total ?? 0} matching donations
              </p>
            </div>
            <Search className="text-brand" size={22} />
          </div>
          {available.isPending ? (
            <LoadingSkeleton rows={5} />
          ) : available.isError ? (
            <ErrorState
              message="Available donations could not be loaded."
              retry={() => available.refetch()}
            />
          ) : available.data.items.length ? (
            <>
              <div className="grid gap-5 xl:grid-cols-2">
                {available.data.items.map((donation) => (
                  <DonationCard
                    key={donation.id}
                    donation={donation}
                    action={
                      <Button
                        className="w-full"
                        onClick={() => setClaimTarget(donation)}
                      >
                        Claim this donation
                      </Button>
                    }
                  />
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
            <EmptyState
              title="No matching food"
              description="Try widening the distance or removing a filter."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          )}
        </section>
      </div>
      <section className="border-t border-stone-300 pt-8">
        <h3 className="text-xl font-black">My claims</h3>
        <p className="mt-1 text-sm text-stone-600">
          Food your organization has secured.
        </p>
        {claims.isPending ? (
          <div className="mt-5">
            <LoadingSkeleton rows={2} />
          </div>
        ) : claims.data?.items.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {claims.data.items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-brand/15 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Claimed {formatDateTime(item.claimTime)}
                    </p>
                    <h4 className="mt-1 font-black">
                      {item.donation.foodType}
                    </h4>
                  </div>
                  <StatusBadge status={item.approvalStatus} />
                </div>
                <p className="mt-4 text-sm text-stone-600">
                  {item.donation.quantity} portions ·{" "}
                  {item.donation.pickupLocation}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No claims yet"
              description="Claimed donations will be recorded here."
            />
          </div>
        )}
      </section>
      <ConfirmDialog
        open={Boolean(claimTarget)}
        title="Claim this donation?"
        description={
          claimTarget
            ? `Confirm that your organization can collect ${claimTarget.quantity} portions from ${claimTarget.pickupLocation} within the listed window.`
            : ""
        }
        confirmLabel="Confirm claim"
        loading={claim.isPending}
        onClose={() => setClaimTarget(null)}
        onConfirm={() => claimTarget && claim.mutate(claimTarget.id)}
      />
    </div>
  );
}
